alter table public.conversations
  add column if not exists buyer_last_read_at timestamptz not null default now(),
  add column if not exists seller_last_read_at timestamptz not null default now();

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  affected_rows integer;
begin
  if current_user_id is null then
    raise exception 'Sign in to update conversation read status'
      using errcode = '42501';
  end if;

  update public.conversations
  set
    buyer_last_read_at = case
      when buyer_id = current_user_id then now()
      else buyer_last_read_at
    end,
    seller_last_read_at = case
      when seller_id = current_user_id then now()
      else seller_last_read_at
    end
  where id = p_conversation_id
    and (
      buyer_id = current_user_id
      or seller_id = current_user_id
    );

  get diagnostics affected_rows = row_count;
  if affected_rows = 0 then
    raise exception 'Conversation not found'
      using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.mark_conversation_read(uuid)
  from public, anon;
grant execute on function public.mark_conversation_read(uuid)
  to authenticated;

create or replace function public.get_seller_unread_message_count()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)
  from public.messages as message
  join public.conversations as conversation
    on conversation.id = message.conversation_id
  where conversation.seller_id = (select auth.uid())
    and message.sender_id <> (select auth.uid())
    and message.created_at > conversation.seller_last_read_at;
$$;

revoke all on function public.get_seller_unread_message_count()
  from public, anon;
grant execute on function public.get_seller_unread_message_count()
  to authenticated;
