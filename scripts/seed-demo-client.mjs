import { createClient } from "@supabase/supabase-js";
import {
  DEMO_LOCATION_ID,
  DEMO_ORGANIZATION_ID,
  DEMO_ORGANIZATION_SLUG,
  demoEmails,
  requireDemoEnvironment,
} from "./demo-client-config.mjs";

const { url, serviceKey } = requireDemoEnvironment();
const password = process.env.DEMO_PASSWORD;
if (!password || password.length < 16)
  throw new Error("DEMO_PASSWORD must contain at least 16 characters.");

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const emails = demoEmails();
const now = new Date();
const isoDaysFromNow = (days) => new Date(now.getTime() + days * 86400000).toISOString();
const dateDaysFromNow = (days) => isoDaysFromNow(days).slice(0, 10);
const id = (suffix) => `d0000000-0000-4000-8000-${String(suffix).padStart(12, "0")}`;

async function findUser(email) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (data.users.length < 100) break;
  }
  return null;
}

async function ensureUser(email, fullName) {
  const existing = await findUser(email);
  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { ...existing.user_metadata, full_name: fullName, haccora_demo: true },
    });
    if (error) throw error;
    return data.user;
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, haccora_demo: true },
  });
  if (error) throw error;
  return data.user;
}

async function upsert(table, rows, onConflict = "id") {
  const { error } = await supabase.from(table).upsert(rows, { onConflict });
  if (error) throw new Error(`${table}: ${error.message}`);
  process.stdout.write(`Seeded ${table}: ${rows.length}\n`);
}

const users = {
  owner: await ensureUser(emails.owner, "Alex Morgan"),
  manager: await ensureUser(emails.manager, "Samira Khan"),
  staff: await ensureUser(emails.staff, "Jamie Evans"),
};

await upsert("organizations", [
  {
    id: DEMO_ORGANIZATION_ID,
    name: "Riverside Kitchen Demo Ltd",
    slug: DEMO_ORGANIZATION_SLUG,
    created_by: users.owner.id,
    country_code: "GB",
    timezone: "Europe/London",
    enabled_modules: ["food_safety", "allergens", "training", "documents", "team"],
  },
]);
await upsert("locations", [
  {
    id: DEMO_LOCATION_ID,
    organization_id: DEMO_ORGANIZATION_ID,
    name: "Riverside Kitchen – Camden",
    timezone: "Europe/London",
    business_state: "England",
    address: {
      line1: "18 Market Road",
      city: "London",
      postcode: "NW1 8AH",
      local_authority: "London Borough of Camden",
      country: "United Kingdom",
    },
  },
]);

await upsert("organization_memberships", [
  {
    id: id(10),
    organization_id: DEMO_ORGANIZATION_ID,
    user_id: users.owner.id,
    role: "owner",
    status: "active",
    accepted_at: now.toISOString(),
    default_location_id: DEMO_LOCATION_ID,
  },
  {
    id: id(11),
    organization_id: DEMO_ORGANIZATION_ID,
    user_id: users.manager.id,
    role: "manager",
    status: "active",
    accepted_at: now.toISOString(),
    invited_by: users.owner.id,
    default_location_id: DEMO_LOCATION_ID,
  },
  {
    id: id(12),
    organization_id: DEMO_ORGANIZATION_ID,
    user_id: users.staff.id,
    role: "staff",
    status: "active",
    accepted_at: now.toISOString(),
    invited_by: users.owner.id,
    default_location_id: DEMO_LOCATION_ID,
  },
]);
await upsert(
  "profiles",
  Object.entries(users).map(([role, user]) => ({
    id: user.id,
    full_name:
      role === "owner" ? "Alex Morgan" : role === "manager" ? "Samira Khan" : "Jamie Evans",
    current_organization_id: DEMO_ORGANIZATION_ID,
    current_location_id: DEMO_LOCATION_ID,
    restaurant_name: "Riverside Kitchen Demo Ltd",
    location: "Camden, London",
    language: "en",
    vertical: "restaurant",
    business_state: "England",
    onboarded_at: now.toISOString(),
    push_alerts: true,
    email_alerts: true,
  })),
);

