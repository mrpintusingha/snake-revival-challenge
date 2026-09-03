import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Real "how many people are on the site right now" via Supabase Realtime
 * Presence — a pure ephemeral pub/sub channel, no database table or polling.
 * Every open tab tracks itself with a random key; every connected client
 * sees the live roster the moment anyone joins or leaves.
 */
export function useOnlinePresence(): number | null {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const key = crypto.randomUUID();
    const channel = supabase.channel("site-presence", {
      config: { presence: { key } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        setCount(Object.keys(channel.presenceState()).length);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return count;
}
