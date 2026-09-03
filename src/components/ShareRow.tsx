import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { FaFacebookF, FaInstagram, FaWhatsapp, FaXTwitter } from "react-icons/fa6";
import { toast } from "sonner";
import { copyText, nativeShare, nativeShareFile, facebookUrl, whatsappUrl, xUrl } from "@/lib/share";
import { generateScoreCardBlob, type ScoreCardData } from "@/lib/scoreCard";
import { track } from "@/lib/analytics";

/** A share option that only opens a URL (WhatsApp/X/Facebook all have a documented web share-intent link). */
function LinkShareButton({
  href,
  icon,
  label,
  channel,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  channel: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      onClick={() => track("challenge_shared", { channel })}
      className="flex flex-col items-center gap-1.5 rounded border border-border px-3 py-3 text-[11px] font-bold tracking-wide uppercase hover:border-primary hover:bg-accent"
    >
      {icon}
      {label}
    </a>
  );
}

export function ShareRow({ text, url, card }: { text: string; url: string; card: ScoreCardData }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    track("challenge_shared", { channel: "native" });
    const ok = await nativeShare(text, url);
    if (!ok) window.open(whatsappUrl(text), "_blank", "noopener");
  };

  // Instagram has no public web share-intent URL (unlike WhatsApp/X/Facebook) —
  // the only real way to hand it an image from a website is the OS-native
  // share sheet via the Web Share API's file support. Where that's not
  // available (most desktop browsers), download the card and say so.
  const shareToInstagram = async () => {
    track("challenge_shared", { channel: "instagram" });
    const blob = await generateScoreCardBlob(card);
    if (!blob) {
      toast.error("Could not generate the score card image");
      return;
    }
    const file = new File([blob], `90s-snake-${card.score}.png`, { type: "image/png" });
    const shared = await nativeShareFile(file, text, url);
    if (shared) return;

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Score card saved — open Instagram and post it from your gallery");
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={share}
        className="flex w-full items-center justify-center gap-2 rounded border border-primary bg-primary px-4 py-3 text-sm font-bold tracking-wide text-primary-foreground uppercase"
      >
        <Share2 className="h-4 w-4" aria-hidden />
        Share my score
      </button>

      <div className="grid grid-cols-5 gap-2">
        <LinkShareButton
          href={whatsappUrl(text)}
          channel="whatsapp"
          label="WhatsApp"
          icon={<FaWhatsapp className="h-5 w-5 text-[#25D366]" aria-hidden />}
        />
        <LinkShareButton
          href={xUrl(text)}
          channel="x"
          label="X"
          icon={<FaXTwitter className="h-5 w-5" aria-hidden />}
        />
        <LinkShareButton
          href={facebookUrl(url)}
          channel="facebook"
          label="Facebook"
          icon={<FaFacebookF className="h-5 w-5 text-[#1877F2]" aria-hidden />}
        />
        <button
          type="button"
          onClick={() => void shareToInstagram()}
          className="flex flex-col items-center gap-1.5 rounded border border-border px-3 py-3 text-[11px] font-bold tracking-wide uppercase hover:border-primary hover:bg-accent"
        >
          <FaInstagram className="h-5 w-5 text-[#E4405F]" aria-hidden />
          Instagram
        </button>
        <button
          type="button"
          onClick={async () => {
            setCopied(await copyText(url));
            track("challenge_shared", { channel: "copy" });
            setTimeout(() => setCopied(false), 1800);
          }}
          className="flex flex-col items-center gap-1.5 rounded border border-border px-3 py-3 text-[11px] font-bold tracking-wide uppercase hover:border-primary hover:bg-accent"
        >
          {copied ? <Check className="h-5 w-5 text-primary" aria-hidden /> : <Copy className="h-5 w-5" aria-hidden />}
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
