import {
  AVATAR_COLORS,
  AVATAR_SHAPES,
  type AvatarColor,
  type AvatarShape,
  type AvatarStyle,
} from "@/lib/data/types";
import { PookieAvatar } from "./PookieAvatar";

const COLOR_NAMES: Record<AvatarColor, string> = {
  peach: "Peach",
  mint: "Mint",
  sky: "Sky",
  lilac: "Lilac",
  butter: "Butter",
  rose: "Rose",
};

const SHAPE_NAMES: Record<AvatarShape, string> = {
  round: "Round",
  bear: "Bear",
  cat: "Cat",
  bunny: "Bunny",
};

const choiceClass =
  "flex cursor-pointer flex-col items-center gap-1 rounded-2xl border-2 border-line bg-surface p-2 text-xs font-bold text-ink-soft transition-colors hover:bg-sunken has-checked:border-brand has-checked:bg-brand-soft has-checked:text-brand-ink has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand";

/** Pick a pookie: its shape and its colour. Native radios underneath. */
export function AvatarPicker({
  value,
  onChange,
  name,
}: {
  value: AvatarStyle;
  onChange: (next: AvatarStyle) => void;
  /** Unique prefix for the radio groups, in case two pickers share a page. */
  name: string;
}) {
  return (
    <>
      <fieldset>
        <legend className="mb-2 text-sm font-bold text-ink">Your pookie</legend>
        <div className="grid grid-cols-4 gap-2">
          {AVATAR_SHAPES.map((shape) => (
            <label key={shape} className={choiceClass}>
              <input
                type="radio"
                name={`${name}-shape`}
                value={shape}
                checked={value.shape === shape}
                onChange={() => onChange({ ...value, shape })}
                className="sr-only"
              />
              <PookieAvatar avatar={{ color: value.color, shape }} size={44} />
              {SHAPE_NAMES[shape]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-bold text-ink">Colour</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {AVATAR_COLORS.map((color) => (
            <label key={color} className={choiceClass}>
              <input
                type="radio"
                name={`${name}-color`}
                value={color}
                checked={value.color === color}
                onChange={() => onChange({ ...value, color })}
                className="sr-only"
              />
              <PookieAvatar avatar={{ color, shape: value.shape }} size={36} />
              {COLOR_NAMES[color]}
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}
