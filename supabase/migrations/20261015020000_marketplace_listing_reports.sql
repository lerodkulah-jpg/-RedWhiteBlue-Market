create table if not exists public.listing_reports (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (
    reason in (
      'incorrect_information',
      'prohibited_item',
      'suspected_scam',
      'other'
    )
  ),
  details text check (details is null or char_length(trim(details)) <= 1000),
  status text not null default 'pending'
    check (status in ('pending', 'handled', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  unique (reporter_id, product_id)
);

create index if not exists listing_reports_pending_idx
  on public.listing_reports (created_at)
  where status = 'pending';

alter table public.listing_reports enable row level security;
revoke all on public.listing_reports from anon, authenticated;
grant select, insert on public.listing_reports to authenticated;

drop policy if exists "Verified users can report published listings"
  on public.listing_reports;
create policy "Verified users can report published listings"
  on public.listing_reports for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and (select public.is_email_verified())
    and exists (
      select 1 from public.products
      where id = product_id and moderation_status = 'published'
    )
  );

drop policy if exists "Administrators can read listing reports"
  on public.listing_reports;
create policy "Administrators can read listing reports"
  on public.listing_reports for select to authenticated
  using ((select public.is_administrator()));

create or replace function public.review_listing_report(
  p_report_id uuid,
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

  if p_status is null or p_status not in ('handled', 'dismissed') then
    raise exception 'Invalid listing report status'
      using errcode = '22023';
  end if;

  update public.listing_reports
  set status = p_status,
      reviewed_by = (select auth.uid()),
      reviewed_at = now()
  where id = p_report_id
    and status = 'pending';

  if not found then
    raise exception 'Pending listing report was not found'
      using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.review_listing_report(uuid, text)
  from public, anon;
grant execute on function public.review_listing_report(uuid, text)
  to authenticated;
