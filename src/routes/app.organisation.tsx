import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Check,
  CreditCard,
  KeyRound,
  Loader2,
  MapPin,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/haccora-client";
import { useAuth, type Role } from "@/lib/auth";
import { ACTION_GROUPS, ACTION_LABELS, ROLE_ACTIONS, can, type Action } from "@/lib/permissions";

export const Route = createFileRoute("/app/organisation")({
  head: () => ({ meta: [{ title: "Organisation & team — Haccora" }] }),
  component: OrganisationPage,
});

type Overview = {
  organization_name: string;
  service_status: string;
  plan: string;
  subscription_status: string;
  currency: string;
  seat_limit: number;
  active_members: number;
  pending_invites: number;
  location_limit: number;
  active_locations: number;
  custom_roles_limit: number;
  custom_roles_used: number;
  current_period_end: string | null;
  trial_ends_at: string | null;
};

type Member = {
  membership_id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: Role;
  role_profile_id: string | null;
  role_name: string;
  status: string;
  default_location_id: string | null;
  location_name: string | null;
};

type TenantRole = {
  id: string;
  name: string;
  base_role: "manager" | "chef" | "staff";
  action_permissions: Action[];
  active: boolean;
};

type Location = {
  id: string;
  name: string;
  business_state: string | null;
  is_active: boolean;
};

function OrganisationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<TenantRole[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"manager" | "chef" | "staff">("staff");
  const [inviteProfile, setInviteProfile] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newRegion, setNewRegion] = useState("");
  const [roleName, setRoleName] = useState("");
  const [roleBase, setRoleBase] = useState<"manager" | "chef" | "staff">("staff");
  const [roleActions, setRoleActions] = useState<Action[]>([...ROLE_ACTIONS.staff]);
  const [busy, setBusy] = useState("");

  const canInvite = user ? can(user.role, "team.invite", user.actionPermissions) : false;
  const canManageRoles = user ? can(user.role, "team.manageRoles", user.actionPermissions) : false;

  useEffect(() => {
    if (user && !canInvite) navigate({ to: "/app", replace: true });
  }, [canInvite, navigate, user]);

  const load = useCallback(async () => {
    if (!canInvite) return;
    setLoading(true);
    setError("");
    const [overviewResult, teamResult, roleResult, locationResult] = await Promise.all([
      (supabase as any).rpc("get_tenant_admin_overview"),
      (supabase as any).rpc("get_tenant_team"),
      (supabase as any)
        .from("organization_roles")
        .select("id,name,base_role,action_permissions,active")
        .eq("active", true)
        .order("name"),
      (supabase as any).rpc("get_tenant_locations"),
    ]);
    const failure =
      overviewResult.error || teamResult.error || roleResult.error || locationResult.error;
    if (failure) setError(failure.message ?? "Organisation administration could not be loaded.");
    else {
      setOverview(overviewResult.data as Overview);
      setMembers((teamResult.data ?? []) as Member[]);
      setRoles((roleResult.data ?? []) as TenantRole[]);
      setLocations((locationResult.data ?? []) as Location[]);
    }
    setLoading(false);
  }, [canInvite]);

  useEffect(() => {
    void load();
  }, [load]);

  const sendInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy("invite");
    setError("");
    const selected = roles.find((role) => role.id === inviteProfile);
    const { error: inviteError } = await supabase.functions.invoke("team-invite", {
      body: {
        email: inviteEmail.trim(),
        role: selected?.base_role ?? inviteRole,
        roleProfileId: selected?.id ?? null,
      },
    });
    setBusy("");
    if (inviteError) setError(inviteError.message);
    else {
      setInviteEmail("");
      setNotice(
        "Secure invitation sent. The pending invitation now counts towards the seat limit.",
      );
      await load();
    }
  };

  const saveMember = async (member: Member, patch: Partial<Member>) => {
    setBusy(member.membership_id);
    setError("");
    const next = { ...member, ...patch };
    const selected = roles.find((role) => role.id === next.role_profile_id);
    const role = (selected?.base_role ?? next.role) as Role;
    const { error: updateError } = await (supabase as any).rpc("manage_tenant_member", {
      p_membership_id: member.membership_id,
      p_role: role,
      p_role_profile_id: next.role_profile_id || null,
      p_status: next.status,
      p_default_location_id: next.default_location_id || null,
    });
    setBusy("");
    if (updateError) setError(updateError.message);
    else {
      setNotice(`${member.full_name} was updated and the change was audit logged.`);
      await load();
    }
  };

  const createLocation = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy("location");
    const { error: locationError } = await (supabase as any).rpc("manage_tenant_location", {
      p_action: "create",
      p_name: newLocation.trim(),
      p_business_state: newRegion.trim() || null,
    });
    setBusy("");
    if (locationError) setError(locationError.message);
    else {
      setNewLocation("");
      setNewRegion("");
      setNotice("Premises added within the subscription limit.");
      await load();
    }
  };

  const setLocationStatus = async (location: Location) => {
    setBusy(location.id);
    const { error: locationError } = await (supabase as any).rpc("manage_tenant_location", {
      p_action: location.is_active ? "deactivate" : "activate",
      p_location_id: location.id,
    });
    setBusy("");
    if (locationError) setError(locationError.message);
    else await load();
  };

  const createRole = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy("role");
    const { error: roleError } = await (supabase as any).rpc("save_tenant_role", {
      p_role_id: null,
      p_name: roleName.trim(),
      p_base_role: roleBase,
      p_action_permissions: roleActions,
    });
    setBusy("");
    if (roleError) setError(roleError.message);
    else {
      setRoleName("");
      setNotice("Custom role saved. Supabase will enforce its permitted actions.");
      await load();
    }
  };

  const assignableProfiles = useMemo(
    () => roles.filter((role) => role.base_role === inviteRole),
    [inviteRole, roles],
  );

  if (!user || !canInvite) return null;
  if (loading)
    return (
      <div className="grid min-h-[50vh] place-items-center text-sm text-muted-foreground">
        <Loader2 className="animate-spin" aria-label="Loading organisation" />
      </div>
    );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">Tenant administration</div>
          <h1 className="mt-1 text-2xl md:text-3xl">Organisation, team & permissions</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Manage premises, seats and role assignments. Limits and privilege boundaries are checked
            again in Supabase for every administrative change.
          </p>
        </div>
        <button className="btn-secondary min-h-11 text-sm" onClick={() => void load()}>
          <RefreshCw size={15} /> Refresh
        </button>
      </header>

      {error && (
        <div className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
      )}
      {notice && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl bg-success/10 p-4 text-sm text-success"
        >
          <Check size={16} /> {notice}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={CreditCard}
          label="Plan"
          value={overview?.plan ?? "Trial"}
          detail={overview?.subscription_status}
        />
        <Metric
          icon={Users}
          label="Team seats"
          value={`${overview?.active_members ?? 0} / ${overview?.seat_limit ?? 0}`}
          detail={`${overview?.pending_invites ?? 0} pending invites`}
        />
        <Metric
          icon={MapPin}
          label="Active premises"
          value={`${overview?.active_locations ?? 0} / ${overview?.location_limit ?? 0}`}
          detail="Subscription enforced"
        />
        <Metric
          icon={KeyRound}
          label="Custom roles"
          value={`${overview?.custom_roles_used ?? 0} / ${overview?.custom_roles_limit ?? 0}`}
          detail="Bounded by base role"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="surface overflow-hidden">
          <div className="border-b border-border p-5">
            <div className="flex items-center gap-2">
              <Users size={19} />
              <h2 className="font-display text-xl">Team members</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Suspend access immediately, move a member to another premises, or assign a safe role.
            </p>
          </div>
          <div className="divide-y divide-border">
            {members.map((member) => (
              <MemberRow
                key={member.membership_id}
                member={member}
                currentUserId={user.id}
                locations={locations.filter((location) => location.is_active)}
                roles={roles}
                busy={busy === member.membership_id}
                canManage={canManageRoles}
                onSave={saveMember}
              />
            ))}
          </div>
        </section>

        <section className="surface p-5">
          <div className="flex items-center gap-2">
            <UserPlus size={19} />
            <h2 className="font-display text-xl">Invite staff</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            The invitation is rejected when the plan seat limit or role boundary would be exceeded.
          </p>
          <form className="mt-5 space-y-3" onSubmit={sendInvite}>
            <input
              required
              type="email"
              className="field"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="person@business.co.uk"
            />
            <select
              className="field"
              value={inviteRole}
              onChange={(event) => {
                setInviteRole(event.target.value as typeof inviteRole);
                setInviteProfile("");
              }}
            >
              <option value="staff">Staff</option>
              <option value="chef">Chef</option>
              {user.role === "owner" && <option value="manager">Manager</option>}
            </select>
            {assignableProfiles.length > 0 && (
              <select
                className="field"
                value={inviteProfile}
                onChange={(event) => setInviteProfile(event.target.value)}
              >
                <option value="">Standard {inviteRole}</option>
                {assignableProfiles.map((role) => (
                  <option value={role.id} key={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            )}
            <button
              disabled={busy === "invite"}
              className="btn-alert-solid min-h-11 w-full text-sm disabled:opacity-60"
            >
              {busy === "invite" ? (
                <Loader2 className="animate-spin" size={15} />
              ) : (
                <Send size={15} />
              )}{" "}
              Send secure invite
            </button>
          </form>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="surface p-5">
          <div className="flex items-center gap-2">
            <Building2 size={19} />
            <h2 className="font-display text-xl">Premises</h2>
          </div>
          <div className="mt-4 space-y-2">
            {locations.map((location) => (
              <div
                key={location.id}
                className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm"
              >
                <MapPin
                  size={15}
                  className={location.is_active ? "text-success" : "text-muted-foreground"}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{location.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {location.business_state || "UK premises"} ·{" "}
                    {location.is_active ? "Active" : "Inactive"}
                  </div>
                </div>
                {user.role === "owner" && (
                  <button
                    disabled={busy === location.id}
                    onClick={() => void setLocationStatus(location)}
                    className="rounded-lg border border-border px-3 py-2 text-xs font-bold disabled:opacity-50"
                  >
                    {location.is_active ? "Deactivate" : "Activate"}
                  </button>
                )}
              </div>
            ))}
          </div>
          {user.role === "owner" && (
            <form className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]" onSubmit={createLocation}>
              <input
                required
                minLength={2}
                className="field"
                value={newLocation}
                onChange={(event) => setNewLocation(event.target.value)}
                placeholder="Premises name"
              />
              <input
                className="field"
                value={newRegion}
                onChange={(event) => setNewRegion(event.target.value)}
                placeholder="Town or UK nation"
              />
              <button disabled={busy === "location"} className="btn-secondary min-h-11 text-sm">
                <MapPin size={14} /> Add
              </button>
            </form>
          )}
        </section>

        <section className="surface p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck size={19} />
            <h2 className="font-display text-xl">Custom role</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Custom roles can remove actions but can never gain more power than their selected base
            role.
          </p>
          {user.role === "owner" && (overview?.custom_roles_limit ?? 0) > 0 ? (
            <form className="mt-4 space-y-4" onSubmit={createRole}>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  required
                  minLength={2}
                  className="field"
                  value={roleName}
                  onChange={(event) => setRoleName(event.target.value)}
                  placeholder="e.g. Shift supervisor"
                />
                <select
                  className="field"
                  value={roleBase}
                  onChange={(event) => {
                    const base = event.target.value as typeof roleBase;
                    setRoleBase(base);
                    setRoleActions([...ROLE_ACTIONS[base]]);
                  }}
                >
                  <option value="staff">Staff maximum</option>
                  <option value="chef">Chef maximum</option>
                  <option value="manager">Manager maximum</option>
                </select>
              </div>
              <div className="max-h-72 space-y-3 overflow-y-auto rounded-xl border border-border p-3">
                {ACTION_GROUPS.map((group) => {
                  const available = group.actions.filter((action) =>
                    ROLE_ACTIONS[roleBase].includes(action),
                  );
                  if (!available.length) return null;
                  return (
                    <div key={group.label}>
                      <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                        {group.label}
                      </div>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {available.map((action) => (
                          <label className="flex items-center gap-2 text-xs" key={action}>
                            <input
                              type="checkbox"
                              checked={roleActions.includes(action)}
                              onChange={(event) =>
                                setRoleActions((current) =>
                                  event.target.checked
                                    ? [...current, action]
                                    : current.filter((item) => item !== action),
                                )
                              }
                            />{" "}
                            {ACTION_LABELS[action]}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button disabled={busy === "role"} className="btn-secondary min-h-11 w-full text-sm">
                <Save size={14} /> Save custom role
              </button>
            </form>
          ) : (
            <div className="mt-4 rounded-xl bg-secondary/60 p-4 text-sm text-muted-foreground">
              {user.role !== "owner"
                ? "Only the tenant owner can define custom roles."
                : "Upgrade to Complete or above to create custom roles."}
            </div>
          )}
          {roles.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {roles.map((role) => (
                <span
                  key={role.id}
                  className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold"
                >
                  {role.name} · {role.base_role} · {role.action_permissions.length} actions
                </span>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="surface p-4">
      <Icon size={18} className="text-primary" />
      <div className="mt-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-xl font-black capitalize">{value}</div>
      {detail && (
        <div className="mt-1 text-xs capitalize text-muted-foreground">
          {detail.replaceAll("_", " ")}
        </div>
      )}
    </div>
  );
}

function MemberRow({
  member,
  currentUserId,
  locations,
  roles,
  busy,
  canManage,
  onSave,
}: {
  member: Member;
  currentUserId: string;
  locations: Location[];
  roles: TenantRole[];
  busy: boolean;
  canManage: boolean;
  onSave: (member: Member, patch: Partial<Member>) => Promise<void>;
}) {
  const [roleChoice, setRoleChoice] = useState(
    member.role_profile_id ? `custom:${member.role_profile_id}` : `standard:${member.role}`,
  );
  const [status, setStatus] = useState(member.status);
  const [locationId, setLocationId] = useState(member.default_location_id ?? "");
  const chosenProfile = roleChoice.startsWith("custom:")
    ? roles.find((role) => role.id === roleChoice.slice(7))
    : undefined;
  const chosenRole = (chosenProfile?.base_role ?? roleChoice.replace("standard:", "")) as Role;
  const self = member.user_id === currentUserId;
  return (
    <div className="grid gap-3 p-4 md:grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr_auto] md:items-center">
      <div className="min-w-0">
        <div className="truncate font-semibold">
          {member.full_name}
          {self && <span className="ml-2 text-xs text-primary">You</span>}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {member.email || member.user_id}
        </div>
      </div>
      <select
        className="field text-xs"
        value={roleChoice}
        disabled={!canManage || self || member.role === "owner"}
        onChange={(event) => setRoleChoice(event.target.value)}
      >
        <option value="standard:staff">Standard staff</option>
        <option value="standard:chef">Standard chef</option>
        <option value="standard:manager">Standard manager</option>
        {roles.map((role) => (
          <option value={`custom:${role.id}`} key={role.id}>
            {role.name} ({role.base_role})
          </option>
        ))}
      </select>
      <select
        className="field text-xs"
        value={locationId}
        disabled={!canManage}
        onChange={(event) => setLocationId(event.target.value)}
      >
        {locations.map((location) => (
          <option value={location.id} key={location.id}>
            {location.name}
          </option>
        ))}
      </select>
      <select
        className="field text-xs"
        value={status}
        disabled={!canManage || self}
        onChange={(event) => setStatus(event.target.value)}
      >
        <option value="active">Active</option>
        <option value="suspended">Suspended</option>
        <option value="revoked">Revoked</option>
      </select>
      <button
        disabled={!canManage || busy || self}
        onClick={() =>
          void onSave(member, {
            role: chosenRole,
            role_profile_id: chosenProfile?.id ?? null,
            status,
            default_location_id: locationId || null,
          })
        }
        className="inline-flex min-h-10 items-center justify-center gap-1 rounded-lg border border-border px-3 text-xs font-bold disabled:opacity-40"
      >
        {busy ? <Loader2 className="animate-spin" size={13} /> : <Save size={13} />} Save
      </button>
    </div>
  );
}
