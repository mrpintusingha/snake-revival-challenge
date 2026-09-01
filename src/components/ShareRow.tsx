import { useState } from "react";
import { copyText, nativeShare, facebookUrl, whatsappUrl, xUrl } from "@/lib/share";
import { track } from "@/lib/analytics";

export function ShareRow({ text, url }: { text: string; url: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    track("challenge_shared", { channel: "native" });
    const ok = await nativeShare(text, url);
    if (!ok) {
      window.open(whatsappUrl(text), "_blank", "noopener");
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={share}
        className="flex-1 rounded border border-primary bg-primary px-4 py-3 text-sm font-bold tracking-wide text-primary-foreground uppercase"
      >
        Share my score
      </button>
      <a
        href={whatsappUrl(text)}
        target="_blank"
        rel="noopener"
        onClick={() => track("challenge_shared", { channel: "whatsapp" })}
        className="rounded border border-border px-4 py-3 text-sm tracking-wide uppercase hover:bg-accent"
      >
        WhatsApp
      </a>
      <a
        href={xUrl(text)}
        target="_blank"
        rel="noopener"
        onClick={() => track("challenge_shared", { channel: "x" })}
        className="rounded border border-border px-4 py-3 text-sm tracking-wide uppercase hover:bg-accent"
      >
        X
      </a>
      <a
        href={facebookUrl(url)}
        target="_blank"
        rel="noopener"
        onClick={() => track("challenge_shared", { channel: "facebook" })}
        className="rounded border border-border px-4 py-3 text-sm tracking-wide uppercase hover:bg-accent"
      >
        Facebook
      </a>
      <button
        type="button"
        onClick={async () => {
          setCopied(await copyText(url));
          track("challenge_shared", { channel: "copy" });
          setTimeout(() => setCopied(false), 1800);
        }}
        className="rounded border border-border px-4 py-3 text-sm tracking-wide uppercase hover:bg-accent"
      >
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
