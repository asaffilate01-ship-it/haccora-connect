-- Haccora UK: keep Dishbee amounts in their original currency.
-- Existing *_eur fields stay unchanged for legacy clients and records; new
-- GBP columns prevent UK pence from being silently interpreted as euros.
-- No automatic FX conversion or destructive historical backfill.
begin;

alter table public.recipes
  add column if not exists source_currency text,
  add column if not exists price_gbp numeric(12,2),
  add column if not exists cost_gbp numeric(12,2);

alter table public.waste_entries
  add column if not exists source_currency text,
  add column if not exists cost_gbp numeric(12,2);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'recipes_source_currency_valid') then
    alter table public.recipes add constraint recipes_source_currency_valid
      check (source_currency is null or source_currency in ('GBP','EUR'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'waste_entries_source_currency_valid') then
    alter table public.waste_entries add constraint waste_entries_source_currency_valid
      check (source_currency is null or source_currency in ('GBP','EUR'));
  end if;
end $$;

comment on column public.recipes.price_gbp is
  'Dishbee-originated GBP price; do not store GBP in legacy price_eur.';
comment on column public.recipes.cost_gbp is
  'Dishbee-originated GBP cost; do not store GBP in legacy cost_eur.';
comment on column public.waste_entries.cost_gbp is
  'Dishbee-originated GBP waste cost; legacy cost_eur is not a conversion.';
commit;
