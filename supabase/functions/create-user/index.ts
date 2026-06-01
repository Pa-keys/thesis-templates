import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Role = "doctor" | "nurse" | "BHW" | "pharmacist" | "labaratory" | "admin" | "midwives";

interface CreateUserPayload {
  email: string;
  password: string;
  fullName: string;
  role: Role;
}

const ALLOWED_ROLES = new Set<Role>(["doctor", "nurse", "BHW", "pharmacist", "labaratory", "admin", "midwives"]);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isRole(value: unknown): value is Role {
  return typeof value === "string" && ALLOWED_ROLES.has(value as Role);
}

function validatePayload(value: unknown): CreateUserPayload {
  if (!value || typeof value !== "object") throw new Error("Invalid request body.");
  const body = value as Record<string, unknown>;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const role = body.role;

  if (!email || !email.includes("@")) throw new Error("A valid email address is required.");
  if (password.length < 6) throw new Error("Password must be at least 6 characters.");
  if (!fullName) throw new Error("Full name is required.");
  if (!isRole(role)) throw new Error("A valid role is required.");

  return { email, password, fullName, role };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase function secrets are not configured.");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Missing authorization header." }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return jsonResponse({ error: "Invalid session." }, 401);

    const { data: callerProfile, error: callerError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .single();

    if (callerError || callerProfile?.role !== "admin") {
      return jsonResponse({ error: "Only administrators can create users." }, 403);
    }

    const payload = validatePayload(await req.json());

    const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true,
      user_metadata: { full_name: payload.fullName },
    });

    if (createError || !createdUser.user) {
      return jsonResponse({ error: createError?.message || "Failed to create auth user." }, 400);
    }

    const { error: profileError } = await adminClient
      .from("profiles")
      .upsert({
        id: createdUser.user.id,
        email: payload.email,
        full_name: payload.fullName,
        role: payload.role,
      });

    if (profileError) {
      await adminClient.auth.admin.deleteUser(createdUser.user.id);
      return jsonResponse({ error: `Auth user rolled back. Profile creation failed: ${profileError.message}` }, 400);
    }

    return jsonResponse({
      user: {
        id: createdUser.user.id,
        email: payload.email,
        full_name: payload.fullName,
        role: payload.role,
      },
    }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected create-user failure.";
    return jsonResponse({ error: message }, 400);
  }
});
