import { createFileRoute, redirect } from "@tanstack/react-router";

// The game now lives on the homepage — instantly playable, no separate
// entry screen. This route stays only so old links keep working.
export const Route = createFileRoute("/play")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
