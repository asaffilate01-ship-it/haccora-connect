-- Phase 16: inspection-grade UK goods-in acceptance and rejection evidence.

alter table public.goods_in_logs
  add column if not exists condition_ok boolean,
  add column if not exists allergen_label_ok boolean,
  add column if not exists use_by date,
  add column if not exists delivery_reference text,
  add column if not exists corrective_action text;

update public.goods_in_logs
set corrective_action = coalesce(nullif(btrim(notes), ''), 'Historical rejected delivery record')
where status in ('rejected', 'partial') and corrective_action is null;

alter table public.goods_in_logs drop constraint if exists goods_in_corrective_action_required;
alter table public.goods_in_logs add constraint goods_in_corrective_action_required check (
  status = 'accepted'
  or char_length(btrim(coalesce(corrective_action, ''))) between 3 and 2000
);
alter table public.goods_in_logs drop constraint if exists goods_in_delivery_reference_length;
alter table public.goods_in_logs add constraint goods_in_delivery_reference_length check (
  delivery_reference is null or char_length(delivery_reference) <= 160
);

do $$
declare p record;
begin
  for p in select policyname from pg_policies
    where schemaname = 'public' and tablename = 'goods_in_logs'
  loop execute format('drop policy if exists %I on public.goods_in_logs', p.policyname); end loop;
end;
$$;

create policy goods_in_read_tenant on public.goods_in_logs for select to authenticated
using (public.can_read_organization(organization_id));

create policy goods_in_insert_attributed on public.goods_in_logs for insert to authenticated
with check (
  organization_id = public.current_organization_id()
  and user_id = auth.uid()
  and public.can_contribute_to_organization(organization_id)
  and (location_id is null or location_id = public.current_location_id() or public.is_manager_or_owner(auth.uid()))
  and (
    status <> 'accepted'
    or (
      coalesce(packaging_ok, true)
      and coalesce(condition_ok, true)
      and coalesce(allergen_label_ok, true)
      and coalesce(temp_ok, true)
    )
  )
);

revoke update, delete on public.goods_in_logs from authenticated;
grant select, insert on public.goods_in_logs to authenticated;

comment on table public.goods_in_logs is
  'Immutable delivery acceptance/rejection evidence supporting UK traceability and HACCP controls.';