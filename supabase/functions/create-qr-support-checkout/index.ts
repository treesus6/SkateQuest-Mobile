import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@^22";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json" },
});

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authorization = req.headers.get("Authorization");
  if (!authorization) return json({ error: "Authentication required" }, 401);

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) return json({ error: "Support QR payments are not configured yet." }, 503);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return json({ error: "Invalid session" }, 401);

  const { data: purchase, error: purchaseError } = await admin
    .from("qr_support_purchases")
    .insert({
      user_id: user.id,
      amount_cents: 200,
      currency: "usd",
      status: "pending",
      provider: "stripe",
      purpose: "skateboard_support_fund",
    })
    .select("id")
    .single();
  if (purchaseError || !purchase) return json({ error: "Could not create support purchase" }, 500);

  const stripe = new Stripe(stripeKey);
  const baseUrl = (Deno.env.get("SKATEQUEST_PUBLIC_URL") || "https://treesus6.github.io/SkateQuest-Mobile").replace(/\/$/, "");

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: purchase.id,
      metadata: {
        purchase_id: purchase.id,
        user_id: user.id,
        purpose: "skateboard_support_fund",
      },
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: 200,
          product_data: {
            name: "SkateQuest QR Hunt",
            description: "One paid trick QR Hunt. Funds are tracked in SkateQuest's skateboard support fund for boards, gear, and youth skate access.",
          },
        },
      }],
      success_url: `${baseUrl}/hide-qr-code?support=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/hide-qr-code?support=cancelled`,
    });

    await admin.from("qr_support_purchases").update({ provider_checkout_id: session.id }).eq("id", purchase.id);
    return json({ checkout_url: session.url, purchase_id: purchase.id });
  } catch (error) {
    await admin.from("qr_support_purchases").update({ status: "failed" }).eq("id", purchase.id);
    console.error("Stripe checkout creation failed", error);
    return json({ error: "Could not start checkout" }, 500);
  }
});
