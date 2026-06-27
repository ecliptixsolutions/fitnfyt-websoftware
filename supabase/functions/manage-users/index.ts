import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authorization = request.headers.get("Authorization") ?? "";
    const accessToken = authorization.replace(/^Bearer\s+/i, "");
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: callerData, error: callerError } = await admin.auth.getUser(accessToken);
    if (callerError || !callerData.user) throw new Error("Unauthorized");

    const { data: callerProfile } = await admin
      .from("user_profiles")
      .select("role,active")
      .eq("id", callerData.user.id)
      .single();
    if (callerProfile?.role !== "super" || callerProfile.active === false) {
      throw new Error("Only Super Admin can manage login access");
    }

    const body = await request.json();
    if (body.action === "create") {
      const email = String(body.email ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");
      const name = String(body.name ?? "").trim();
      if (!email || !name || password.length < 8) {
        throw new Error("Name, email, and an 8-character password are required");
      }

      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role: body.role, branch_id: body.branchId },
      });
      if (error || !data.user) throw error ?? new Error("Account creation failed");

      const { error: profileError } = await admin.from("user_profiles").upsert({
        id: data.user.id,
        email,
        phone: body.phone || null,
        name,
        role: body.role,
        branch_id: body.branchId || null,
        permissions: body.permissions ?? [],
        active: true,
      });
      if (profileError) {
        await admin.auth.admin.deleteUser(data.user.id);
        throw profileError;
      }
      return json({ ok: true, id: data.user.id });
    }

    if (body.action === "update") {
      const id = String(body.id ?? "");
      if (!id) throw new Error("User ID is required");
      const patch: Record<string, unknown> = {};
      if (body.name !== undefined) patch.name = body.name;
      if (body.phone !== undefined) patch.phone = body.phone || null;
      if (body.role !== undefined) patch.role = body.role;
      if (body.branchId !== undefined) patch.branch_id = body.branchId || null;
      if (body.permissions !== undefined) patch.permissions = body.permissions;
      if (body.active !== undefined) patch.active = body.active;
      const { error } = await admin.from("user_profiles").update(patch).eq("id", id);
      if (error) throw error;
      return json({ ok: true });
    }

    if (body.action === "delete") {
      const id = String(body.id ?? "");
      if (!id || id === callerData.user.id) throw new Error("This account cannot be deleted");
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) throw error;
      return json({ ok: true });
    }

    throw new Error("Unsupported action");
  } catch (error) {
    return json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      400,
    );
  }
});

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
