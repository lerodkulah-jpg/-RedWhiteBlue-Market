create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  product_name text not null check (char_length(trim(product_name)) between 1 and 120),
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, buyer_id),
  check (buyer_id <> seller_id)
);

create index if not exists conversations_buyer_updated_idx
  on public.conversations (buyer_id, updated_at desc);
create index if not exists conversations_seller_updated_idx
  on public.conversations (seller_id, updated_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null
    references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at desc);
create index if not exists messages_sender_created_idx
  on public.messages (sender_id, created_at desc);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

revoke all on public.conversations, public.messages from anon, authenticated;
grant select on public.conversations, public.messages to authenticated;

drop policy if exists "Conversation participants can read conversations"
  on public.conversations;
create policy "Conversation participants can read conversations"
  on public.conversations for select to authenticated
  using (
    buyer_id = (select auth.uid())
    or seller_id = (select auth.uid())
  );

drop policy if exists "Conversation participants can read messages"
  on public.messages;
create policy "Conversation participants can read messages"
  on public.messages for select to authenticated
  using (
    exists (
      select 1
      from public.conversations as conversation
      where conversation.id = conversation_id
        and (
          conversation.buyer_id = (select auth.uid())
          or conversation.seller_id = (select auth.uid())
        )
    )
  );

create or replace function public.start_listing_conversation(p_product_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  listing public.products%rowtype;
  conversation_id uuid;
begin
  if current_user_id is null then
    raise exception 'Sign in to contact the seller'
      using errcode = '42501';
  end if;
  if not (select public.is_email_verified()) then
    raise exception 'Verify your email before messaging sellers'
      using errcode = '42501';
  end if;

  select *
  into listing
  from public.products
  where id = p_product_id
    and moderation_status = 'published'
  for key share;

  if not found then
    raise exception 'This listing is no longer available'
      using errcode = 'P0002';
  end if;
  if listing.seller_id = current_user_id then
    raise exception 'You cannot message yourself about your own listing'
      using errcode = '42501';
  end if;

  insert into public.conversations (
    product_id,
    product_name,
    buyer_id,
    seller_id
  )
  values (
    listing.id,
    listing.name,
    current_user_id,
    listing.seller_id
  )
  on conflict (product_id, buyer_id)
  do update set updated_at = now()
  returning id into conversation_id;

  return conversation_id;
end;
$$;

revoke all on function public.start_listing_conversation(uuid)
  from public, anon;
grant execute on function public.start_listing_conversation(uuid)
  to authenticated;

create or replace function public.send_conversation_message(
  p_conversation_id uuid,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  conversation public.conversations%rowtype;
  sent_count integer;
  message_id uuid;
  normalized_body text := trim(p_body);
begin
  if current_user_id is null then
    raise exception 'Sign in to send a message'
      using errcode = '42501';
  end if;
  if not (select public.is_email_verified()) then
    raise exception 'Verify your email before sending messages'
      using errcode = '42501';
  end if;
  if normalized_body is null
    or char_length(normalized_body) < 1
    or char_length(normalized_body) > 2000 then
    raise exception 'Messages must be between 1 and 2000 characters'
      using errcode = '22023';
  end if;

  select *
  into conversation
  from public.conversations
  where id = p_conversation_id
    and (
      buyer_id = current_user_id
      or seller_id = current_user_id
    )
  for update;

  if not found then
    raise exception 'Conversation not found'
      using errcode = 'P0002';
  end if;

  select count(*)
  into sent_count
  from public.messages
  where conversation_id = p_conversation_id
    and sender_id = current_user_id
    and created_at > now() - interval '1 minute';

  if sent_count >= 5 then
    raise exception 'Please wait a minute before sending more messages'
      using errcode = 'P0001';
  end if;

  insert into public.messages (conversation_id, sender_id, body)
  values (p_conversation_id, current_user_id, normalized_body)
  returning id into message_id;

  update public.conversations
  set updated_at = now()
  where id = p_conversation_id;

  return message_id;
end;
$$;

revoke all on function public.send_conversation_message(uuid, text)
  from public, anon;
grant execute on function public.send_conversation_message(uuid, text)
  to authenticated;
