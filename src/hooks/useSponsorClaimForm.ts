import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import { claimSponsorRank, fetchLinkPreview } from "@/lib/api.functions";

type Ladder = "all_time" | "daily";

/**
 * Shared claim-form state + submission logic — used by both the sponsor
 * panel's always-visible claim box and the "claim this rank" modal opened
 * from the Top Rankers column, so the actual submission path (validation,
 * the claimSponsorRank call, redirect/test-mode handling) exists exactly
 * once rather than drifting between two hand-written copies.
 */
export function useSponsorClaimForm(ladder: Ladder, floorAmount: number, onTestModeSuccess?: () => void) {
  const [linkUrl, setLinkUrl] = useState("");
  const [category, setCategory] = useState("");
  const [tagline, setTagline] = useState("");
  const [amount, setAmount] = useState(floorAmount);
  const [amountTouched, setAmountTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ title: string | null; description: string | null } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fnClaim = useServerFn(claimSponsorRank);
  const fnPreview = useServerFn(fetchLinkPreview);

  // As soon as the URL looks plausible, fetch its title/description (debounced)
  // to preview + prefill the tagline — the favicon itself needs no round trip,
  // it's derived client-side from the domain via faviconFor().
  useEffect(() => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    const trimmed = linkUrl.trim();
    if (trimmed.length < 4 || !/\.[a-z]{2,}/i.test(trimmed)) {
      setPreview(null);
      setPreviewLoading(false);
      return;
    }
    setPreviewLoading(true);
    previewTimer.current = setTimeout(() => {
      fnPreview({ data: { url: trimmed } })
        .then((res) => {
          setPreview(res);
          setTagline((current) => (current.trim() ? current : (res.description ?? res.title ?? current)));
        })
        .catch(() => setPreview(null))
        .finally(() => setPreviewLoading(false));
    }, 600);
    return () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkUrl]);

  const effectiveAmount = amountTouched ? Math.max(amount, floorAmount) : floorAmount;

  const decrement = () => {
    setAmountTouched(true);
    setAmount((a) => Math.max(floorAmount, (amountTouched ? a : floorAmount) - 1));
  };
  const increment = () => {
    setAmountTouched(true);
    setAmount((a) => (amountTouched ? a : floorAmount) + 1);
  };
  const setAmountDigits = (digits: string) => {
    setAmountTouched(true);
    setAmount(digits ? Number(digits) : 0);
  };
  const setToAmount = (n: number) => {
    setAmountTouched(true);
    setAmount(n);
  };
  const blurAmount = () => setAmount((a) => Math.max(a, floorAmount));

  const reset = () => {
    setLinkUrl("");
    setTagline("");
    setCategory("");
    setAmountTouched(false);
    setPreview(null);
  };

  /** Snaps the amount back to the (possibly new) floor without touching the rest of the form — used when switching ladders. */
  const resetAmount = () => setAmountTouched(false);

  const claim = async (targetAmount: number) => {
    if (linkUrl.trim().length < 4) {
      toast.error("Add your URL or @handle first");
      return;
    }
    if (tagline.trim().length < 4) {
      toast.error("Add a short tagline");
      return;
    }
    if (!category) {
      toast.error("Choose a category");
      return;
    }
    setBusy(true);
    track("sponsor_claim_clicked", { amount: targetAmount, ladder });
    try {
      const res = await fnClaim({
        data: {
          linkUrl: linkUrl.trim(),
          category,
          tagline: tagline.trim(),
          amount: targetAmount,
          ladderType: ladder,
        },
      });
      if (res.mode === "redirect") {
        window.location.href = res.url;
        return;
      }
      toast.success("Claim confirmed (test mode)");
      track("sponsor_claim_completed", { mode: "test", ladder });
      reset();
      onTestModeSuccess?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not place your claim");
    } finally {
      setBusy(false);
    }
  };

  return {
    linkUrl,
    setLinkUrl,
    category,
    setCategory,
    tagline,
    setTagline,
    amount,
    amountTouched,
    effectiveAmount,
    decrement,
    increment,
    setAmountDigits,
    setToAmount,
    blurAmount,
    busy,
    preview,
    previewLoading,
    claim,
    reset,
    resetAmount,
  };
}
