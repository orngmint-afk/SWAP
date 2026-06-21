drop policy if exists "Thread participants" on threads;
drop policy if exists "Create thread" on threads;
drop policy if exists "Thread messages" on messages;
drop policy if exists "Send message" on messages;

create policy "Thread participants" on threads 
for all using (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "Thread messages" on messages 
for all using (
  exists (
    select 1 from threads 
    where id = thread_id 
    and (buyer_id = auth.uid() or seller_id = auth.uid())
  )
);