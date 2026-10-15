begin;
select plan(19);

select ok((select relrowsecurity from pg_class where oid='public.dishbee_trace_orders'::regclass),
  'Dishbee order snapshots have RLS enabled');
select ok((select relrowsecurity from pg_class where oid='public.dishbee_trace_order_lines'::regclass),
  'Dishbee order lines have RLS enabled');
select ok((select relrowsecurity from pg_class where oid='public.dishbee_trace_batch_links'::regclass),
  'manager reviewed batch links have RLS enabled');

select ok(not has_table_privilege('anon','public.dishbee_trace_orders','SELECT'),
  'anonymous clients cannot read imported order snapshots');
select ok(not has_table_privilege('anon','public.dishbee_trace_order_lines','SELECT'),
  'anonymous clients cannot read imported food items');
select ok(not has_table_privilege('anon','public.dishbee_trace_batch_links','SELECT'),
  'anonymous clients cannot read lot attribution');

select ok(has_table_privilege('authenticated','public.dishbee_trace_orders','SELECT'),
  'authenticated managers may select orders within RLS');
select ok(has_table_privilege('authenticated','public.dishbee_trace_order_lines','SELECT'),
  'authenticated managers may select order lines within RLS');
select ok(has_table_privilege('authenticated','public.dishbee_trace_batch_links','SELECT'),
  'authenticated managers may read evidence links within RLS');

select ok(not has_table_privilege('authenticated','public.dishbee_trace_orders','INSERT'),
  'browser clients cannot forge source order events');
select ok(not has_table_privilege('authenticated','public.dishbee_trace_order_lines','INSERT'),
  'browser clients cannot forge source order lines');
select ok(not has_table_privilege('authenticated','public.dishbee_trace_batch_links','INSERT'),
  'browser clients cannot forge reviewed lot links');
select ok(not has_table_privilege('authenticated','public.dishbee_trace_orders','UPDATE'),
  'browser clients cannot rewrite source order events');
select ok(not has_table_privilege('authenticated','public.dishbee_trace_order_lines','UPDATE'),
  'browser clients cannot rewrite source order lines');
select ok(not has_table_privilege('authenticated','public.dishbee_trace_batch_links','DELETE'),
  'browser clients cannot delete lot attribution');

select ok(not has_function_privilege('anon',
  'public.ingest_dishbee_trace_order(uuid,uuid,text,text,timestamptz,text,jsonb)','EXECUTE'),
  'anonymous clients cannot invoke order ingestion');
select ok(not has_function_privilege('authenticated',
  'public.ingest_dishbee_trace_order(uuid,uuid,text,text,timestamptz,text,jsonb)','EXECUTE'),
  'authenticated clients cannot invoke privileged source ingestion');
select ok(has_function_privilege('service_role',
  'public.ingest_dishbee_trace_order(uuid,uuid,text,text,timestamptz,text,jsonb)','EXECUTE'),
  'service_role can ingest authenticated order events');
select ok(has_function_privilege('authenticated',
  'public.link_dishbee_trace_batch(uuid,uuid,text)','EXECUTE'),
  'authenticated manager may request a separately authorised batch review');

select * from finish();
rollback;
