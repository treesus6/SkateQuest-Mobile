import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(supabaseUrl, serviceRoleKey);

const REPEAT_COOLDOWN_DAYS = 14;
const DAILY_MISSION_COUNT = 3;
const WEEKLY_MISSION_COUNT = 2;
const SKILL_ORDER = ["beginner", "intermediate", "advanced", "pro"];

type Template = {
  id: string;
  key: string;
  category: string;
  cadence: "daily" | "weekly";
  title_template: string;
  description_template: string | null;
  requirement_type: string;
  requirement_value_min: number;
  requirement_value_max: number;
  min_skill_level: string | null;
  max_skill_level: string | null;
  base_xp_reward: number;
  needs_geolocation: boolean;
  weight: number;
};

function skillEligible(userSkill: string | null, min: string | null, max: string | null) {
  const idx = SKILL_ORDER.indexOf(userSkill ?? "beginner");
  const minIdx = min ? SKILL_ORDER.indexOf(min) : 0;
  const maxIdx = max ? SKILL_ORDER.indexOf(max) : SKILL_ORDER.length - 1;
  return idx >= minIdx && idx <= maxIdx;
}

function weightedPick(templates: Template[], count: number) {
  const pool = [...templates];
  const picked: Template[] = [];
  for (let i = 0; i < count && pool.length; i++) {
    const total = pool.reduce((sum, template) => sum + template.weight, 0);
    let roll = Math.random() * total;
    let idx = 0;
    for (; idx < pool.length; idx++) {
      roll -= pool[idx].weight;
      if (roll <= 0) break;
    }
    idx = Math.min(idx, pool.length - 1);
    picked.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return picked;
}

const rollValue = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

function fillTemplateText(
  titleTemplate: string,
  descTemplate: string | null,
  value: number,
  meta: Record<string, unknown>
) {
  const trick = (meta.trick_name as string) ?? "trick";
  const radius = (meta.radius_miles as string) ?? "3";
  const substitute = (valueToReplace: string) =>
    valueToReplace
      .replaceAll("{n}", String(value))
      .replaceAll("{trick}", trick)
      .replaceAll("{radius}", String(radius));
  return {
    title: substitute(titleTemplate),
    description: descTemplate ? substitute(descTemplate) : null,
  };
}

async function generateForUser(
  userId: string,
  skillLevel: string | null,
  homeParkLat: number | null,
  homeParkLng: number | null
) {
  const cutoff = new Date(Date.now() - REPEAT_COOLDOWN_DAYS * 86400000).toISOString();
  const { data: recentKeys } = await admin
    .from("user_mission_history")
    .select("template_key")
    .eq("user_id", userId)
    .gte("assigned_at", cutoff);

  const excluded = new Set(
    (recentKeys ?? []).map((row: { template_key: string }) => row.template_key)
  );

  const { data: allTemplates } = await admin
    .from("mission_templates")
    .select("*")
    .eq("active", true);

  if (!allTemplates) return { daily: 0, weekly: 0 };

  const eligible = (allTemplates as Template[]).filter(
    (template) =>
      !excluded.has(template.key) &&
      skillEligible(skillLevel, template.min_skill_level, template.max_skill_level)
  );

  const daily = weightedPick(
    eligible.filter((template) => template.cadence === "daily"),
    DAILY_MISSION_COUNT
  );
  const weekly = weightedPick(
    eligible.filter((template) => template.cadence === "weekly"),
    WEEKLY_MISSION_COUNT
  );

  let createdDaily = 0;
  let createdWeekly = 0;

  for (const template of [...daily, ...weekly]) {
    const value = rollValue(template.requirement_value_min, template.requirement_value_max);
    const meta: Record<string, unknown> =
      template.needs_geolocation && homeParkLat != null && homeParkLng != null
        ? { radius_miles: 3, near_lat: homeParkLat, near_lng: homeParkLng }
        : {};

    const { title, description } = fillTemplateText(
      template.title_template,
      template.description_template,
      value,
      meta
    );
    const expiresAt = new Date(
      Date.now() + (template.cadence === "daily" ? 86400000 : 7 * 86400000)
    ).toISOString();

    const { data: challenge, error } = await admin
      .from("challenges")
      .insert({
        title,
        description,
        trick: (meta.trick_name as string) ?? null,
        challenge_type: template.cadence.toUpperCase(),
        difficulty: Math.min(5, Math.max(1, Math.ceil(value / 3))),
        xp_reward: template.base_xp_reward + value * 5,
        mission_category: template.category,
        min_skill_level: template.min_skill_level,
        max_skill_level: template.max_skill_level,
        requirement_type: template.requirement_type,
        requirement_value: value,
        requirement_meta: meta,
        is_auto_generated: true,
        template_key: template.key,
        active: true,
        starts_at: new Date().toISOString(),
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (error || !challenge) continue;

    await admin.from("user_missions").insert({
      user_id: userId,
      challenge_id: challenge.id,
      progress_current: 0,
      progress_target: value,
      status: "active",
    });
    await admin.from("user_mission_history").insert({
      user_id: userId,
      template_key: template.key,
      challenge_id: challenge.id,
    });

    if (template.cadence === "daily") createdDaily++;
    else createdWeekly++;
  }

  return { daily: createdDaily, weekly: createdWeekly };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const authorization = req.headers.get("Authorization");
  if (!authorization) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Invalid session" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { user_id?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  if (body.user_id && body.user_id !== user.id) {
    return new Response(JSON.stringify({ error: "Not authorized" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, skill_level, home_park_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return new Response(JSON.stringify({ error: "Profile not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  let lat: number | null = null;
  let lng: number | null = null;
  if (profile.home_park_id) {
    const { data: park } = await admin
      .from("skateparks")
      .select("latitude, longitude")
      .eq("id", profile.home_park_id)
      .single();
    lat = park?.latitude ?? null;
    lng = park?.longitude ?? null;
  }

  const result = await generateForUser(user.id, profile.skill_level, lat, lng);
  return new Response(JSON.stringify({ generated_for: 1, missions_created: result }), {
    headers: { "Content-Type": "application/json" },
  });
});
