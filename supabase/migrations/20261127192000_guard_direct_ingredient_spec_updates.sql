-- Supplier specification revisions must use review_ingredient_change so
-- manager approval and the previous/current evidence snapshots are atomic.
-- New ingredient records remain insertable by the existing role-scoped flow.
begin;

revoke update on table public.ingredients from public, anon, authenticated;

commit;
