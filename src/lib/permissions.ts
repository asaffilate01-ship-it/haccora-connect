import type { Role } from "./auth";

/**
 * Granular action-level permissions (in addition to nav-level access).
 * Modelled on Navitas Safety / Trail / Fourth capability matrices.
 *
 * Nav access controls *which page* a user sees; actions control *what they can do* on it.
 */
export const ACTIONS = [
  "records.export", // export CSV/PDF evidence packs
  "records.signOff", // approve / countersign checks
  "records.deleteLog", // delete or amend historical entries (owner-only)
  "haccp.editPlan", // edit HACCP plan / CCPs
  "haccp.approvePlan", // approve / publish plan revisions
  "team.manageRoles", // change other users' roles/permissions
  "team.invite", // invite new users
  "rota.publish", // publish schedule
  "rota.approveSwap", // approve shift swaps
  "purchasing.approvePO", // approve purchase orders
  "purchasing.receive", // accept deliveries + temp check
  "recipes.cost", // view cost/margin data
  "menu.editAllergens", // edit allergen matrix
  "labels.print", // print prep / use-by / allergen labels
  "incidents.report", // create incident/accident report
  "incidents.close", // close / sign-off incident with root-cause
  "audits.perform", // perform internal audit
  "audits.publish", // publish audit results
  "recalls.trigger", // trigger a product recall
  "inspection.grantAccess", // grant inspector portal access
] as const;

export type Action = (typeof ACTIONS)[number];

export const ROLE_ACTIONS: Record<Role, Action[]> = {
  owner: [...ACTIONS],
  manager: [
    "records.export",
    "records.signOff",
    "haccp.editPlan",
    "team.invite",
    "rota.publish",
    "rota.approveSwap",
    "purchasing.approvePO",
    "purchasing.receive",
    "recipes.cost",
    "menu.editAllergens",
    "labels.print",
    "incidents.report",
    "incidents.close",
    "audits.perform",
    "audits.publish",
    "recalls.trigger",
    "inspection.grantAccess",
  ],
  chef: [
    "haccp.editPlan",
    "purchasing.receive",
    "recipes.cost",
    "menu.editAllergens",
    "labels.print",
    "incidents.report",
    "audits.perform",
    "recalls.trigger",
  ],
  staff: ["labels.print", "incidents.report"],
  inspector: ["records.export"],
};

export function can(role: Role, action: Action): boolean {
  return ROLE_ACTIONS[role].includes(action);
}

/** Grouping used by the Settings > Permissions matrix. */
export const ACTION_GROUPS: Array<{ groupDe: string; groupEn: string; actions: Action[] }> = [
  {
    groupDe: "Nachweise & Aufzeichnungen",
    groupEn: "Records & evidence",
    actions: ["records.export", "records.signOff", "records.deleteLog"],
  },
  { groupDe: "HACCP", groupEn: "HACCP", actions: ["haccp.editPlan", "haccp.approvePlan"] },
  {
    groupDe: "Team & Rollen",
    groupEn: "Team & roles",
    actions: ["team.manageRoles", "team.invite"],
  },
  { groupDe: "Dienstplan", groupEn: "Rota", actions: ["rota.publish", "rota.approveSwap"] },
  {
    groupDe: "Einkauf & Wareneingang",
    groupEn: "Purchasing & receiving",
    actions: ["purchasing.approvePO", "purchasing.receive"],
  },
  {
    groupDe: "Küche & Menü",
    groupEn: "Kitchen & menu",
    actions: ["recipes.cost", "menu.editAllergens", "labels.print"],
  },
  {
    groupDe: "Vorfälle & Rückrufe",
    groupEn: "Incidents & recalls",
    actions: ["incidents.report", "incidents.close", "recalls.trigger"],
  },
  {
    groupDe: "Audits & Prüfung",
    groupEn: "Audits & inspection",
    actions: ["audits.perform", "audits.publish", "inspection.grantAccess"],
  },
];

export const ACTION_LABEL_DE: Record<Action, string> = {
  "records.export": "Nachweise exportieren",
  "records.signOff": "Kontrollen freigeben",
  "records.deleteLog": "Einträge löschen / korrigieren",
  "haccp.editPlan": "HACCP-Plan bearbeiten",
  "haccp.approvePlan": "HACCP-Plan freigeben",
  "team.manageRoles": "Rollen verwalten",
  "team.invite": "Mitarbeitende einladen",
  "rota.publish": "Dienstplan veröffentlichen",
  "rota.approveSwap": "Schichttausch freigeben",
  "purchasing.approvePO": "Bestellung freigeben",
  "purchasing.receive": "Wareneingang annehmen",
  "recipes.cost": "Kosten & Marge sehen",
  "menu.editAllergens": "Allergene bearbeiten",
  "labels.print": "Etiketten drucken",
  "incidents.report": "Vorfall melden",
  "incidents.close": "Vorfall abschließen",
  "audits.perform": "Audit durchführen",
  "audits.publish": "Audit veröffentlichen",
  "recalls.trigger": "Rückruf auslösen",
  "inspection.grantAccess": "Prüferzugang freigeben",
};

export const ACTION_LABEL_EN: Record<Action, string> = {
  "records.export": "Export evidence",
  "records.signOff": "Sign off checks",
  "records.deleteLog": "Delete / amend entries",
  "haccp.editPlan": "Edit HACCP plan",
  "haccp.approvePlan": "Approve HACCP plan",
  "team.manageRoles": "Manage roles",
  "team.invite": "Invite team members",
  "rota.publish": "Publish rota",
  "rota.approveSwap": "Approve shift swap",
  "purchasing.approvePO": "Approve PO",
  "purchasing.receive": "Receive deliveries",
  "recipes.cost": "View cost & margin",
  "menu.editAllergens": "Edit allergens",
  "labels.print": "Print labels",
  "incidents.report": "Report incident",
  "incidents.close": "Close incident",
  "audits.perform": "Perform audit",
  "audits.publish": "Publish audit",
  "recalls.trigger": "Trigger recall",
  "inspection.grantAccess": "Grant inspector access",
};
