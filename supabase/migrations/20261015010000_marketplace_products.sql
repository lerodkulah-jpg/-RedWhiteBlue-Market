create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(trim(name)) between 2 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at timestamptz not null default now()
);

insert into public.categories (name, slug)
values
  ('Electronics', 'electronics'),
  ('Fashion', 'fashion'),
  ('Vehicles', 'vehicles'),
  ('Home & Living', 'home-living'),
  ('Property', 'property'),
  ('Food & Grocery', 'food-grocery'),
  ('Beauty', 'beauty'),
  ('Agriculture', 'agriculture'),
  ('Services', 'services'),
  ('Other', 'other')
on conflict (slug) do nothing;

create table if not exists public.seller_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 80),
  seller_type text not null check (seller_type in ('individual', 'business')),
  business_name text check (business_name is null or char_length(business_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seller_business_requires_name
    check (seller_type <> 'business' or nullif(trim(business_name), '') is not null)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 3 and 120),
  description text not null check (char_length(trim(description)) between 10 and 5000),
  category_id uuid not null references public.categories (id) on delete restrict,
  price numeric(12, 2) not null check (price > 0),
  currency text not null check (currency in ('USD', 'LRD')),
  condition text not null check (condition in ('new', 'used', 'refurbished', 'fresh', 'for_sale')),
  location text not null check (char_length(trim(location)) between 2 and 120),
  moderation_status text not null default 'pending_review'
    check (moderation_status in ('draft', 'pending_review', 'published', 'sold', 'rejected', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_public_feed_idx
  on public.products (created_at desc)
  where moderation_status = 'published';
create index if not exists products_seller_updated_idx
  on public.products (seller_id, updated_at desc);
create index if not exists products_category_feed_idx
  on public.products (category_id, created_at desc)
  where moderation_status = 'published';

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null unique,
  alt_text text not null check (char_length(trim(alt_text)) between 1 and 160),
  position smallint not null default 0 check (position between 0 and 9),
  created_at timestamptz not null default now(),
  constraint product_image_path_matches_owner
    check (
      storage_path like seller_id::text || '/' || product_id::text || '/%'
    ),
  constraint product_images_unique_position unique (product_id, position)
);

create index if not exists product_images_product_position_idx
  on public.product_images (product_id, position);

create table if not exists public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create index if not exists favorites_product_idx on public.favorites (product_id);

create or replace function public.guard_product_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_is_admin boolean := coalesce((select public.is_administrator()), false);
  listing_fields_changed boolean;
begin
  new.updated_at := now();

  if tg_op = 'INSERT' then
    if not actor_is_admin then
      if new.seller_id is distinct from (select auth.uid())
        or new.moderation_status <> 'pending_review'
        or not exists (
          select 1 from public.profiles
          where id = (select auth.uid()) and role = 'seller'
        ) then
        raise exception 'Only approved sellers can submit listings for review'
          using errcode = '42501';
      end if;
    end if;
    return new;
  end if;

  if actor_is_admin then
    return new;
  end if;

  if old.seller_id is distinct from (select auth.uid())
    or new.seller_id is distinct from old.seller_id then
    raise exception 'Sellers can only update their own listings'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'seller'
  ) then
    raise exception 'An approved seller account is required to update listings'
      using errcode = '42501';
  end if;

  if old.moderation_status in ('sold', 'archived') then
    raise exception 'Sold or archived listings cannot be changed'
      using errcode = '42501';
  end if;

  listing_fields_changed :=
    row(new.name, new.description, new.category_id, new.price, new.currency, new.condition, new.location)
    is distinct from
    row(old.name, old.description, old.category_id, old.price, old.currency, old.condition, old.location);

  if new.moderation_status is distinct from old.moderation_status then
    if old.moderation_status = 'published' and new.moderation_status = 'sold'
      and not listing_fields_changed then
      return new;
    end if;

    if old.moderation_status in ('draft', 'pending_review', 'published', 'rejected')
      and new.moderation_status = 'pending_review' then
      return new;
    end if;

    raise exception 'Only administrators can publish, reject, or archive listings'
      using errcode = '42501';
  end if;

  if listing_fields_changed and old.moderation_status in ('published', 'rejected') then
    new.moderation_status := 'pending_review';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_product_changes on public.products;
create trigger guard_product_changes
  before insert or update on public.products
  for each row execute function public.guard_product_changes();

create or replace function public.update_seller_profile_timestamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists update_seller_profiles_timestamp on public.seller_profiles;
create trigger update_seller_profiles_timestamp
  before update on public.seller_profiles
  for each row execute function public.update_seller_profile_timestamp();

alter table public.categories enable row level security;
alter table public.seller_profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.favorites enable row level security;

revoke all on public.categories, public.seller_profiles, public.products,
  public.product_images, public.favorites from anon, authenticated;

grant select on public.categories to anon, authenticated;
grant select on public.seller_profiles to anon, authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant select, insert, delete on public.product_images to authenticated;
grant select, insert, delete on public.favorites to authenticated;

drop policy if exists "Categories are publicly readable" on public.categories;
create policy "Categories are publicly readable"
  on public.categories for select to anon, authenticated
  using (true);

drop policy if exists "Approved seller profiles are public" on public.seller_profiles;
create policy "Approved seller profiles are public"
  on public.seller_profiles for select to anon, authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = user_id and role = 'seller'
    )
  );

