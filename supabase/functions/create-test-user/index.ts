import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(() =>
  new Response(JSON.stringify({ error: "This endpoint is disabled." }), {
    status: 410,
    headers: { "Content-Type": "application/json" },
  })
);
