create table if not exists public.seller_verification_applications (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default (
    'RWB-SV-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
  ),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  status text not null default 'draft'
    check (status in (
      'draft', 'pending_review', 'under_review', 'action_required',
      'approved', 'rejected', 'suspended'
    )),
  personal_data jsonb not null default '{}'::jsonb
    check (jsonb_typeof(personal_data) = 'object'),
  business_data jsonb not null default '{}'::jsonb
    check (jsonb_typeof(business_data) = 'object'),
  operations_data jsonb not null default '{}'::jsonb
    check (jsonb_typeof(operations_data) = 'object'),
  payout_verification_status text not null default 'unavailable'
    check (payout_verification_status in ('unavailable', 'pending', 'verified', 'failed')),
  accepted_policy_versions jsonb not null default '{}'::jsonb
    check (jsonb_typeof(accepted_policy_versions) = 'object'),
  applicant_message text,
  submitted_at timestamptz,
  documents_purged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists seller_verification_status_submitted_idx
  on public.seller_verification_applications (status, submitted_at desc);
create index if not exists seller_verification_retention_idx
  on public.seller_verification_applications (updated_at)
  where documents_purged_at is null;
create unique index if not exists seller_verification_store_name_active_idx
  on public.seller_verification_applications (
    lower(trim(business_data ->> 'storeName'))
  )
  where status in (
    'pending_review', 'under_review', 'action_required', 'approved', 'suspended'
  );

create table if not exists public.seller_verification_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null
    references public.seller_verification_applications (id) on delete cascade,
  document_type text not null
    check (document_type in ('national_id', 'passport', 'drivers_license', 'business_registration')),
  issuing_country text not null check (char_length(trim(issuing_country)) between 2 and 80),
  storage_path text not null unique,
  content_type text not null check (content_type in ('image/jpeg', 'image/png', 'application/pdf')),
  size_bytes integer not null check (size_bytes between 1 and 5242880),
  uploaded_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists seller_verification_documents_application_idx
  on public.seller_verification_documents (application_id, created_at);

create table if not exists public.seller_verification_checks (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null
    references public.seller_verification_applications (id) on delete cascade,
  check_type text not null
    check (check_type in ('identity', 'business', 'store_name', 'operations', 'payout', 'agreements')),
  outcome text not null default 'pending'
    check (outcome in ('pending', 'passed', 'failed', 'not_applicable')),
  reviewer_id uuid references public.profiles (id) on delete set null,
  reason text,
  updated_at timestamptz not null default now(),
  unique (application_id, check_type)
);

create table if not exists public.seller_verification_status_history (
  id bigint generated always as identity primary key,
  application_id uuid not null
    references public.seller_verification_applications (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  from_status text,
  to_status text not null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists seller_verification_history_application_idx
  on public.seller_verification_status_history (application_id, created_at desc);

create table if not exists public.seller_verification_audit_events (
  id bigint generated always as identity primary key,
  application_id uuid
    references public.seller_verification_applications (id) on delete set null,
  application_reference text not null,
  administrator_id uuid not null references public.profiles (id) on delete restrict,
  action text not null check (action in (
    'review_started', 'approved', 'information_requested', 'rejected', 'suspended'
  )),
  reason text,
  created_at timestamptz not null default now()
);

alter table public.seller_verification_applications enable row level security;
alter table public.seller_verification_documents enable row level security;
alter table public.seller_verification_checks enable row level security;
alter table public.seller_verification_status_history enable row level security;
alter table public.seller_verification_audit_events enable row level security;

revoke all on public.seller_verification_applications,
  public.seller_verification_documents, public.seller_verification_checks,
  public.seller_verification_status_history, public.seller_verification_audit_events
  from anon, authenticated;

grant select on public.seller_verification_applications,
  public.seller_verification_documents, public.seller_verification_checks,
  public.seller_verification_status_history,
  public.seller_verification_audit_events to authenticated;

create policy "Applicants and administrators can read verification applications"
  on public.seller_verification_applications for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_administrator()));

create policy "Applicants and administrators can read verification documents"
  on public.seller_verification_documents for select to authenticated
  using (
    uploaded_by = (select auth.uid())
    or (select public.is_administrator())
  );

create policy "Applicants and administrators can read verification checks"
  on public.seller_verification_checks for select to authenticated
  using ((select public.is_administrator()));

create policy "Applicants and administrators can read verification history"
  on public.seller_verification_status_history for select to authenticated
  using ((select public.is_administrator()));

create policy "Administrators can read verification audit events"
  on public.seller_verification_audit_events for select to authenticated
  using ((select public.is_administrator()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'seller-verification-private',
  'seller-verification-private',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'seller_verification_applications'
  ) then
    alter publication supabase_realtime
      add table public.seller_verification_applications;
  end if;
end;
$$;

create or replace function public.save_seller_verification_application(
  p_application_id uuid,
  p_data jsonb,
  p_documents jsonb default '[]'::jsonb,
  p_submit boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  verified_email text;
  application_row public.seller_verification_applications%rowtype;
  application_exists boolean;
  previous_status text;
  new_status text;
  agreement_versions jsonb;
  document jsonb;
begin
  if actor_id is null then
    raise exception 'Sign in before saving a seller application'
      using errcode = '42501';
  end if;
  if jsonb_typeof(p_data) <> 'object'
    or jsonb_typeof(coalesce(p_documents, '[]'::jsonb)) <> 'array' then
    raise exception 'Invalid seller application data'
      using errcode = '22023';
  end if;

  select users.email
  into verified_email
  from auth.users users
  where users.id = actor_id
    and users.email_confirmed_at is not null;
  if verified_email is null then
    raise exception 'Verify your email address before applying'
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.profiles profile
    where profile.id = actor_id and profile.role = 'buyer'
  ) then
    raise exception 'Only buyer accounts without seller access can apply'
      using errcode = '42501';
  end if;

  select * into application_row
  from public.seller_verification_applications
  where user_id = actor_id
  for update;

  application_exists := found;
  previous_status := case when application_exists then application_row.status else null end;
  if p_application_id is not null and not application_exists then
    raise exception 'Seller application not found'
      using errcode = 'P0002';
  end if;
  if application_exists and application_row.status in (
    'pending_review', 'under_review', 'approved', 'suspended'
  ) then
    raise exception 'This seller application cannot be edited in its current status'
      using errcode = '23505';
  end if;
  if application_exists and p_application_id is not null and application_row.id <> p_application_id then
    raise exception 'Seller application not found'
      using errcode = 'P0002';
  end if;

  if p_submit then
    if char_length(trim(coalesce(p_data #>> '{personal,firstName}', ''))) not between 1 and 80
      or char_length(trim(coalesce(p_data #>> '{personal,lastName}', ''))) not between 1 and 80
      or char_length(trim(coalesce(p_data #>> '{personal,phone}', ''))) not between 5 and 30
      or char_length(trim(coalesce(p_data #>> '{personal,country}', ''))) not between 2 and 80
      or char_length(trim(coalesce(p_data #>> '{personal,city}', ''))) not between 2 and 80
      or char_length(trim(coalesce(p_data #>> '{business,storeName}', ''))) not between 2 and 120
      or char_length(trim(coalesce(p_data #>> '{business,description}', ''))) not between 20 and 2000
      or coalesce(p_data #>> '{business,businessType}', '') not in ('individual', 'registered_business', 'company')
      or char_length(trim(coalesce(p_data #>> '{business,country}', ''))) not between 2 and 80
      or char_length(trim(coalesce(p_data #>> '{business,city}', ''))) not between 2 and 80
      or coalesce(jsonb_typeof(p_data #> '{business,categories}'), '') <> 'array'
      or case
        when jsonb_typeof(p_data #> '{business,categories}') = 'array'
          then jsonb_array_length(p_data #> '{business,categories}') not between 1 and 20
        else true
      end
      or char_length(trim(coalesce(p_data #>> '{operations,productSources}', ''))) not between 5 and 1000
      or coalesce(p_data #>> '{operations,sellerMethod}', '') not in ('manufacture', 'distribute', 'resell')
      or char_length(trim(coalesce(p_data #>> '{operations,deliveryMethods}', ''))) not between 3 and 500
      or char_length(trim(coalesce(p_data #>> '{operations,processingTime}', ''))) not between 2 and 120
      or coalesce(p_data #>> '{operations,authenticity}', 'false') <> 'true'
      or jsonb_typeof(p_data #> '{business,categories}') <> 'array'
      or jsonb_typeof(p_data #> '{agreements}') <> 'object' then
      raise exception 'Complete all required seller application fields'
        using errcode = '22023';
    end if;
    if coalesce(p_data #>> '{payout,verificationStatus}', '') <> 'unavailable' then
      raise exception 'Payout verification is not configured'
        using errcode = '22023';
    end if;
    if exists (
      select 1 from jsonb_each(p_data #> '{agreements}') agreement
      where agreement.key <> 'version'
        and agreement.value <> 'true'::jsonb
    ) or (select count(*) from jsonb_each(p_data #> '{agreements}')) < 6 then
      raise exception 'Accept each required seller policy before submitting'
        using errcode = '22023';
    end if;
    if exists (
      select 1 from public.seller_profiles seller
      where seller.user_id <> actor_id
        and lower(trim(coalesce(seller.business_name, ''))) =
          lower(trim(p_data #>> '{business,storeName}'))
    ) then
      raise exception 'That store name is already in use'
        using errcode = '23505';
    end if;
    agreement_versions := jsonb_build_object(
      'seller_terms', jsonb_build_object('version', '2026-10-17-v1', 'accepted_at', now()),
      'privacy_notice', jsonb_build_object('version', '2026-10-17-v1', 'accepted_at', now()),
      'prohibited_products', jsonb_build_object('version', '2026-10-17-v1', 'accepted_at', now()),
      'refund_disputes', jsonb_build_object('version', '2026-10-17-v1', 'accepted_at', now()),
      'anti_fraud', jsonb_build_object('version', '2026-10-17-v1', 'accepted_at', now()),
      'accurate_listings', jsonb_build_object('version', '2026-10-17-v1', 'accepted_at', now())
    );
    if not exists (
      select 1 from public.seller_verification_documents document_row
      where document_row.application_id = application_row.id
        and document_row.document_type in ('national_id', 'passport', 'drivers_license')
    ) and jsonb_array_length(coalesce(p_documents, '[]'::jsonb)) = 0 then
      raise exception 'Upload an identity document before submitting'
        using errcode = '22023';
    end if;
    new_status := 'pending_review';
  else
    agreement_versions := '{}'::jsonb;
    new_status := 'draft';
  end if;

  if not application_exists then
    insert into public.seller_verification_applications (
      user_id, personal_data, business_data, operations_data,
      accepted_policy_versions, status, submitted_at
    )
    values (
      actor_id,
      coalesce(p_data -> 'personal', '{}'::jsonb) ||
        jsonb_build_object('email', verified_email),
      coalesce(p_data -> 'business', '{}'::jsonb),
      coalesce(p_data -> 'operations', '{}'::jsonb),
      agreement_versions,
      new_status,
      case when p_submit then now() else null end
    )
    returning * into application_row;
  else
    update public.seller_verification_applications
    set personal_data = coalesce(p_data -> 'personal', '{}'::jsonb) ||
          jsonb_build_object('email', verified_email),
        business_data = coalesce(p_data -> 'business', '{}'::jsonb),
        operations_data = coalesce(p_data -> 'operations', '{}'::jsonb),
        accepted_policy_versions = agreement_versions,
        status = new_status,
        submitted_at = case when p_submit then now() else null end,
        documents_purged_at = null,
        applicant_message = null,
        updated_at = now()
    where id = application_row.id
    returning * into application_row;
  end if;

  for document in select value from jsonb_array_elements(coalesce(p_documents, '[]'::jsonb))
  loop
    if document ->> 'document_type' not in (
      'national_id', 'passport', 'drivers_license', 'business_registration'
    ) or document ->> 'storage_path' not like actor_id::text || '/' || application_row.id::text || '/%'
      or document ->> 'content_type' not in ('image/jpeg', 'image/png', 'application/pdf')
      or coalesce((document ->> 'size_bytes')::integer, 0) not between 1 and 5242880
      or char_length(trim(coalesce(document ->> 'issuing_country', ''))) not between 2 and 80 then
      raise exception 'Invalid verification document metadata'
        using errcode = '22023';
    end if;
    insert into public.seller_verification_documents (
      application_id, document_type, issuing_country, storage_path,
      content_type, size_bytes, uploaded_by
    )
    values (
      application_row.id,
      document ->> 'document_type',
      document ->> 'issuing_country',
      document ->> 'storage_path',
      document ->> 'content_type',
      (document ->> 'size_bytes')::integer,
      actor_id
    )
    on conflict (storage_path) do nothing;
  end loop;

  if p_submit and not exists (
    select 1 from public.seller_verification_documents document_row
    where document_row.application_id = application_row.id
      and document_row.document_type in ('national_id', 'passport', 'drivers_license')
  ) then
    raise exception 'Upload an identity document before submitting'
      using errcode = '22023';
  end if;

  insert into public.seller_verification_checks (application_id, check_type, outcome)
  values
    (application_row.id, 'identity', 'pending'),
    (application_row.id, 'business', 'pending'),
    (application_row.id, 'store_name', 'pending'),
    (application_row.id, 'operations', 'pending'),
    (application_row.id, 'payout', 'not_applicable'),
    (application_row.id, 'agreements', case when p_submit then 'passed' else 'pending' end)
  on conflict (application_id, check_type) do update
    set outcome = excluded.outcome,
        reviewer_id = null,
        reason = null,
        updated_at = now();

  insert into public.seller_verification_status_history (
    application_id, actor_id, from_status, to_status
  )
  values (application_row.id, actor_id, previous_status, new_status);
  return application_row.id;
end;
$$;

create or replace function public.review_seller_verification_application(
  p_application_id uuid,
  p_status text,
  p_reason text default null,
  p_check_outcomes jsonb default '{}'::jsonb
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
  values (p_application_id, (select auth.uid()), previous_status, p_status, nullif(trim(p_reason), ''));

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
  elsif p_status = 'suspended' then
    update public.profiles set role = 'buyer' where id = application_row.user_id;
    update public.products
    set moderation_status = 'archived',
        updated_at = now()
    where seller_id = application_row.user_id
      and moderation_status = 'published';
  end if;
end;
$$;

revoke all on function public.save_seller_verification_application(uuid, jsonb, jsonb, boolean)
  from public, anon;
grant execute on function public.save_seller_verification_application(uuid, jsonb, jsonb, boolean)
  to authenticated;
revoke all on function public.review_seller_verification_application(uuid, text, text, jsonb)
  from public, anon;
grant execute on function public.review_seller_verification_application(uuid, text, text, jsonb)
  to authenticated;

create or replace function public.review_seller_application(
  p_application_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'Legacy seller requests require resubmission through secure seller verification'
    using errcode = '22023';
end;
$$;
revoke all on function public.review_seller_application(uuid, text)
  from public, anon, authenticated;

revoke insert on public.seller_applications from authenticated;
drop policy if exists "Buyers can submit their own seller applications"
  on public.seller_applications;

drop policy if exists "Sellers can update their own products" on public.products;
create policy "Sellers can update their own products"
  on public.products for update to authenticated
  using (
    seller_id = (select auth.uid())
    and moderation_status not in ('sold', 'archived')
    and exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role = 'seller'
    )
  )
  with check (
    seller_id = (select auth.uid())
    and moderation_status in ('draft', 'pending_review', 'published', 'sold', 'rejected')
    and exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role = 'seller'
    )
  );

drop policy if exists "Sellers can add images to their own products" on public.product_images;
create policy "Sellers can add images to their own products"
  on public.product_images for insert to authenticated
  with check (
    seller_id = (select auth.uid())
    and exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role = 'seller'
    )
    and exists (
      select 1 from public.products
      where id = product_id
        and seller_id = (select auth.uid())
        and moderation_status in ('draft', 'pending_review')
    )
  );

drop policy if exists "Sellers can remove their own product images" on public.product_images;
create policy "Sellers can remove their own product images"
  on public.product_images for delete to authenticated
  using (
    seller_id = (select auth.uid())
    and exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role = 'seller'
    )
    and exists (
      select 1
      from public.products
      where id = product_id
        and seller_id = (select auth.uid())
        and moderation_status in ('draft', 'pending_review', 'rejected')
    )
  );

drop policy if exists "Administrators can read seller verification objects" on storage.objects;
create policy "Administrators can read seller verification objects"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'seller-verification-private'
    and (select public.is_administrator())
  );

create policy "Applicants can read their own verification objects"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'seller-verification-private'
    and exists (
      select 1 from public.seller_verification_documents document_row
      where document_row.storage_path = storage.objects.name
        and document_row.uploaded_by = (select auth.uid())
    )
  );
