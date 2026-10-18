create table if not exists public.seller_subscription_plans (
  id text primary key check (id in ('monthly', 'yearly')),
  name text not null,
  amount_minor_units integer not null check (amount_minor_units > 0),
  currency text not null check (currency = 'USD'),
  interval_days integer not null check (interval_days in (30, 365)),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.seller_subscription_plans (
  id, name, amount_minor_units, currency, interval_days
)
values
  ('monthly', 'Monthly', 500, 'USD', 30),
  ('yearly', 'Yearly', 5000, 'USD', 365)
on conflict (id) do update
set name = excluded.name,
    amount_minor_units = excluded.amount_minor_units,
    currency = excluded.currency,
    interval_days = excluded.interval_days,
    updated_at = now();

create table if not exists public.seller_subscriptions (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null unique references public.profiles (id) on delete cascade,
  status text not null default 'trialing'
    check (status in ('trialing', 'active', 'expired', 'suspended', 'canceled')),
  plan_id text references public.seller_subscription_plans (id),
  trial_started_at timestamptz not null,
  trial_ends_at timestamptz not null,
  current_period_started_at timestamptz,
  current_period_ends_at timestamptz,
  payment_provider text,
  provider_customer_reference text,
  provider_subscription_reference text unique,
  last_verified_payment_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seller_subscription_valid_trial
    check (trial_ends_at > trial_started_at),
  constraint seller_subscription_valid_period
    check (
      (current_period_started_at is null and current_period_ends_at is null)
      or (
        current_period_started_at is not null
        and current_period_ends_at > current_period_started_at
      )
    ),
  constraint seller_subscription_paid_fields
    check (
      status <> 'active'
      or (
        plan_id is not null
        and current_period_started_at is not null
        and current_period_ends_at is not null
        and payment_provider is not null
        and last_verified_payment_at is not null
      )
    )
);

create index if not exists seller_subscriptions_status_trial_end_idx
  on public.seller_subscriptions (status, trial_ends_at);

create table if not exists public.seller_trial_identity_claims (
  identity_fingerprint text primary key
    check (identity_fingerprint ~ '^[0-9a-f]{64}$'),
  seller_id uuid unique references public.seller_subscriptions (seller_id)
    on delete set null,
  created_at timestamptz not null default now()
);

alter table public.seller_trial_identity_claims enable row level security;
revoke all on public.seller_trial_identity_claims from public, anon, authenticated;

alter table public.seller_subscription_plans enable row level security;
alter table public.seller_subscriptions enable row level security;

revoke all on public.seller_subscription_plans, public.seller_subscriptions
  from anon, authenticated;
grant select on public.seller_subscription_plans,
  public.seller_subscriptions to authenticated;

drop policy if exists "Authenticated users can read subscription plans"
  on public.seller_subscription_plans;
create policy "Authenticated users can read subscription plans"
  on public.seller_subscription_plans for select to authenticated
  using (enabled);

drop policy if exists "Sellers and administrators can read subscriptions"
  on public.seller_subscriptions;
create policy "Sellers and administrators can read subscriptions"
  on public.seller_subscriptions for select to authenticated
  using (
    seller_id = (select auth.uid())
    or (select public.is_administrator())
  );

create table if not exists public.seller_trial_reminders (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null
    references public.seller_subscriptions (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  days_before_expiry smallint not null
    check (days_before_expiry in (7, 3, 1)),
  created_at timestamptz not null default now(),
  unique (subscription_id, days_before_expiry)
);

create index if not exists seller_trial_reminders_seller_created_idx
  on public.seller_trial_reminders (seller_id, created_at desc);

alter table public.seller_trial_reminders enable row level security;
revoke all on public.seller_trial_reminders from anon, authenticated;
grant select on public.seller_trial_reminders to authenticated;

drop policy if exists "Sellers can read their trial reminders"
  on public.seller_trial_reminders;
create policy "Sellers can read their trial reminders"
  on public.seller_trial_reminders for select to authenticated
  using (seller_id = (select auth.uid()));

alter table public.seller_verification_applications
  add column if not exists possible_duplicate_trial boolean not null default false,
  add column if not exists duplicate_trial_reviewed_at timestamptz,
  add column if not exists duplicate_trial_reviewed_by uuid
    references public.profiles (id) on delete set null;

create or replace function public.flag_possible_duplicate_seller_trial()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.duplicate_trial_reviewed_at is not null then
    new.possible_duplicate_trial := false;
    return new;
  end if;

  new.possible_duplicate_trial := exists (
    select 1
    from public.seller_verification_applications existing
    where existing.user_id <> new.user_id
      and existing.status = 'approved'
      and (
        (
          length(regexp_replace(
            coalesce(existing.personal_data ->> 'phone', ''),
            '[^0-9]', '', 'g'
          )) >= 7
          and regexp_replace(
            existing.personal_data ->> 'phone',
            '[^0-9]', '', 'g'
          ) = regexp_replace(
            coalesce(new.personal_data ->> 'phone', ''),
            '[^0-9]', '', 'g'
          )
        )
        or (
          length(regexp_replace(
            lower(coalesce(existing.business_data ->> 'registrationNumber', '')),
            '[^a-z0-9]', '', 'g'
          )) >= 4
          and regexp_replace(
            lower(existing.business_data ->> 'registrationNumber'),
            '[^a-z0-9]', '', 'g'
          ) = regexp_replace(
            lower(coalesce(new.business_data ->> 'registrationNumber', '')),
            '[^a-z0-9]', '', 'g'
          )
        )
      )
  );
  return new;
end;
$$;

revoke all on function public.flag_possible_duplicate_seller_trial()
  from public, anon, authenticated;

drop trigger if exists flag_possible_duplicate_seller_trial
  on public.seller_verification_applications;
create trigger flag_possible_duplicate_seller_trial
  before insert or update of
    user_id, status, personal_data, business_data, duplicate_trial_reviewed_at
  on public.seller_verification_applications
  for each row
  execute function public.flag_possible_duplicate_seller_trial();

update public.seller_verification_applications
set status = status
where status = 'approved';

update public.seller_verification_applications
set personal_data = personal_data
where status in ('pending_review', 'under_review', 'action_required');

create or replace function public.refresh_duplicate_seller_trial_flags()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'approved'
    and old.status is distinct from new.status then
    update public.seller_verification_applications candidate
    set personal_data = candidate.personal_data
    where candidate.user_id <> new.user_id
      and candidate.status in ('pending_review', 'under_review', 'action_required')
      and (
        (
          length(regexp_replace(
            coalesce(new.personal_data ->> 'phone', ''),
            '[^0-9]', '', 'g'
          )) >= 7
          and regexp_replace(
            new.personal_data ->> 'phone',
            '[^0-9]', '', 'g'
          ) = regexp_replace(
            coalesce(candidate.personal_data ->> 'phone', ''),
            '[^0-9]', '', 'g'
          )
        )
        or (
          length(regexp_replace(
            lower(coalesce(new.business_data ->> 'registrationNumber', '')),
            '[^a-z0-9]', '', 'g'
          )) >= 4
          and regexp_replace(
            lower(new.business_data ->> 'registrationNumber'),
            '[^a-z0-9]', '', 'g'
          ) = regexp_replace(
            lower(coalesce(candidate.business_data ->> 'registrationNumber', '')),
            '[^a-z0-9]', '', 'g'
          )
        )
      );
  end if;
  return new;
end;
$$;

revoke all on function public.refresh_duplicate_seller_trial_flags()
  from public, anon, authenticated;

drop trigger if exists refresh_duplicate_seller_trial_flags
  on public.seller_verification_applications;
create trigger refresh_duplicate_seller_trial_flags
  after update of status on public.seller_verification_applications
  for each row
  execute function public.refresh_duplicate_seller_trial_flags();

create or replace function public.seller_subscription_is_current(p_seller_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_seller_id = (select auth.uid())
    and exists (
      select 1
      from public.seller_subscriptions subscription
      join public.profiles profile on profile.id = subscription.seller_id
      where subscription.seller_id = p_seller_id
        and profile.role = 'seller'
        and (
          (
            subscription.status = 'trialing'
            and subscription.trial_ends_at > now()
          )
          or (
            subscription.status = 'active'
            and subscription.current_period_ends_at > now()
          )
        )
    );
$$;

revoke all on function public.seller_subscription_is_current(uuid)
  from public, anon;
grant execute on function public.seller_subscription_is_current(uuid)
  to authenticated;

create or replace function public.register_seller_trial_identity(
  p_seller_id uuid,
  p_identity_fingerprint text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_seller_id uuid;
begin
  if (select auth.uid()) is null or not (select public.is_administrator()) then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  if p_identity_fingerprint is null
    or p_identity_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'A valid verified identity fingerprint is required'
      using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.profiles profile
    join public.seller_subscriptions subscription
      on subscription.seller_id = profile.id
    where profile.id = p_seller_id and profile.role = 'seller'
  ) then
    raise exception 'An approved seller subscription is required'
      using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('seller-trial-id:' || p_identity_fingerprint, 0)
  );
  insert into public.seller_trial_identity_claims (
    identity_fingerprint, seller_id
  )
  values (p_identity_fingerprint, p_seller_id)
  on conflict do nothing;

  select seller_id into existing_seller_id
  from public.seller_trial_identity_claims
  where identity_fingerprint = p_identity_fingerprint;
  if existing_seller_id is distinct from p_seller_id then
    raise exception 'This verified identity has already received a seller trial'
      using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.register_seller_trial_identity(uuid, text)
  from public, anon;
grant execute on function public.register_seller_trial_identity(uuid, text)
  to authenticated;

create or replace function public.guard_seller_subscription_access()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_is_admin boolean := coalesce((select public.is_administrator()), false);
  listing_changed boolean := tg_op = 'INSERT';
begin
  if actor_is_admin then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    listing_changed :=
      row(
        new.name, new.description, new.category_id, new.price, new.currency,
        new.condition, new.location, new.moderation_status
      )
      is distinct from
      row(
        old.name, old.description, old.category_id, old.price, old.currency,
        old.condition, old.location, old.moderation_status
      );
  end if;

  if listing_changed and not (
    select public.seller_subscription_is_current(new.seller_id)
  ) then
    raise exception 'An active seller trial or paid subscription is required to create or change listings'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_seller_subscription_access()
  from public, anon, authenticated;

drop trigger if exists guard_seller_subscription_access on public.products;
create trigger guard_seller_subscription_access
  before insert or update on public.products
  for each row
  execute function public.guard_seller_subscription_access();

with approvals as (
  select
    application.user_id as seller_id,
    coalesce(
      (
        select status_history.created_at
        from public.seller_verification_status_history status_history
        where status_history.application_id = application.id
          and status_history.to_status = 'approved'
        order by status_history.created_at asc
        limit 1
      ),
      application.updated_at
    ) as approved_at
  from public.seller_verification_applications application
  where application.status = 'approved'
  union all
  select
    application.user_id,
    coalesce(application.reviewed_at, application.created_at)
  from public.seller_applications application
  where application.status = 'approved'
),
first_approvals as (
  select distinct on (approval.seller_id)
    approval.seller_id,
    approval.approved_at
  from approvals approval
  join public.profiles profile on profile.id = approval.seller_id
  where profile.role = 'seller'
  order by approval.seller_id, approval.approved_at asc
)
insert into public.seller_subscriptions (
  seller_id, status, trial_started_at, trial_ends_at
)
select
  seller_id,
  case when approved_at + interval '30 days' > now()
    then 'trialing' else 'expired' end,
  approved_at,
  approved_at + interval '30 days'
from first_approvals
on conflict (seller_id) do nothing;

drop function if exists public.review_seller_verification_application(
  uuid, text, text, jsonb
);
drop function if exists public.review_seller_verification_application(
  uuid, text, text, jsonb, boolean
);

create function public.review_seller_verification_application(
  p_application_id uuid,
  p_status text,
  p_reason text default null,
  p_check_outcomes jsonb default '{}'::jsonb,
  p_duplicate_trial_reviewed boolean default false,
  p_trial_identity_fingerprint text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  application_row public.seller_verification_applications%rowtype;
  previous_status text;
  seller_type_value text;
  duplicate_trial_detected boolean := false;
  identity_key text;
begin
  if (select auth.uid()) is null or not (select public.is_administrator()) then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  if p_status is null
    or p_status not in ('under_review', 'action_required', 'approved', 'rejected', 'suspended')
    or (p_status in ('action_required', 'rejected', 'suspended')
      and char_length(trim(coalesce(p_reason, ''))) not between 3 and 1000) then
    raise exception 'Provide a valid review action and reason' using errcode = '22023';
  end if;
  if p_status = 'approved' and (
    jsonb_typeof(p_check_outcomes) <> 'object'
    or exists (
      select 1 from unnest(array[
        'identity', 'business', 'store_name', 'operations', 'agreements'
      ]) as required_check(check_name)
      where coalesce(p_check_outcomes ->> required_check.check_name, 'false') <> 'true'
    )
  ) then
    raise exception 'Complete every required verification check before approval'
      using errcode = '22023';
  end if;
  if p_status = 'action_required' and not exists (
    select 1 from unnest(array[
      'identity', 'business', 'store_name', 'operations', 'agreements'
    ]) as required_check(check_name)
    where coalesce(p_check_outcomes ->> required_check.check_name, 'false') <> 'true'
  ) then
    raise exception 'Mark at least one verification check as needing correction'
      using errcode = '22023';
  end if;

  select * into application_row
  from public.seller_verification_applications
  where id = p_application_id
  for update;
  if not found then
    raise exception 'Seller application was not found' using errcode = 'P0002';
  end if;
  if p_status = 'approved' then
    if exists (
      select 1
      from public.profiles existing_seller
      join public.seller_subscriptions existing_subscription
        on existing_subscription.seller_id = existing_seller.id
      where existing_seller.role = 'seller'
        and not exists (
          select 1
          from public.seller_trial_identity_claims identity_claim
          where identity_claim.seller_id = existing_seller.id
        )
    ) then
      raise exception 'Register verified identity fingerprints for existing sellers before approving new seller trials'
        using errcode = 'P0001';
    end if;

    for identity_key in
      select distinct candidate.identity_key
      from (
        values
          (
            case
              when length(regexp_replace(
                coalesce(application_row.personal_data ->> 'phone', ''),
                '[^0-9]', '', 'g'
              )) >= 7
                then 'phone:' || regexp_replace(
                  application_row.personal_data ->> 'phone',
                  '[^0-9]', '', 'g'
                )
            end
          ),
          (
            case
              when length(regexp_replace(
                lower(coalesce(application_row.business_data ->> 'registrationNumber', '')),
                '[^a-z0-9]', '', 'g'
              )) >= 4
                then 'registration:' || regexp_replace(
                  lower(application_row.business_data ->> 'registrationNumber'),
                  '[^a-z0-9]', '', 'g'
                )
            end
          )
      ) as candidate(identity_key)
      where candidate.identity_key is not null
      order by candidate.identity_key
    loop
      perform pg_advisory_xact_lock(hashtextextended(identity_key, 0));
    end loop;

    select exists (
      select 1
      from public.seller_verification_applications existing
      where existing.user_id <> application_row.user_id
        and existing.status = 'approved'
        and (
          (
            length(regexp_replace(
              coalesce(existing.personal_data ->> 'phone', ''),
              '[^0-9]', '', 'g'
            )) >= 7
            and regexp_replace(
              existing.personal_data ->> 'phone',
              '[^0-9]', '', 'g'
            ) = regexp_replace(
              coalesce(application_row.personal_data ->> 'phone', ''),
              '[^0-9]', '', 'g'
            )
          )
          or (
            length(regexp_replace(
              lower(coalesce(existing.business_data ->> 'registrationNumber', '')),
              '[^a-z0-9]', '', 'g'
            )) >= 4
            and regexp_replace(
              lower(existing.business_data ->> 'registrationNumber'),
              '[^a-z0-9]', '', 'g'
            ) = regexp_replace(
              lower(coalesce(application_row.business_data ->> 'registrationNumber', '')),
              '[^a-z0-9]', '', 'g'
            )
          )
        )
    ) into duplicate_trial_detected;

    if p_trial_identity_fingerprint is null
      or p_trial_identity_fingerprint !~ '^[0-9a-f]{64}$' then
      raise exception 'Review the identity document and submit its fingerprint before approval'
        using errcode = '22023';
    end if;

    perform pg_advisory_xact_lock(
      hashtextextended('seller-trial-id:' || p_trial_identity_fingerprint, 0)
    );
    if exists (
      select 1
      from public.seller_trial_identity_claims identity_claim
      where identity_claim.identity_fingerprint = p_trial_identity_fingerprint
        and identity_claim.seller_id is distinct from application_row.user_id
    ) then
      raise exception 'This verified identity has already received a seller trial'
        using errcode = 'P0001';
    end if;
  end if;
  if p_status = 'approved'
    and duplicate_trial_detected
    and not p_duplicate_trial_reviewed then
    raise exception 'Review possible duplicate trial details before approving this seller'
      using errcode = '22023';
  end if;
  previous_status := application_row.status;
  if p_status = 'suspended' then
    if previous_status <> 'approved' then
      raise exception 'Only an approved seller can be suspended' using errcode = '22023';
    end if;
  elsif previous_status not in ('pending_review', 'under_review', 'action_required')
    or (p_status = 'under_review' and previous_status = 'action_required') then
    raise exception 'This application cannot be reviewed in its current status' using errcode = '22023';
  end if;

  update public.seller_verification_applications
  set status = p_status,
      possible_duplicate_trial = case
        when p_status = 'approved'
          and duplicate_trial_detected
          and p_duplicate_trial_reviewed then false
        else possible_duplicate_trial
      end,
      duplicate_trial_reviewed_at = case
        when p_status = 'approved'
          and duplicate_trial_detected
          and p_duplicate_trial_reviewed then now()
        else duplicate_trial_reviewed_at
      end,
      duplicate_trial_reviewed_by = case
        when p_status = 'approved'
          and duplicate_trial_detected
          and p_duplicate_trial_reviewed then (select auth.uid())
        else duplicate_trial_reviewed_by
      end,
      applicant_message = case
        when p_status in ('action_required', 'rejected', 'suspended')
          then nullif(trim(p_reason), '')
        else null
      end,
      updated_at = now()
  where id = p_application_id;

  if p_status in ('approved', 'action_required', 'rejected') then
    update public.seller_verification_checks
    set outcome = case
          when check_type = 'payout' then 'not_applicable'
          when coalesce(p_check_outcomes ->> check_type, 'false') = 'true' then 'passed'
          else 'failed'
        end,
        reviewer_id = (select auth.uid()),
        reason = case
          when check_type = 'payout'
            or coalesce(p_check_outcomes ->> check_type, 'false') = 'true'
            then null
          else nullif(trim(p_reason), '')
        end,
        updated_at = now()
    where application_id = p_application_id;
  end if;

  insert into public.seller_verification_status_history (
    application_id, actor_id, from_status, to_status, reason
  )
  values (application_row.id, (select auth.uid()), previous_status, p_status, nullif(trim(p_reason), ''));

  if p_status in ('under_review', 'action_required', 'rejected', 'suspended', 'approved') then
    insert into public.seller_verification_audit_events (
      application_id, application_reference, administrator_id, action, reason
    )
    values (
      p_application_id, application_row.reference, (select auth.uid()),
      case
        when p_status = 'under_review' then 'review_started'
        when p_status = 'action_required' then 'information_requested'
        else p_status
      end,
      nullif(trim(p_reason), '')
    );
  end if;

  if p_status = 'approved' then
    seller_type_value := case
      when application_row.business_data ->> 'businessType' = 'individual' then 'individual'
      else 'business'
    end;
    update public.profiles
    set role = 'seller',
        display_name = left(trim(concat(
          application_row.personal_data ->> 'firstName', ' ',
          application_row.personal_data ->> 'lastName'
        )), 80),
        phone = left(application_row.personal_data ->> 'phone', 30),
        location = left(concat_ws(', ',
          application_row.business_data ->> 'city',
          application_row.business_data ->> 'country'
        ), 120)
    where id = application_row.user_id;

    insert into public.seller_profiles (user_id, display_name, seller_type, business_name)
    values (
      application_row.user_id,
      left(trim(concat(
        application_row.personal_data ->> 'firstName', ' ',
        application_row.personal_data ->> 'lastName'
      )), 80),
      seller_type_value,
      nullif(trim(application_row.business_data ->> 'storeName'), '')
    )
    on conflict (user_id) do update
      set display_name = excluded.display_name,
          seller_type = excluded.seller_type,
          business_name = excluded.business_name,
          updated_at = now();

    insert into public.seller_subscriptions (
      seller_id, status, trial_started_at, trial_ends_at
    )
    values (
      application_row.user_id, 'trialing', now(), now() + interval '30 days'
    )
    on conflict (seller_id) do nothing;

    insert into public.seller_trial_identity_claims (
      identity_fingerprint, seller_id
    )
    values (p_trial_identity_fingerprint, application_row.user_id)
    on conflict do nothing;
  elsif p_status = 'suspended' then
    update public.profiles set role = 'buyer' where id = application_row.user_id;
    update public.seller_subscriptions
    set status = 'suspended', updated_at = now()
    where seller_id = application_row.user_id;
    update public.products
    set moderation_status = 'archived',
        updated_at = now()
    where seller_id = application_row.user_id
      and moderation_status = 'published';
  end if;
end;
$$;

revoke all on function public.review_seller_verification_application(
  uuid, text, text, jsonb, boolean, text
) from public, anon;
grant execute on function public.review_seller_verification_application(
  uuid, text, text, jsonb, boolean, text
) to authenticated;
