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
            total_amount?: number;
            currency?: string;
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
              payment_reference: event.data?.payment_id ?? null,
            })
            .eq("id", bid.id)
            .eq("payment_status", "pending")
            .select("id");
          if (updated && updated.length > 0) {
            const { recordSponsorClaimActivity } = await import("@/lib/api.functions");
            await recordSponsorClaimActivity(supabaseAdmin, {
              link_url: bid.link_url,
              amount: bid.amount,
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
