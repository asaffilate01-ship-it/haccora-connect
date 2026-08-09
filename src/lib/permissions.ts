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
  "assets.manage", // create, edit, retire and schedule equipment
  "assets.record", // append checks, issues and maintenance evidence
] as const;

export type Action = (typeof ACTIONS)[number];

export const ROLE_ACTIONS: Record<Role, Action[]> = {
  owner: [...ACTIONS],
  manager: [
    "records.export",
    "records.signOff",
    "haccp.editPlan",
    "team.manageRoles",
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
    "assets.manage",
    "assets.record",
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
    "assets.record",
  ],
  staff: ["labels.print", "incidents.report", "assets.record"],
  inspector: ["records.export"],
};

export function can(role: Role, action: Action, effectivePermissions?: string[]): boolean {
  if (effectivePermissions) return effectivePermissions.includes(action);
  return ROLE_ACTIONS[role].includes(action);
}

/** Grouping used by the Settings > Permissions matrix. */
export const ACTION_GROUPS: Array<{ label: string; actions: Action[] }> = [
  {
    label: "Records & evidence",
    actions: ["records.export", "records.signOff", "records.deleteLog"],
  },
  { label: "HACCP", actions: ["haccp.editPlan", "haccp.approvePlan"] },
  {
    label: "Team & roles",
    actions: ["team.manageRoles", "team.invite"],
  },
  { label: "Rota", actions: ["rota.publish", "rota.approveSwap"] },
  {
    label: "Purchasing & receiving",
    actions: ["purchasing.approvePO", "purchasing.receive"],
  },
  {
    label: "Kitchen & menu",
    actions: ["recipes.cost", "menu.editAllergens", "labels.print"],
  },
  {
    label: "Incidents & recalls",
    actions: ["incidents.report", "incidents.close", "recalls.trigger"],
  },
  {
    label: "Audits & inspection",
    actions: ["audits.perform", "audits.publish", "inspection.grantAccess"],
  },
  { label: "Equipment", actions: ["assets.manage", "assets.record"] },
];

export const ACTION_LABELS: Record<Action, string> = {
  "records.export": "Export evidence",
  "records.signOff": "Sign off checks",
  "records.deleteLog": "Delete / amend entries",
  "haccp.editPlan": "Edit HACCP plan",
  "haccp.approvePlan": "Approve HACCP plan",
  "team.manageRoles": "Manage roles",
  "team.invite": "Invite team members",
  "rota.publish": "Publish rota",
  "rota.approveSwap": "Approve shift swap",
  "purchasing.approvePO": "Approve purchase order",
  "purchasing.receive": "Receive goods",
  "recipes.cost": "View cost & margin",
  "menu.editAllergens": "Edit allergens",
  "labels.print": "Print labels",
  "incidents.report": "Report incident",
  "incidents.close": "Close incident",
  "audits.perform": "Perform audit",
  "audits.publish": "Publish audit",
  "recalls.trigger": "Trigger recall",
  "inspection.grantAccess": "Grant inspector access",
  "assets.manage": "Manage equipment & schedules",
  "assets.record": "Record equipment checks",
};
