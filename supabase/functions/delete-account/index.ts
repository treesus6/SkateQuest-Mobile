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

  // Delete every object stored under the app's folder/user-id ownership convention.
  // The service-role client is required so cleanup does not depend on the user's
  // storage policies. Fail closed: never report account deletion as successful
  // when object enumeration or deletion is incomplete.
  const buckets = ["quest-proofs", "skatetv-clips", "user-avatars", "spot-photos"] as const;
  const pageSize = 100;

  const listAll = async (bucket: string, path: string) => {
    const entries: Array<{ id?: string | null; name: string }> = [];
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await admin.storage.from(bucket).list(path, {
        limit: pageSize,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) throw new Error(`Could not enumerate ${bucket}/${path}: ${error.message}`);
      entries.push(...(data ?? []));
      if ((data?.length ?? 0) < pageSize) break;
    }
    return entries;
  };

  const collectFiles = async (bucket: string, path: string): Promise<string[]> => {
    const files: string[] = [];
    for (const entry of await listAll(bucket, path)) {
      const objectPath = path ? `${path}/${entry.name}` : entry.name;
      if (entry.id == null) files.push(...await collectFiles(bucket, objectPath));
      else files.push(objectPath);
    }
    return files;
  };

  try {
    for (const bucket of buckets) {
      // Uploads are written as <feature-folder>/<user-id>/<filename>.
      const rootFolders = (await listAll(bucket, "")).filter((entry) => entry.id == null);
      const ownedPaths: string[] = [];
      for (const folder of rootFolders) {
        ownedPaths.push(...await collectFiles(bucket, `${folder.name}/${user.id}`));
      }
      for (let index = 0; index < ownedPaths.length; index += pageSize) {
        const { error } = await admin.storage
          .from(bucket)
          .remove(ownedPaths.slice(index, index + pageSize));
        if (error) throw new Error(`Could not delete ${bucket} objects: ${error.message}`);
      }
    }
  } catch (error) {
    console.error("Account storage cleanup failed", error);
    return new Response(JSON.stringify({ error: "Could not delete uploaded account data" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
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
