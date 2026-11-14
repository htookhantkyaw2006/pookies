import type { AvatarColor } from "@/lib/data/types";

/** Body and shading colour for each avatar colour, shared by the 2D and 3D characters. */
export const AVATAR_PALETTE: Record<AvatarColor, { body: string; shade: string }> = {
  peach: { body: "#ffc4a3", shade: "#f59e75" },
  mint: { body: "#a9e5c8", shade: "#74c9a0" },
  sky: { body: "#aed6f8", shade: "#7bb5e6" },
  lilac: { body: "#cfbcf8", shade: "#a68aea" },
  butter: { body: "#ffe08a", shade: "#efc04a" },
  rose: { body: "#ffb5c9", shade: "#f388a6" },
};
