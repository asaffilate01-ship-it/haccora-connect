import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  BUSINESS_SERVICES,
  SERVICE_CATEGORIES,
  filterBusinessServices,
} from "../shared/business-services.ts";

test("all offered services have matching database allowlist and request names", async () => {
  const sql = await readFile(
    "supabase/migrations/20260925093000_ai_financial_business_addons.sql",
    "utf8",
  );
  const allowed = [
    ...sql.match(/CHECK \(business_service IN \(([^)]+)\)\)/)[1].matchAll(/'([^']+)'/g),
  ].map((match) => match[1]);
  assert.deepEqual(allowed.sort(), BUSINESS_SERVICES.map((item) => item.id).sort());
  assert.equal(new Set(BUSINESS_SERVICES.map((item) => item.id)).size, BUSINESS_SERVICES.length);
  for (const item of BUSINESS_SERVICES) {
    assert.ok(sql.includes(`WHEN '${item.id}' THEN '${item.name}'`), item.id);
    assert.ok(SERVICE_CATEGORIES.includes(item.category), item.id);
    if (item.href) assert.equal(new URL(item.href).protocol, "https:");
  }
});

test("owners can discover requested AI capabilities and financial services by name and benefit", () => {
  for (const term of [
    "Agentic",
    "GenAI",
    "Intelligent AI",
    "GraphRAG",
    "RAG",
    "Metrics",
    "Financials",
    "Omniqora",
    "XpertJobs",
    "Dishbee",
    "TaxNuvia",
    "Lawquo",
    "Craftvaro",
  ]) {
    assert.ok(filterBusinessServices(term).length > 0, term);
  }
  assert.ok(
    filterBusinessServices("source references", "AI & automation").some(
      (item) => item.id === "omni-rag",
    ),
  );
  assert.deepEqual(filterBusinessServices("GraphRAG", "Finance"), []);
  assert.equal(filterBusinessServices("   ").length, BUSINESS_SERVICES.length);
  assert.ok(
    filterBusinessServices("cash flow", "Finance").some((item) => item.id === "omni-financials"),
  );
});

test("unconnected AI products expose setup expectations without private pilot destinations", () => {
  for (const item of BUSINESS_SERVICES.filter((service) => service.id.startsWith("omni-"))) {
    assert.notEqual(item.availability, "Explore provider");
    assert.equal(item.href, undefined);
    if (item.category === "AI & automation") {
      assert.ok(item.dataNeeded?.length);
      assert.ok(item.reviewNote?.length);
    }
  }
});
