-- Ledger-preserving reconciliation.
-- This migration was accidentally published as a byte-for-byte replay of
-- 20260927090000_shared_core_tenant_setup.sql. The canonical schema/function
-- changes live in that earlier migration. Keep this timestamp so deployed
-- migration history remains compatible, but do not replay DDL on fresh databases.
BEGIN;
SELECT 1;
COMMIT;