await upsert("checks", [
  {
    id: id(20),
    user_id: users.staff.id,
    organization_id: DEMO_ORGANIZATION_ID,
    location_id: DEMO_LOCATION_ID,
    kind: "opening",
    title: "Opening food-safety checks",
    status: "pending",
    note: "Complete before food preparation begins.",
  },
  {
    id: id(21),
    user_id: users.staff.id,
    organization_id: DEMO_ORGANIZATION_ID,
    location_id: DEMO_LOCATION_ID,
    kind: "closing",
    title: "Closing food-safety checks",
    status: "pending",
    note: "Complete after service.",
  },
]);
await upsert("temperature_logs", [
  {
    id: id(30),
    user_id: users.staff.id,
    organization_id: DEMO_ORGANIZATION_ID,
    location_id: DEMO_LOCATION_ID,
    location: "Walk-in fridge",
    reading: 4.1,
    target_min: 0,
    target_max: 5,
    status: "ok",
    note: "Opening check",
  },
  {
    id: id(31),
    user_id: users.manager.id,
    organization_id: DEMO_ORGANIZATION_ID,
    location_id: DEMO_LOCATION_ID,
    location: "Upright freezer",
    reading: -12.4,
    target_min: -25,
    target_max: -18,
    status: "alert",
    note: "Demo exception: investigate and record corrective action",
  },
]);
await upsert("cleaning_tasks", [
  {
    id: id(40),
    organization_id: DEMO_ORGANIZATION_ID,
    location_id: DEMO_LOCATION_ID,
    area: "Food preparation benches",
    instruction: "Remove debris, wash, rinse, disinfect and allow the stated contact time.",
    chemical: "Food-safe surface disinfectant",
    contact_minutes: 5,
    frequency: "each_shift",
    colour_code: "green",
    created_by: users.manager.id,
  },
  {
    id: id(41),
    organization_id: DEMO_ORGANIZATION_ID,
    location_id: DEMO_LOCATION_ID,
    area: "Walk-in fridge",
    instruction: "Clean shelves and handles; protect or remove food first.",
    chemical: "Food-safe sanitiser",
    contact_minutes: 5,
    frequency: "daily",
    colour_code: "green",
    created_by: users.manager.id,
  },
]);
await upsert("cleaning_completions", [
  {
    id: id(42),
    organization_id: DEMO_ORGANIZATION_ID,
    location_id: DEMO_LOCATION_ID,
    task_id: id(40),
    task_area_snapshot: "Food preparation benches",
    completed_by: users.staff.id,
    completed_at: isoDaysFromNow(-1),
    result: "satisfactory",
    notes: "End-of-shift clean completed.",
  },
]);
await upsert("goods_in_logs", [
  {
    id: id(50),
    user_id: users.staff.id,
    organization_id: DEMO_ORGANIZATION_ID,
    location_id: DEMO_LOCATION_ID,
    supplier: "Demo Fresh Produce Ltd",
    product: "Pasteurised milk",
    quantity: 12,
    unit: "litres",
    delivery_reference: "DEMO-DEL-1042",
    batch_lot: "MILK-DEMO-01",
    delivery_temp_c: 3.8,
    temp_ok: true,
    condition_ok: true,
    packaging_ok: true,
    allergen_label_ok: true,
    status: "accepted",
    use_by: dateDaysFromNow(5),
    notes: "Seeded example delivery — not a real supplier record.",
  },
]);
await upsert("recipes", [
  {
    id: id(60),
    created_by: users.manager.id,
    organization_id: DEMO_ORGANIZATION_ID,
    location_id: DEMO_LOCATION_ID,
    name: "Chicken tikka wrap",
    category: "Lunch",
    allergens: ["milk", "gluten"],
    flagged: true,
    notes: "Contains yoghurt and wheat tortilla. Verify supplier labels before service.",
  },
  {
    id: id(61),
    created_by: users.manager.id,
    organization_id: DEMO_ORGANIZATION_ID,
    location_id: DEMO_LOCATION_ID,
    name: "Sesame vegetable noodles",
    category: "Main",
    allergens: ["sesame", "soya", "gluten"],
    flagged: true,
    notes: "Demo allergen record; avoid cross-contact.",
  },
]);
await upsert("expiry_items", [
  {
    id: id(70),
    user_id: users.staff.id,
    organization_id: DEMO_ORGANIZATION_ID,
    location_id: DEMO_LOCATION_ID,
    name: "Prepared chicken filling",
    location: "Walk-in fridge",
    batch: "DEMO-BATCH-7",
    qty: 2,
    unit: "trays",
    expires_on: dateDaysFromNow(1),
    status: "active",
    note: "Priority demo expiry alert.",
  },
]);
await upsert("training_records", [
  {
    id: id(80),
    user_id: users.staff.id,
    organization_id: DEMO_ORGANIZATION_ID,
    location_id: DEMO_LOCATION_ID,
    course_name: "Level 2 Food Safety in Catering",
    provider: "Demo Training Provider",
    progress: 100,
    score: 92,
    completed_at: isoDaysFromNow(-330),
    certificate_valid_to: dateDaysFromNow(35),
    certificate_reference: "DEMO-CERT-002",
    verified_at: isoDaysFromNow(-329),
    verified_by: users.manager.id,
    verification_note:
      "Seeded demonstration record; replace with verified evidence in a live tenant.",
  },
]);
await upsert("documents", [
  {
    id: id(90),
    user_id: users.manager.id,
    subject_user_id: users.staff.id,
    organization_id: DEMO_ORGANIZATION_ID,
    location_id: DEMO_LOCATION_ID,
    title: "Level 2 food safety certificate — demo metadata",
    category: "training",
    document_kind: "training_certificate",
    issued_on: dateDaysFromNow(-330),
    expires_at: dateDaysFromNow(35),
    version: "1",
    mime_type: "application/pdf",
  },
  {
    id: id(91),
    user_id: users.owner.id,
    organization_id: DEMO_ORGANIZATION_ID,
    location_id: DEMO_LOCATION_ID,
    title: "Public liability insurance — demo metadata",
    category: "insurance",
    document_kind: "insurance_certificate",
    issued_on: dateDaysFromNow(-300),
    expires_at: dateDaysFromNow(65),
    version: "2026",
    mime_type: "application/pdf",
  },
]);

process.stdout.write("\nDemo client ready. Sign in with one of these test-only accounts:\n");
for (const [role, email] of Object.entries(emails))
  process.stdout.write(`  ${role.padEnd(7)} ${email}\n`);
process.stdout.write("Password: the private DEMO_PASSWORD value you supplied (not printed).\n");
