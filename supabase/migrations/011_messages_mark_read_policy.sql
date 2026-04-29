-- ============================================================
-- 011_messages_mark_read_policy.sql
-- Participants can mark someone else's message as read.
--
-- Without this policy the user-scoped Supabase client silently fails
-- when calling `update messages set read_at = now() where ...` — no
-- rows affected, no error — so the unread badge in the navbar never
-- decreased on refresh after opening a conversation.
-- ============================================================

drop policy if exists "Participants can mark messages read" on public.messages;
create policy "Participants can mark messages read"
  on public.messages for update
  using (
    -- Only allow marking OTHER people's messages (you can't fake-read
    -- your own outbound messages).
    auth.uid() <> sender_id
    and exists (
      select 1 from public.conversations
      where id = conversation_id
        and auth.uid() = any(participant_ids)
    )
  )
  with check (
    auth.uid() <> sender_id
    and exists (
      select 1 from public.conversations
      where id = conversation_id
        and auth.uid() = any(participant_ids)
    )
  );
