import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const authorization = req.headers.get("Authorization");
  if (!authorization) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const admin = createClient(url, serviceRoleKey);

  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Invalid session" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Remove user-owned uploaded objects before deleting database rows that reference them.
  const { data: mediaRows, error: mediaError } = await admin
    .from("media")
    .select("url, thumbnail_url")
    .eq("user_id", user.id);
  if (mediaError) console.warn("Could not enumerate media for deletion", mediaError);

  const byBucket: Record<string, Set<string>> = { photos: new Set(), videos: new Set() };
  const collectPath = (raw: unknown) => {
    if (typeof raw !== "string" || !raw) return;
    for (const bucket of Object.keys(byBucket)) {
      const marker = `/storage/v1/object/public/${bucket}/`;
      const index = raw.indexOf(marker);
      if (index < 0) continue;
      const encoded = raw.slice(index + marker.length).split("?")[0];
      if (!encoded) continue;
      try {
        byBucket[bucket].add(decodeURIComponent(encoded));
      } catch {
        byBucket[bucket].add(encoded);
      }
    }
  };

  for (const row of mediaRows ?? []) {
    collectPath(row.url);
    collectPath(row.thumbnail_url);
  }

  for (const [bucket, paths] of Object.entries(byBucket)) {
    const list = [...paths];
    if (!list.length) continue;
    const { error } = await admin.storage.from(bucket).remove(list);
    if (error) console.warn(`Could not remove all ${bucket} objects`, error);
  }

  const { error: cleanupError } = await userClient.rpc("delete_my_account_data", {
    p_user_id: user.id,
  });
  if (cleanupError) {
    console.error("Account data cleanup failed", cleanupError);
    return new Response(JSON.stringify({ error: "Could not delete account data" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error("Auth account deletion failed", deleteError);
    return new Response(JSON.stringify({ error: "Could not delete authentication account" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ deleted: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
