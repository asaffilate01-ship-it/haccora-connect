begin;
select plan(18);

select ok((select relrowsecurity from pg_class where oid='public.traceability_batches'::regclass),
  'batch identities use RLS');
select ok((select relrowsecurity from pg_class where oid='public.traceability_sale_allocations'::regclass),
  'sale allocations use RLS');
select ok((select relrowsecurity from pg_class where oid='public.traceability_batch_events'::regclass),
  'hold and release events use RLS');

select ok(has_table_privilege('authenticated','public.traceability_batches','SELECT'),
  'signed-in members have batch read privilege subject to RLS');
select ok(has_table_privilege('authenticated','public.traceability_batches','INSERT'),
  'managers can insert batches subject to RLS');
select ok(not has_table_privilege('authenticated','public.traceability_batches','UPDATE'),
  'clients cannot directly alter lot quarantine state');
select ok(not has_table_privilege('authenticated','public.traceability_batches','DELETE'),
  'clients cannot delete recorded supplier batches');

select ok(has_table_privilege('authenticated','public.traceability_sale_allocations','SELECT'),
  'authenticated users have allocation read privilege subject to RLS');
select ok(has_table_privilege('authenticated','public.traceability_sale_allocations','INSERT'),
  'authenticated users have allocation insert privilege subject to RLS');
select ok(not has_table_privilege('authenticated','public.traceability_sale_allocations','UPDATE'),
  'manual lot-to-sale allocations cannot be overwritten by clients');
select ok(not has_table_privilege('authenticated','public.traceability_sale_allocations','DELETE'),
  'manual lot-to-sale allocations cannot be deleted by clients');

select ok(has_table_privilege('authenticated','public.traceability_batch_events','SELECT'),
  'manager event history is readable subject to RLS');
select ok(not has_table_privilege('authenticated','public.traceability_batch_events','INSERT'),
  'clients cannot forge lot hold or release events');
select ok(not has_table_privilege('authenticated','public.traceability_batch_events','UPDATE'),
  'clients cannot rewrite lot decisions');
select ok(not has_table_privilege('authenticated','public.traceability_batch_events','DELETE'),
  'clients cannot erase lot decisions');

select ok(not has_table_privilege('anon','public.traceability_batches','SELECT'),
  'anonymous users cannot query supplier lot evidence');
select ok(not has_function_privilege('anon',
  'public.set_traceability_batch_hold(uuid,boolean,text,uuid)','EXECUTE'),
  'anonymous users cannot change lot hold state');
select ok(has_function_privilege('authenticated',
  'public.set_traceability_batch_hold(uuid,boolean,text,uuid)','EXECUTE'),
  'authenticated access to manager-guarded hold RPC is available');

select * from finish();
rollback;
