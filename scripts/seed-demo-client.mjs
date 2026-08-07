import { createClient } from "@supabase/supabase-js";
import {
  DEMO_LOCATION_ID,
  DEMO_ORGANIZATION_ID,
  DEMO_ORGANIZATION_SLUG,
  ISOLATION_LOCATION_ID,
  ISOLATION_ORGANIZATION_ID,
  ISOLATION_ORGANIZATION_SLUG,
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

async function insertOnce(table, rows, onConflict = "id") {
  const { error } = await supabase.from(table).upsert(rows, { onConflict, ignoreDuplicates: true });
  if (error) throw new Error(`${table}: ${error.message}`);
  process.stdout.write(`Seeded ${table}: ${rows.length}\n`);
}

const users = {
  platformOwner: await ensureUser(emails.platformOwner, "Morgan Reed"),
  owner: await ensureUser(emails.owner, "Alex Morgan"),
  manager: await ensureUser(emails.manager, "Samira Khan"),
  chef: await ensureUser(emails.chef, "Priya Shah"),
  staff: await ensureUser(emails.staff, "Jamie Evans"),
  inspector: await ensureUser(emails.inspector, "Taylor Brooks"),
  isolationOwner: await ensureUser(emails.isolationOwner, "Robin Clarke"),
};

await upsert(
  "platform_operators",
  [
    {
      user_id: users.platformOwner.id,
      role: "platform_owner",
      status: "active",
      display_name: "Haccora SaaS Owner",
      created_by: users.platformOwner.id,
    },
  ],
  "user_id",
);

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
  {
    id: ISOLATION_ORGANIZATION_ID,
    name: "Harbour Café Isolation Demo Ltd",
    slug: ISOLATION_ORGANIZATION_SLUG,
    created_by: users.isolationOwner.id,
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
  {
    id: ISOLATION_LOCATION_ID,
    organization_id: ISOLATION_ORGANIZATION_ID,
    name: "Harbour Café – Bristol",
    timezone: "Europe/London",
    business_state: "England",
    address: {
      line1: "5 Harbour Walk",
      city: "Bristol",
      postcode: "BS1 5UH",
      local_authority: "Bristol City Council",
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
    user_id: users.chef.id,
    role: "chef",
    status: "active",
    accepted_at: now.toISOString(),
    invited_by: users.owner.id,
    default_location_id: DEMO_LOCATION_ID,
  },
  {
    id: id(13),
    organization_id: DEMO_ORGANIZATION_ID,
    user_id: users.staff.id,
    role: "staff",
    status: "active",
    accepted_at: now.toISOString(),
    invited_by: users.owner.id,
    default_location_id: DEMO_LOCATION_ID,
  },
  {
    id: id(14),
    organization_id: ISOLATION_ORGANIZATION_ID,
    user_id: users.isolationOwner.id,
    role: "owner",
    status: "active",
    accepted_at: now.toISOString(),
    default_location_id: ISOLATION_LOCATION_ID,
  },
]);
await upsert(
  "profiles",
  [
    ["platformOwner", "Morgan Reed", null, null, "Haccora", "United Kingdom"],
    [
      "owner",
      "Alex Morgan",
      DEMO_ORGANIZATION_ID,
      DEMO_LOCATION_ID,
      "Riverside Kitchen Demo Ltd",
      "Camden, London",
    ],
    [
      "manager",
      "Samira Khan",
      DEMO_ORGANIZATION_ID,
      DEMO_LOCATION_ID,
      "Riverside Kitchen Demo Ltd",
      "Camden, London",
    ],
    [
      "chef",
      "Priya Shah",
      DEMO_ORGANIZATION_ID,
      DEMO_LOCATION_ID,
      "Riverside Kitchen Demo Ltd",
      "Camden, London",
    ],
    [
      "staff",
      "Jamie Evans",
      DEMO_ORGANIZATION_ID,
      DEMO_LOCATION_ID,
      "Riverside Kitchen Demo Ltd",
      "Camden, London",
    ],
    [
      "inspector",
      "Taylor Brooks",
      DEMO_ORGANIZATION_ID,
      DEMO_LOCATION_ID,
      "Riverside Kitchen Demo Ltd",
      "Camden, London",
    ],
    [
      "isolationOwner",
      "Robin Clarke",
      ISOLATION_ORGANIZATION_ID,
      ISOLATION_LOCATION_ID,
      "Harbour Café Isolation Demo Ltd",
      "Bristol",
    ],
  ].map(([key, fullName, organizationId, locationId, restaurantName, location]) => ({
    id: users[key].id,
    full_name: fullName,
    current_organization_id: organizationId,
    current_location_id: locationId,
    restaurant_name: restaurantName,
    location,
    language: "en",
    vertical: "restaurant",
    business_state: "England",
    onboarded_at: now.toISOString(),
    push_alerts: true,
    email_alerts: true,
  })),
);

await upsert("inspector_access_grants", [
  {
    id: id(15),
    organization_id: DEMO_ORGANIZATION_ID,
    inspector_user_id: users.inspector.id,
    location_ids: [DEMO_LOCATION_ID],
    evidence_scopes: [
      "haccp",
      "temperature",
      "cleaning",
      "allergens",
      "training",
      "traceability",
      "audits",
      "documents",
      "incidents",
      "equipment",
    ],
    valid_from: isoDaysFromNow(-1),
    valid_until: isoDaysFromNow(30),
    granted_by: users.owner.id,
    revoked_at: null,
    reason: "Seeded read-only UK food-safety inspection demonstration",
  },
]);

await upsert(
  "subscriptions",
  [
    {
      organization_id: DEMO_ORGANIZATION_ID,
      plan: "complete",
      status: "trialing",
      seats: 5,
      trial_ends_at: isoDaysFromNow(12),
      current_period_end: isoDaysFromNow(12),
      currency: "gbp",
      billing_email: emails.owner,
    },
    {
      organization_id: ISOLATION_ORGANIZATION_ID,
      plan: "essential",
      status: "trialing",
      seats: 2,
      trial_ends_at: isoDaysFromNow(9),
      current_period_end: isoDaysFromNow(9),
      currency: "gbp",
      billing_email: emails.isolationOwner,
    },
  ],
  "organization_id",
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
  {
    id: id(32),
    user_id: users.isolationOwner.id,
    organization_id: ISOLATION_ORGANIZATION_ID,
    location_id: ISOLATION_LOCATION_ID,
    location: "Harbour display fridge",
    reading: 3.6,
    target_min: 0,
    target_max: 5,
    status: "ok",
    note: "Isolation-control record; Riverside users must never see this row.",
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
await upsert("assets", [
  {
    id: id(100),
    qr_token: id(110),
    asset_code: "EQ-DEMO-001",
    organization_id: DEMO_ORGANIZATION_ID,
    location_id: DEMO_LOCATION_ID,
    created_by: users.manager.id,
    name: "Walk-in fridge 1",
    category: "fridge",
    location: "Main kitchen",
    manufacturer: "Demo Refrigeration",
    model: "CHILL-900",
    serial: "DEMO-FR-001",
    next_service_at: dateDaysFromNow(28),
    status: "ok",
    notes: "Demonstration equipment record. Replace with the premises' real asset details.",
  },
  {
    id: id(101),
    qr_token: id(111),
    asset_code: "EQ-DEMO-002",
    organization_id: DEMO_ORGANIZATION_ID,
    location_id: DEMO_LOCATION_ID,
    created_by: users.manager.id,
    name: "Blue food probe",
    category: "probe",
    location: "Chef station",
    manufacturer: "Demo Instruments",
    model: "PROBE-2",
    serial: "DEMO-TP-002",
    next_service_at: dateDaysFromNow(14),
    status: "ok",
  },
]);
await upsert("asset_check_schedules", [
  {
    id: id(130),
    organization_id: DEMO_ORGANIZATION_ID,
    location_id: DEMO_LOCATION_ID,
    asset_id: id(100),
    name: "Daily fridge condition and display check",
    instructions:
      "Check the displayed temperature, door seals, cleanliness and signs of damage. Record the reading and action any exception before leaving this screen.",
    event_type: "inspection",
    frequency_days: 1,
    measured_unit: "°C",
    minimum_value: 0,
    maximum_value: 8,
    next_due_at: isoDaysFromNow(-1),
    created_by: users.manager.id,
  },
  {
    id: id(131),
    organization_id: DEMO_ORGANIZATION_ID,
    location_id: DEMO_LOCATION_ID,
    asset_id: id(101),
    name: "Monthly ice-point probe check",
    instructions:
      "Use a properly prepared ice slurry. Clean and sanitise the probe after the check.",
    event_type: "calibration",
    frequency_days: 30,
    measured_unit: "°C",
    minimum_value: -1,
    maximum_value: 1,
    next_due_at: isoDaysFromNow(14),
    created_by: users.manager.id,
  },
]);
await insertOnce("asset_events", [
  {
    id: id(120),
    organization_id: DEMO_ORGANIZATION_ID,
    location_id: DEMO_LOCATION_ID,
    asset_id: id(100),
    event_type: "inspection",
    outcome: "pass",
    title: "Door seals and displayed temperature checked",
    notes: "No damage or food debris observed.",
    recorded_by: users.staff.id,
    recorded_by_name: "Jamie Evans",
  },
  {
    id: id(121),
    organization_id: DEMO_ORGANIZATION_ID,
    location_id: DEMO_LOCATION_ID,
    asset_id: id(101),
    event_type: "calibration",
    outcome: "pass",
    title: "Ice-point accuracy check",
    notes: "Probe cleaned and sanitised after the check.",
    measured_value: 0.3,
    measured_unit: "°C",
    next_due_at: isoDaysFromNow(30),
    recorded_by: users.manager.id,
    recorded_by_name: "Samira Khan",
  },
]);

const loginLabels = {
  platformOwner: "SaaS owner",
  owner: "Tenant admin",
  manager: "Manager",
  chef: "Chef",
  staff: "Staff",
  inspector: "Inspector",
  isolationOwner: "Isolation owner",
};
process.stdout.write("\nDemo client ready. Sign in with one of these test-only accounts:\n");
for (const [key, email] of Object.entries(emails))
  process.stdout.write(`  ${loginLabels[key].padEnd(16)} ${email}\n`);
process.stdout.write("Password: the private DEMO_PASSWORD value you supplied (not printed).\n");
process.stdout.write("Run `npm run demo:access` to verify every login and RLS boundary.\n");
