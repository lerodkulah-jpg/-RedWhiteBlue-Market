create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  phone text,
  location text,
  role text not null default 'buyer'
    check (role in ('buyer', 'seller', 'administrator')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seller_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null
    check (char_length(trim(display_name)) between 2 and 80),
  phone text check (phone is null or char_length(phone) <= 30),
  location text not null
    check (char_length(trim(location)) between 2 and 120),
  seller_type text not null check (seller_type in ('individual', 'business')),
  business_name text check (business_name is null or char_length(business_name) <= 120),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint business_application_requires_name
    check (seller_type <> 'business' or nullif(trim(business_name), '') is not null)
);

create unique index if not exists seller_applications_one_pending_per_user
  on public.seller_applications (user_id)
  where status = 'pending';

create index if not exists seller_applications_created_at_idx
  on public.seller_applications (created_at);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  metadata_name text;
begin
  metadata_name := nullif(trim(new.raw_user_meta_data ->> 'display_name'), '');

  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    left(coalesce(metadata_name, nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Buyer'), 80),
    'buyer'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id, display_name, role)
select
  users.id,
  left(
    coalesce(
      nullif(trim(users.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(users.email, ''), '@', 1), ''),
      'Buyer'
    ),
    80
  ),
  'buyer'
from auth.users as users
on conflict (id) do nothing;

create or replace function public.update_profile_timestamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists update_profiles_timestamp on public.profiles;
create trigger update_profiles_timestamp
  before update on public.profiles
  for each row execute function public.update_profile_timestamp();

create or replace function public.is_administrator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'administrator'
  );
$$;

create or replace function public.is_email_verified()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users
    where id = (select auth.uid())
      and email_confirmed_at is not null
  );
$$;

alter table public.profiles enable row level security;
alter table public.seller_applications enable row level security;

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, phone, location) on public.profiles to authenticated;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

revoke all on public.seller_applications from anon, authenticated;
grant select, insert on public.seller_applications to authenticated;

drop policy if exists "Applicants and administrators can read applications"
  on public.seller_applications;
create policy "Applicants and administrators can read applications"
  on public.seller_applications for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_administrator())
  );

drop policy if exists "Buyers can submit their own seller applications"
  on public.seller_applications;
create policy "Buyers can submit their own seller applications"
  on public.seller_applications for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
    and reviewed_by is null
    and (select public.is_email_verified())
    and exists (
      select 1 from public.profiles
      where id = (select auth.uid())
        and role = 'buyer'
    )
  );

revoke all on function public.is_administrator() from public, anon;
grant execute on function public.is_administrator() to authenticated;
revoke all on function public.is_email_verified() from public, anon;
grant execute on function public.is_email_verified() to authenticated;

create or replace function public.review_seller_application(
  p_application_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  application_row public.seller_applications%rowtype;
begin
  if (select auth.uid()) is null
    or not (select public.is_administrator()) then
    raise exception 'Administrator access is required'
      using errcode = '42501';
  end if;

  if p_status is null or p_status not in ('approved', 'rejected') then
    raise exception 'Invalid seller application status'
      using errcode = '22023';
  end if;

  select *
  into application_row
  from public.seller_applications
  where id = p_application_id
    and status = 'pending'
  for update;

  if not found then
    raise exception 'Pending seller application was not found'
      using errcode = 'P0002';
  end if;

  update public.seller_applications
  set status = p_status,
      reviewed_by = (select auth.uid()),
      reviewed_at = now()
  where id = application_row.id;

  if p_status = 'approved' then
    update public.profiles
    set display_name = application_row.display_name,
        phone = application_row.phone,
        location = application_row.location,
        role = 'seller'
    where id = application_row.user_id;
  end if;
end;
$$;

revoke all on function public.review_seller_application(uuid, text)
  from public, anon;
grant execute on function public.review_seller_application(uuid, text)
  to authenticated;
