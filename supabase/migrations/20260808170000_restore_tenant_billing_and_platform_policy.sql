-- Restore the intended final policy state after the generated 20260808161318
-- reconciliation accidentally replaced tenant-owner billing access with
-- platform-operator access. Platform staff use audited security-definer RPCs
-- for aggregate subscription data and do not need direct tenant billing rows.

begin;

drop policy if exists platform_operators_self_read on public.platform_operators;
create policy platform_operators_self_read
on public.platform_operators for select to authenticated
using (user_id = auth.uid() and status = 'active');

drop policy if exists platform_audit_authorised_read on public.platform_audit_events;
create policy platform_audit_authorised_read
on public.platform_audit_events for select to authenticated
using (
  public.is_platform_operator(
    auth.uid(),
    array['platform_owner', 'platform_auditor']::public.platform_operator_role[]
  )
);

drop policy if exists subscriptions_owner_read on public.subscriptions;
create policy subscriptions_owner_read
on public.subscriptions for select to authenticated
using (public.has_org_role(organization_id, array['owner']::public.app_role[]));

drop policy if exists billing_events_owner_read on public.billing_events;
create policy billing_events_owner_read
on public.billing_events for select to authenticated
using (public.has_org_role(organization_id, array['owner']::public.app_role[]));

comment on policy subscriptions_owner_read on public.subscriptions is
  'Tenant subscription records are visible only to an active owner of that tenant.';
comment on policy billing_events_owner_read on public.billing_events is
  'Tenant billing event records are visible only to an active owner of that tenant.';

commit;
