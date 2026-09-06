import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Download, Share2, X } from "lucide-react";
import { FaFacebookF, FaWhatsapp, FaXTwitter } from "react-icons/fa6";
import { toast } from "sonner";
import { copyText, facebookUrl, nativeShare, nativeShareFile, whatsappUrl, xUrl } from "@/lib/share";
import { generateSponsorShareCardBlob, renderSponsorShareCard, type SponsorShareCardData } from "@/lib/sponsorShareCard";
import { track } from "@/lib/analytics";

export type ShareCardTarget = SponsorShareCardData;

/**
 * Opened from a sponsor listing's Share button — renders a shareable rank
 * card (canvas-drawn, no external images, so nothing here can ever hit a
 * cross-origin canvas-tainting error) and offers the same share channels
 * already used for score sharing (native share sheet, WhatsApp, X,
 * Facebook, copy link) plus a direct PNG download.
 */
export function ShareCardModal({ target, onClose }: { target: ShareCardTarget; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    renderSponsorShareCard(ctx, target);
  }, [target]);

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/#sponsor` : "";
  const shareText = `${target.domain} just claimed #${target.rank} on the Outbid for #1 leaderboard — $${target.amount.toLocaleString()}. See the board:`;

  const share = async () => {
    track("sponsor_card_shared", { channel: "native", rank: target.rank });
    const blob = await generateSponsorShareCardBlob(target);
    if (blob) {
      const file = new File([blob], `${target.domain}-rank-${target.rank}.png`, { type: "image/png" });
      if (await nativeShareFile(file, shareText, shareUrl)) return;
    }
    if (await nativeShare(shareText, shareUrl)) return;
    window.open(whatsappUrl(`${shareText}\n\n${shareUrl}`), "_blank", "noopener");
  };

  const downloadCard = async () => {
    track("sponsor_card_shared", { channel: "download", rank: target.rank });
    const blob = await generateSponsorShareCardBlob(target);
    if (!blob) {
      toast.error("Could not generate the card image");
      return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${target.domain}-rank-${target.rank}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Card saved");
  };

  const copyLink = async () => {
    const ok = await copyText(shareUrl);
    setCopied(ok);
    track("sponsor_card_shared", { channel: "copy", rank: target.rank });
    setTimeout(() => setCopied(false), 1800);
  };

  // Portal into document.body for the same reason ClaimModal does — an
  // ancestor with a CSS transform (the page's mount-in "rise" animation)
  // would otherwise trap position:fixed relative to itself instead of the
  // viewport, wherever in the tree this happens to be mounted.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="neon-border max-h-[90vh] w-full max-w-sm overflow-y-auto rounded bg-background p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <div className="px-6 text-center">
            <h2 className="pixel text-[11px] text-primary sm:text-xs">SHARE THIS RANK</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {target.domain} — #{target.rank} on the sponsor board.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-0 right-0 shrink-0 rounded-full border border-border p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded border border-border">
          <canvas ref={canvasRef} width={1080} height={1080} className="block w-full" />
        </div>

        <button
          type="button"
          onClick={() => void share()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-bold tracking-wide text-primary-foreground uppercase hover:opacity-90"
        >
          <Share2 className="h-4 w-4" aria-hidden />
          Share
        </button>

        <div className="mt-2 grid grid-cols-4 gap-2">
          <a
            href={whatsappUrl(`${shareText}\n\n${shareUrl}`)}
            target="_blank"
            rel="noopener"
            onClick={() => track("sponsor_card_shared", { channel: "whatsapp", rank: target.rank })}
            className="flex flex-col items-center gap-1.5 rounded border border-border px-2 py-3 text-[10px] font-bold tracking-wide uppercase hover:border-primary hover:bg-accent"
          >
            <FaWhatsapp className="h-5 w-5 text-[#25D366]" aria-hidden />
            WhatsApp
          </a>
          <a
            href={xUrl(`${shareText}\n\n${shareUrl}`)}
            target="_blank"
            rel="noopener"
            onClick={() => track("sponsor_card_shared", { channel: "x", rank: target.rank })}
            className="flex flex-col items-center gap-1.5 rounded border border-border px-2 py-3 text-[10px] font-bold tracking-wide uppercase hover:border-primary hover:bg-accent"
          >
            <FaXTwitter className="h-5 w-5" aria-hidden />
            X
          </a>
          <a
            href={facebookUrl(shareUrl)}
            target="_blank"
            rel="noopener"
            onClick={() => track("sponsor_card_shared", { channel: "facebook", rank: target.rank })}
            className="flex flex-col items-center gap-1.5 rounded border border-border px-2 py-3 text-[10px] font-bold tracking-wide uppercase hover:border-primary hover:bg-accent"
          >
            <FaFacebookF className="h-5 w-5 text-[#1877F2]" aria-hidden />
            Facebook
          </a>
          <button
            type="button"
            onClick={() => void downloadCard()}
            className="flex flex-col items-center gap-1.5 rounded border border-border px-2 py-3 text-[10px] font-bold tracking-wide uppercase hover:border-primary hover:bg-accent"
          >
            <Download className="h-5 w-5" aria-hidden />
            Save
          </button>
        </div>

        <button
          type="button"
          onClick={() => void copyLink()}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-xs font-bold tracking-wide uppercase hover:border-primary hover:bg-accent"
        >
          {copied ? <Check className="h-4 w-4 text-primary" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          {copied ? "Link copied" : "Copy link"}
        </button>
      </div>
    </div>,
    document.body,
  );
}
