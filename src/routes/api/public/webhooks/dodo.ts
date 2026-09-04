import { createFileRoute } from "@tanstack/react-router";

/**
 * Dodo Payments webhook (Standard Webhooks signature scheme).
 * Idempotent: a repeated event for an already-succeeded payment is a no-op.
 */
export const Route = createFileRoute("/api/public/webhooks/dodo")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["DODO_WEBHOOK_SECRET"];
        if (!secret) return new Response("Webhook not configured", { status: 503 });

        const body = await request.text();
        const id = request.headers.get("webhook-id") ?? "";
        const timestamp = request.headers.get("webhook-timestamp") ?? "";
        const signatureHeader = request.headers.get("webhook-signature") ?? "";

        if (!id || !timestamp || !signatureHeader) {
          return new Response("Missing signature headers", { status: 401 });
        }
        // Reject replays older than 5 minutes.
        if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
          return new Response("Stale webhook", { status: 401 });
        }

        const keyBytes = secret.startsWith("whsec_")
          ? Uint8Array.from(atob(secret.slice(6)), (c) => c.charCodeAt(0))
          : new TextEncoder().encode(secret);
        const key = await crypto.subtle.importKey(
          "raw",
          keyBytes,
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"],
        );
        const mac = await crypto.subtle.sign(
          "HMAC",
          key,
          new TextEncoder().encode(`${id}.${timestamp}.${body}`),
        );
        const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));

        const provided = signatureHeader.split(" ").map((p) => p.split(",").pop() ?? "");
        const valid = provided.some(
          (sig) =>
            sig.length === expected.length &&
            sig.split("").reduce((acc, c, i) => acc | (c.charCodeAt(0) ^ expected.charCodeAt(i)), 0) === 0,
        );
        if (!valid) return new Response("Invalid signature", { status: 401 });

        type Payload = {
          type?: string;
          data?: {
            payment_id?: string;
            status?: string;
            metadata?: Record<string, string>;
            // total_amount/currency reflect whatever currency the buyer's
            // checkout was actually charged in (adaptive pricing can
            // localize this, e.g. INR) — never safe to read as USD cents.
            // settlement_amount/settlement_currency are Dodo's own
            // normalization to what the merchant actually receives, and
            // are what verification below relies on — minus
            // settlement_tax, since tax is a pass-through on top of the
            // bid, not part of what was bid for the rank.
            total_amount?: number;
            currency?: string;
            settlement_amount?: number;
            settlement_tax?: number;
            settlement_currency?: string;
          };
        };
        const event = JSON.parse(body) as Payload;
        const succeeded =
          event.type === "payment.succeeded" || event.data?.status === "succeeded";
        const failed = event.type === "payment.failed" || event.data?.status === "failed";

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // The sponsor ladder is the only product this webhook settles —
        // player entry is free, no checkout flow creates any other kind.
        if (event.data?.metadata?.["kind"] !== "sponsor_bid") {
          return new Response("ok (unhandled kind)", { status: 200 });
        }
        const bidId = event.data.metadata["bid_id"];
        if (!bidId) return new Response("ok (no reference)", { status: 200 });

        const { data: bid } = await supabaseAdmin
          .from("sponsor_bids")
          .select("id, payment_status, link_url, amount, ladder_type, slot_date")
          .eq("id", bidId)
          .maybeSingle();
        if (!bid) return new Response("ok (unknown bid)", { status: 200 });
        if (bid.payment_status === "succeeded") return new Response("ok (already processed)", { status: 200 });

        if (succeeded) {
          // Never trust the claimed amount blindly — verify what Dodo says
          // was actually collected, in USD, against what this bid claims
          // to have paid. Only settlement_amount/settlement_currency are
          // safe to compare: they're normalized to the merchant's payout
          // currency, unlike total_amount/currency which reflect whatever
          // the buyer's checkout was actually charged in (adaptive pricing
          // can localize this — comparing that raw figure to a USD claim
          // is exactly what caused a $2 claim to read as "$231.81" from a
          // ₹231.81 charge). Tax is subtracted out too: it's a
          // pass-through cost, not value bid for the rank — a $2 claim
          // that settles as $2.36 with $0.36 tax should activate at $2,
          // not $2.36. If USD pre-tax settlement disagrees with the
          // claim, activate at what was genuinely bid, never higher.
          let activatedAmount = bid.amount;
          const claimedCents = Math.round(bid.amount * 100);
          const settlementCents = event.data?.settlement_amount;
          const settlementTaxCents = event.data?.settlement_tax ?? 0;
          const settlementCurrency = event.data?.settlement_currency;
          if (settlementCurrency === "USD" && typeof settlementCents === "number") {
            const preTaxCents = settlementCents - settlementTaxCents;
            if (preTaxCents !== claimedCents) {
              activatedAmount = Math.max(0, preTaxCents) / 100;
              console.error(
                `[dodo webhook] amount mismatch for bid ${bid.id}: claimed $${bid.amount}, Dodo settlement (pre-tax) reports $${activatedAmount}. Activating at the settled amount.`,
              );
            }
          }

          // .eq("payment_status", "pending") makes this a no-op if a
          // redelivered/concurrent webhook (or the client's own fallback
          // poll) already won the race — .select() tells us whether THIS
          // call actually performed the transition, so the activity feed
          // never gets a duplicate entry for one payment.
          const { data: updated } = await supabaseAdmin
            .from("sponsor_bids")
            .update({
              payment_status: "succeeded",
              is_active: true,
              amount: activatedAmount,
              payment_reference: event.data?.payment_id ?? null,
            })
            .eq("id", bid.id)
            .eq("payment_status", "pending")
            .select("id");
          if (updated && updated.length > 0) {
            const { recordSponsorClaimActivity } = await import("@/lib/api.functions");
            await recordSponsorClaimActivity(supabaseAdmin, {
              link_url: bid.link_url,
              amount: activatedAmount,
              ladder_type: bid.ladder_type,
              slot_date: bid.slot_date,
            });
          }
        } else if (failed) {
          await supabaseAdmin.from("sponsor_bids").update({ payment_status: "failed" }).eq("id", bid.id);
        }
        return new Response("ok", { status: 200 });
      },
    },
  },
});