drop policy if exists "Sellers can read their own seller profile" on public.seller_profiles;
create policy "Sellers can read their own seller profile"
  on public.seller_profiles for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Administrators can read seller profiles" on public.seller_profiles;
create policy "Administrators can read seller profiles"
  on public.seller_profiles for select to authenticated
  using ((select public.is_administrator()));

drop policy if exists "Published products are public" on public.products;
create policy "Published products are public"
  on public.products for select to anon, authenticated
  using (moderation_status = 'published');

drop policy if exists "Administrators can read products" on public.products;
create policy "Administrators can read products"
  on public.products for select to authenticated
  using ((select public.is_administrator()));

drop policy if exists "Sellers can read their own products" on public.products;
create policy "Sellers can read their own products"
  on public.products for select to authenticated
  using (seller_id = (select auth.uid()));

drop policy if exists "Approved sellers can create products" on public.products;
create policy "Approved sellers can create products"
  on public.products for insert to authenticated
  with check (
    seller_id = (select auth.uid())
    and moderation_status = 'pending_review'
    and exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role = 'seller'
    )
  );

drop policy if exists "Sellers can update their own products" on public.products;
create policy "Sellers can update their own products"
  on public.products for update to authenticated
  using (
    seller_id = (select auth.uid())
    and moderation_status not in ('sold', 'archived')
  )
  with check (
    seller_id = (select auth.uid())
    and moderation_status in ('draft', 'pending_review', 'published', 'sold', 'rejected')
  );

drop policy if exists "Sellers can delete their own products" on public.products;
create policy "Sellers can delete their own products"
  on public.products for delete to authenticated
  using (
    seller_id = (select auth.uid())
    and exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role = 'seller'
    )
  );

drop policy if exists "Published product images are public" on public.product_images;
create policy "Published product images are public"
  on public.product_images for select to anon, authenticated
  using (
    exists (
      select 1 from public.products
      where id = product_id and moderation_status = 'published'
    )
  );

drop policy if exists "Sellers can read their own product images" on public.product_images;
create policy "Sellers can read their own product images"
  on public.product_images for select to authenticated
  using (seller_id = (select auth.uid()));

drop policy if exists "Administrators can read product images" on public.product_images;
create policy "Administrators can read product images"
  on public.product_images for select to authenticated
  using ((select public.is_administrator()));

drop policy if exists "Sellers can add images to their own products" on public.product_images;
create policy "Sellers can add images to their own products"
  on public.product_images for insert to authenticated
  with check (
    seller_id = (select auth.uid())
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
      select 1
      from public.products
      where id = product_id
        and seller_id = (select auth.uid())
        and moderation_status in ('draft', 'pending_review', 'rejected')
    )
  );

drop policy if exists "Users can read their own favorites" on public.favorites;
create policy "Users can read their own favorites"
  on public.favorites for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users can favorite published products" on public.favorites;
create policy "Users can favorite published products"
  on public.favorites for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.products
      where id = product_id and moderation_status = 'published'
    )
  );

drop policy if exists "Users can remove their own favorites" on public.favorites;
create policy "Users can remove their own favorites"
  on public.favorites for delete to authenticated
  using (user_id = (select auth.uid()));

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

    insert into public.seller_profiles (
      user_id,
      display_name,
      seller_type,
      business_name
    )
    values (
      application_row.user_id,
      application_row.display_name,
      application_row.seller_type,
      application_row.business_name
    )
    on conflict (user_id) do update
      set display_name = excluded.display_name,
          seller_type = excluded.seller_type,
          business_name = excluded.business_name;
  end if;
end;
$$;

create or replace function public.review_product(
  p_product_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null
    or not (select public.is_administrator()) then
    raise exception 'Administrator access is required'
      using errcode = '42501';
  end if;

  if p_status is null or p_status not in ('published', 'rejected') then
    raise exception 'Invalid product moderation status'
      using errcode = '22023';
  end if;

  update public.products
  set moderation_status = p_status,
      updated_at = now()
  where id = p_product_id
    and moderation_status = 'pending_review';

  if not found then
    raise exception 'Pending product was not found'
      using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.review_product(uuid, text) from public, anon;
grant execute on function public.review_product(uuid, text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Sellers can upload their own product images"
  on storage.objects;

drop policy if exists "Sellers can delete their own product image files"
  on storage.objects;

drop policy if exists "Product image files are publicly readable"
  on storage.objects;
create policy "Product image files are publicly readable"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'product-images');
