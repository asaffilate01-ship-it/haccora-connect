/**
 * Food Standards Agency (FHRS) open-data ingestion.
 *
 * Source: https://api.ratings.food.gov.uk (Open Government Licence).
 * The FHRS feed contains business identity, type, address, local authority and
 * hygiene rating only. It contains no contact name, phone number or email —
 * those must be enriched separately and only where PECR/GDPR allows.
 */

const FSA_BASE = "https://api.ratings.food.gov.uk";
const FSA_HEADERS = { "x-api-version": "2", accept: "application/json" };

export type FsaAuthority = { id: number; name: string };

export type FsaSyncOptions = {
  localAuthorityId: number;
  businessTypeId?: number | null;
  maxRecords?: number;
};

export type FsaSyncResult = {
  fetched: number;
  matched: number;
  upserted: number;
  localAuthority: string | null;
};

type FsaEstablishment = {
  FHRSID?: number | string;
  BusinessName?: string;
  BusinessType?: string;
  BusinessTypeID?: number;
  AddressLine1?: string;
  AddressLine2?: string;
  AddressLine3?: string;
  AddressLine4?: string;
  PostCode?: string;
  LocalAuthorityName?: string;
  RatingValue?: string;
  RatingDate?: string | null;
  NewRatingPending?: boolean;
  geocode?: { latitude?: string | null; longitude?: string | null } | null;
  scores?: {
    Hygiene?: number | null;
    Structural?: number | null;
    ConfidenceInManagement?: number | null;
  } | null;
};

export async function fetchAuthorities(): Promise<FsaAuthority[]> {
  const response = await fetch(`${FSA_BASE}/Authorities/basic`, { headers: FSA_HEADERS });
  if (!response.ok) throw new Error(`FSA authorities request failed (${response.status})`);
  const payload = (await response.json()) as {
    authorities?: Array<{ LocalAuthorityId?: number; Name?: string }>;
  };
  return (payload.authorities ?? [])
    .filter((authority) => typeof authority.LocalAuthorityId === "number" && authority.Name)
    .map((authority) => ({ id: authority.LocalAuthorityId as number, name: authority.Name as string }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function toNumber(value: unknown): number | null {
  const parsed = typeof value === "string" ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Awaiting inspection, or a hygiene rating of 0-2 out of 5. */
function isTargetProspect(establishment: FsaEstablishment): boolean {
  const rating = (establishment.RatingValue ?? "").trim();
  if (/awaiting/i.test(rating)) return true;
  const numeric = Number.parseInt(rating, 10);
  return Number.isInteger(numeric) && numeric <= 2;
}

export async function syncFsaProspects(
  options: FsaSyncOptions,
  startedBy: string,
): Promise<FsaSyncResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const startedAt = new Date().toISOString();
  const maxRecords = Math.min(Math.max(options.maxRecords ?? 200, 1), 1000);

  const params = new URLSearchParams({
    localAuthorityId: String(options.localAuthorityId),
    pageNumber: "1",
    pageSize: String(maxRecords),
    sortOptionKey: "rating",
  });
  if (options.businessTypeId) params.set("businessTypeId", String(options.businessTypeId));

  try {
    const response = await fetch(`${FSA_BASE}/Establishments?${params.toString()}`, {
      headers: FSA_HEADERS,
    });
    if (!response.ok) throw new Error(`FSA establishments request failed (${response.status})`);
    const payload = (await response.json()) as { establishments?: FsaEstablishment[] };
    const establishments = payload.establishments ?? [];
    const matches = establishments.filter(isTargetProspect);

    const rows = matches.map((establishment) => {
      const rating = (establishment.RatingValue ?? "").trim();
      return {
        fhrs_id: String(establishment.FHRSID ?? ""),
        business_name: establishment.BusinessName ?? "Unknown business",
        business_type: establishment.BusinessType ?? null,
        business_type_id: establishment.BusinessTypeID ?? null,
        address_line_1: establishment.AddressLine1 ?? null,
        address_line_2: establishment.AddressLine2 ?? null,
        address_line_3: establishment.AddressLine3 ?? null,
        address_line_4: establishment.AddressLine4 ?? null,
        postcode: establishment.PostCode ?? null,
        local_authority: establishment.LocalAuthorityName ?? null,
        latitude: toNumber(establishment.geocode?.latitude),
        longitude: toNumber(establishment.geocode?.longitude),
        rating_value: rating || null,
        rating_date: establishment.RatingDate ? establishment.RatingDate.slice(0, 10) : null,
        new_rating_pending: Boolean(establishment.NewRatingPending),
        awaiting_inspection: /awaiting/i.test(rating),
        score_hygiene: establishment.scores?.Hygiene ?? null,
        score_structural: establishment.scores?.Structural ?? null,
        score_confidence: establishment.scores?.ConfidenceInManagement ?? null,
        synced_at: new Date().toISOString(),
      };
    });

    const upsertable = rows.filter((row) => row.fhrs_id);
    if (upsertable.length > 0) {
      const { error } = await supabaseAdmin
        .from("fsa_prospects")
        .upsert(upsertable, { onConflict: "fhrs_id" });
      if (error) throw new Error(error.message);
    }

    const localAuthority = matches[0]?.LocalAuthorityName ?? null;

    await supabaseAdmin.from("fsa_sync_runs").insert({
      local_authority: localAuthority,
      business_type_id: options.businessTypeId ?? null,
      fetched_count: establishments.length,
      inserted_count: upsertable.length,
      updated_count: 0,
      status: "succeeded",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      started_by: startedBy,
    });

    return {
      fetched: establishments.length,
      matched: matches.length,
      upserted: upsertable.length,
      localAuthority,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown FSA sync failure";
    await supabaseAdmin.from("fsa_sync_runs").insert({
      business_type_id: options.businessTypeId ?? null,
      status: "failed",
      error_message: message.slice(0, 500),
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      started_by: startedBy,
    });
    throw new Error(message);
  }
}
