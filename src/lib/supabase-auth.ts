import type { Role } from "@/store/app";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? "https://qvrebewjlthikhzxwpcg.supabase.co";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? "sb_publishable_RiKCU541R0b2uFu4RAS2-Q_3bbTx10m";

const AUTH_STORAGE_KEY = "fitfyt-auth-session";

export type AuthUser = {
  id: string;
  role: Role;
  name: string;
  phone: string;
  email?: string;
  branchId?: string;
  permissions?: string[];
};

type StoredAuthSession = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  user: AuthUser;
};

type SupabaseSessionResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  user?: {
    id: string;
    email?: string;
    phone?: string;
    user_metadata?: Record<string, unknown>;
    app_metadata?: Record<string, unknown>;
  };
};

export type ManagedUserProfile = {
  id: string;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  role?: Role | null;
  branch_id?: string | null;
  permissions?: string[] | null;
  active?: boolean | null;
  created_at?: string | null;
};

export function getStoredAuthSession() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAuthSession;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function clearStoredAuthSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export async function signInWithSupabase(identifier: string, password: string, requestedRole: Role) {
  const email = identifier.trim();
  if (!email.includes("@")) throw new Error("Use your Supabase login email address.");

  const data = await authRequest<SupabaseSessionResponse>("token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!data.access_token || !data.user) throw new Error("Supabase did not return a valid session.");

  const profile = await loadUserProfile(data.user.id, data.access_token);
  if (!profile) throw new Error("This account has not been given FITFYT access.");
  if (profile.active === false) throw new Error("This account has been disabled by Super Admin.");
  const user = buildAuthUser(data.user, profile);
  if (!roleMatchesLogin(user.role, requestedRole)) {
    throw new Error(`This account must use the ${loginLabel(user.role)} login tab.`);
  }
  storeAuthSession({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    user,
  });
  return user;
}

export async function restoreSupabaseAuth() {
  const session = getStoredAuthSession();
  if (!session) return null;

  if (session.expiresAt < Date.now() + 30000 && session.refreshToken) {
    try {
      return await refreshSupabaseAuth(session.refreshToken);
    } catch {
      clearStoredAuthSession();
      return null;
    }
  }

  try {
    const data = await authRequest<SupabaseSessionResponse["user"]>(
      "user",
      { method: "GET" },
      session.accessToken,
    );
    if (!data?.id) throw new Error("Session user not found.");
    const profile = await loadUserProfile(data.id, session.accessToken);
    if (!profile || profile.active === false) throw new Error("Account access is unavailable.");
    const user = buildAuthUser(data, profile);
    storeAuthSession({ ...session, user });
    return user;
  } catch {
    clearStoredAuthSession();
    return null;
  }
}

export async function signOutSupabase() {
  const session = getStoredAuthSession();
  clearStoredAuthSession();
  if (!session?.accessToken) return;
  try {
    await authRequest("logout", { method: "POST" }, session.accessToken);
  } catch {
    // Local logout must still succeed if the network is unavailable.
  }
}

export async function requestPasswordReset(email: string) {
  await authRequest("recover", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

async function refreshSupabaseAuth(refreshToken: string) {
  const data = await authRequest<SupabaseSessionResponse>("token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!data.access_token || !data.user) throw new Error("Supabase refresh failed.");
  const profile = await loadUserProfile(data.user.id, data.access_token);
  if (!profile || profile.active === false) throw new Error("Account access is unavailable.");
  const user = buildAuthUser(data.user, profile);
  storeAuthSession({
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    user,
  });
  return user;
}

async function loadUserProfile(userId: string, token: string) {
  const query = `user_profiles?select=*&id=eq.${encodeURIComponent(userId)}&limit=1`;
  try {
    const rows = await restRequest<ManagedUserProfile[]>(query, token);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

function buildAuthUser(
  user: NonNullable<SupabaseSessionResponse["user"]>,
  profile: ManagedUserProfile,
): AuthUser {
  const metadata = { ...(user.user_metadata ?? {}), ...(user.app_metadata ?? {}) };
  const role = normalizeRole(profile.role ?? readString(metadata.role));
  const name =
    profile?.name ||
    readString(metadata.name) ||
    readString(metadata.full_name) ||
    user.email?.split("@")[0] ||
    "FITFYT User";

  return {
    id: user.id,
    role,
    name,
    phone: profile?.phone || user.phone || readString(metadata.phone) || user.email || "",
    email: profile?.email || user.email,
    branchId: profile?.branch_id || readString(metadata.branch_id) || readString(metadata.branchId),
    permissions: profile?.permissions || readStringArray(metadata.permissions),
  };
}

function roleMatchesLogin(actualRole: Role, requestedRole: Role) {
  if (requestedRole === "owner") return actualRole === "owner" || actualRole === "super";
  return actualRole === requestedRole;
}

function loginLabel(role: Role) {
  return role === "super" || role === "owner" ? "Owner" : role === "staff" ? "Staff" : "Member";
}

function normalizeRole(value: unknown): Role {
  if (value === "super" || value === "owner" || value === "staff" || value === "member") return value;
  if (value === "super_admin" || value === "admin") return "super";
  if (value === "branch_admin") return "owner";
  return "staff";
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : undefined;
}

function storeAuthSession(session: StoredAuthSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

async function authRequest<T>(path: string, init: RequestInit, token?: string): Promise<T> {
  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/auth/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token ?? SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) throw new Error(await response.text());
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

async function restRequest<T>(tableAndQuery: string, token: string): Promise<T> {
  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${tableAndQuery}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) throw new Error(await response.text());
  return (await response.json()) as T;
}

export async function getManagedUsers() {
  const session = requireSession();
  return restRequest<ManagedUserProfile[]>(
    "user_profiles?select=*&order=created_at.desc",
    session.accessToken,
  );
}

export async function createManagedUser(input: {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: Exclude<Role, "super">;
  branchId?: string;
  permissions: string[];
}) {
  return callUserAdmin("create", input);
}

export async function updateManagedUser(
  id: string,
  patch: {
    name?: string;
    phone?: string;
    role?: Exclude<Role, "super">;
    branchId?: string;
    permissions?: string[];
    active?: boolean;
  },
) {
  return callUserAdmin("update", { id, ...patch });
}

export async function deleteManagedUser(id: string) {
  return callUserAdmin("delete", { id });
}

async function callUserAdmin(action: string, payload: Record<string, unknown>) {
  const session = requireSession();
  const response = await fetch(
    `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/manage-users`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action, ...payload }),
    },
  );
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

function requireSession() {
  const session = getStoredAuthSession();
  if (!session?.accessToken) throw new Error("Please sign in again.");
  return session;
}
