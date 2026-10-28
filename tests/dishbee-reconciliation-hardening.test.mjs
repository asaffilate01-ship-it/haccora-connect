import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Haccora rejects mismatched Dishbee order subject and event key", async () => {
  const source = await read("../src/routes/api/integrations/dishbee.ts");
  assert.match(source, /event.subjectType !== "order"/);
  assert.match(source, /event.subjectId !== parsedOrder.data.orderId/);
  assert.match(source, /event.eventKey !== "haccora-order-handover:" \+ parsedOrder.data.orderId/);
  assert.match(source, /dishbee_order_identity_mismatch/);
  assert.match(source, /DishbeeHandedOver.safeParse\(event.payload\)/);
});

test("reconciliation only queries child evidence for the selected source orders", async () => {
  const source = await read("../src/components/traceability/DishbeeOrderReconciliation.tsx");
  assert.match(source, /const importedOrders = \(o.data \?\? \[\]\) as ImportedOrder\[\]/);
  assert.match(source, /const orderIds = importedOrders.map/);
  assert.match(source, /\.in\("order_id", orderIds\)/);
  assert.match(source, /const lineIds = importedLines.map/);
  assert.match(source, /\.in\("order_line_id", lineIds.slice/);
  assert.match(source, /Math.ceil\(lineIds.length \/ 60\)/);
  assert.match(source, /windowIncomplete/);
  assert.match(source, /Partial reconciliation window/);
  assert.match(source, /Missing links and zero exposure cannot be determined here/);
});
