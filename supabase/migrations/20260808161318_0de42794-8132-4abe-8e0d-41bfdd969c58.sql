drop policy if exists platform_operators_self_read on public.platform_operators;
create policy platform_operators_self_read
on public.platform_operators
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists platform_audit_authorised_read on public.platform_audit_events;
create policy platform_audit_authorised_read
on public.platform_audit_events
for select
to authenticated
using (public.is_platform_operator(auth.uid(), array['platform_owner'::public.platform_operator_role, 'platform_auditor'::public.platform_operator_role]));

drop policy if exists subscriptions_admin_read on public.subscriptions;
drop policy if exists subscriptions_owner_read on public.subscriptions;
create policy subscriptions_owner_read
on public.subscriptions
for select
to authenticated
using (public.is_platform_operator(auth.uid(), array['platform_owner'::public.platform_operator_role, 'platform_support'::public.platform_operator_role, 'platform_auditor'::public.platform_operator_role]));

drop policy if exists billing_events_read on public.billing_events;
drop policy if exists billing_events_owner_read on public.billing_events;
create policy billing_events_owner_read
on public.billing_events
for select
to authenticated
using (public.is_platform_operator(auth.uid(), array['platform_owner'::public.platform_operator_role, 'platform_support'::public.platform_operator_role, 'platform_auditor'::public.platform_operator_role]));