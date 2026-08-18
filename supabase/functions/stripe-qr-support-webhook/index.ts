import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@^22";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json" },
});

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_QR_SUPPORT_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) return json({ error: "Webhook is not configured" }, 503);

  const signature = req.headers.get("stripe-signature") || "";
  const body = await req.text();
  const stripe = new Stripe(stripeKey);
  const cryptoProvider = Stripe.createSubtleCryptoProvider();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret, undefined, cryptoProvider);
  } catch (error) {
    console.error("Invalid Stripe webhook signature", error);
    return json({ error: "Bad signature" }, 400);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    const purchaseId = session.metadata?.purchase_id;
    const userId = session.metadata?.user_id;
    const paid = session.payment_status === "paid";
    const amountOk = session.amount_total === 200;
    const currencyOk = session.currency?.toLowerCase() === "usd";

    if (purchaseId && userId && paid && amountOk && currencyOk) {
      const { data: row, error: rowError } = await admin
        .from("qr_support_purchases")
        .select("id,user_id,amount_cents,currency,status")
        .eq("id", purchaseId)
        .single();

      if (!rowError && row && row.user_id === userId && row.amount_cents === 200 && String(row.currency).toLowerCase() === "usd" && row.status !== "refunded") {
        const paymentIntentId = typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id || null;

        await admin.from("qr_support_purchases").update({
          status: "paid",
          provider: "stripe",
          provider_checkout_id: session.id,
          provider_payment_id: paymentIntentId,
          paid_at: new Date().toISOString(),
        }).eq("id", purchaseId);

        const { data: existingCredit } = await admin
          .from("support_fund_ledger")
          .select("id")
          .eq("purchase_id", purchaseId)
          .eq("entry_type", "qr_support_purchase")
          .maybeSingle();

        if (!existingCredit) {
          const { error: ledgerError } = await admin.from("support_fund_ledger").insert({
            purchase_id: purchaseId,
            user_id: userId,
            amount_cents: 200,
            currency: "usd",
            entry_type: "qr_support_purchase",
            purpose: "skateboard_support_fund",
            description: "Paid QR Hunt purchase supporting boards, gear, and youth skate access",
          });
          if (ledgerError) console.error("Support-fund credit insert failed", ledgerError);
        }
      }
    }
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntentId = typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;

    if (paymentIntentId) {
      const { data: purchase } = await admin
        .from("qr_support_purchases")
        .select("id,user_id,amount_cents,currency")
        .eq("provider_payment_id", paymentIntentId)
        .maybeSingle();

      if (purchase) {
        await admin.from("qr_support_purchases").update({
          status: "refunded",
          refunded_at: new Date().toISOString(),
        }).eq("id", purchase.id);

        const { data: existingRefund } = await admin
          .from("support_fund_ledger")
          .select("id")
          .eq("purchase_id", purchase.id)
          .eq("entry_type", "refund")
          .maybeSingle();

        if (!existingRefund) {
          const { error: refundError } = await admin.from("support_fund_ledger").insert({
            purchase_id: purchase.id,
            user_id: purchase.user_id,
            amount_cents: Math.min(Number(charge.amount_refunded || purchase.amount_cents), Number(purchase.amount_cents)),
            currency: String(purchase.currency || "usd").toLowerCase(),
            entry_type: "refund",
            purpose: "skateboard_support_fund",
            description: "Refunded QR Hunt support purchase",
          });
          if (refundError) console.error("Support-fund refund insert failed", refundError);
        }
      }
    }
  }

  return json({ received: true });
});
