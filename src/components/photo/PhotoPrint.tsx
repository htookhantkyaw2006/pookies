import type { ReactNode, Ref } from "react";
import type { Photo, PhotoBackdrop, PhotoPose } from "@/lib/data/types";
import { PookieAvatar } from "@/components/ui/PookieAvatar";

/**
 * A booth photo as a little print: the backdrop, everyone's pookie striking
 * their pose with their name underneath, and the date on the white border.
 * Plain SVG, so it can also be saved as an image.
 */

export const PRINT_WIDTH = 340;
export const PRINT_HEIGHT = 290;
const PHOTO = { x: 10, y: 10, w: 320, h: 230 };

const POSE_EMOJI: Record<PhotoPose, string> = { wave: "👋", peace: "✌️", jump: "✨", heart: "💖" };

/** A steady pseudo-random number from a string and an index, for confetti and stars. */
function scatter(seed: string, index: number): number {
  let hash = 2166136261;
  const text = `${seed}:${index}`;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 10000) / 10000;
}

function Backdrop({ kind, seed, gradientId }: { kind: PhotoBackdrop; seed: string; gradientId: string }) {
  const { x, y, w, h } = PHOTO;
  const sky: Record<PhotoBackdrop, [string, string]> = {
    garden: ["#cfe9ff", "#f2f9ff"],
    stars: ["#2b2440", "#4d3d73"],
    confetti: ["#fff4fa", "#fff9ee"],
    sunset: ["#ffb38a", "#cfbcf8"],
  };
  const extras: ReactNode[] = [];
  if (kind === "garden") {
    extras.push(
      <ellipse key="hill-1" cx={x + w * 0.25} cy={y + h + 10} rx={w * 0.45} ry={70} fill="#a9e5c8" />,
      <ellipse key="hill-2" cx={x + w * 0.8} cy={y + h + 20} rx={w * 0.45} ry={80} fill="#8fd8b5" />,
      <circle key="sun" cx={x + w - 46} cy={y + 40} r={20} fill="#ffe08a" />,
    );
    for (let i = 0; i < 9; i += 1) {
      extras.push(
        <circle
          key={`f${i}`}
          cx={x + 14 + scatter(seed, i) * (w - 28)}
          cy={y + h - 16 - scatter(seed, i + 40) * 30}
          r={4}
          fill={["#ff8fa3", "#ffe08a", "#ffffff"][i % 3]}
        />,
      );
    }
  } else if (kind === "stars") {
    extras.push(<circle key="moon" cx={x + w - 50} cy={y + 42} r={18} fill="#fff3c4" />);
    extras.push(<circle key="moon-bite" cx={x + w - 42} cy={y + 37} r={16} fill="#3a3058" />);
    for (let i = 0; i < 28; i += 1) {
      extras.push(
        <circle
          key={`s${i}`}
          cx={x + 8 + scatter(seed, i) * (w - 16)}
          cy={y + 8 + scatter(seed, i + 50) * (h * 0.6)}
          r={0.8 + scatter(seed, i + 90) * 1.6}
          fill="#fff7d6"
        />,
      );
    }
  } else if (kind === "confetti") {
    const colors = ["#ff8fa3", "#ffe08a", "#a9e5c8", "#aed6f8", "#cfbcf8"];
    for (let i = 0; i < 46; i += 1) {
      const cx = x + 6 + scatter(seed, i) * (w - 12);
      const cy = y + 6 + scatter(seed, i + 60) * (h - 12);
      extras.push(
        <rect
          key={`c${i}`}
          x={cx - 3}
          y={cy - 6}
          width={6}
          height={12}
          rx={2}
          fill={colors[i % colors.length]}
          transform={`rotate(${Math.round(scatter(seed, i + 120) * 180)} ${cx} ${cy})`}
        />,
      );
    }
  } else {
    extras.push(
      <circle key="sun" cx={x + w / 2} cy={y + h - 40} r={56} fill="#ffe08a" opacity={0.9} />,
      <rect key="sea" x={x} y={y + h - 46} width={w} height={46} fill="#ff8fa3" opacity={0.55} />,
    );
  }
  return (
    <g>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky[kind][0]} />
          <stop offset="1" stopColor={sky[kind][1]} />
        </linearGradient>
      </defs>
      <rect x={x} y={y} width={w} height={h} fill={`url(#${gradientId})`} />
      {extras}
    </g>
  );
}

export function PhotoPrint({
  photo,
  className = "",
  svgRef,
  title,
}: {
  photo: Photo;
  className?: string;
  svgRef?: Ref<SVGSVGElement>;
  /** Read out for screen readers; defaults to who is in it. */
  title?: string;
}) {
  const count = photo.people.length;
  const size = count >= 4 ? 70 : count === 3 ? 84 : 96;
  const gap = PHOTO.w / count;
  const ground = PHOTO.y + PHOTO.h - 34;
  const dark = photo.backdrop === "stars";
  const date = new Date(photo.takenAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const label = title ?? `Photo of ${photo.people.map((person) => person.name).join(", ")}`;
  const idBase = `photo-${photo.id.replace(/[^a-zA-Z0-9-]/g, "")}`;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${PRINT_WIDTH} ${PRINT_HEIGHT}`}
      role="img"
      aria-label={label}
      className={className}
      fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
    >
      <rect width={PRINT_WIDTH} height={PRINT_HEIGHT} rx={8} fill="#ffffff" />
      <clipPath id={`${idBase}-clip`}>
        <rect x={PHOTO.x} y={PHOTO.y} width={PHOTO.w} height={PHOTO.h} rx={4} />
      </clipPath>
      <g clipPath={`url(#${idBase}-clip)`}>
        <Backdrop kind={photo.backdrop} seed={photo.id} gradientId={`${idBase}-sky`} />
        {photo.people.map((person, index) => {
          const cx = PHOTO.x + gap * (index + 0.5);
          const lift = person.pose === "jump" ? 16 : 0;
          const top = ground - size - lift;
          const first = person.name.split(" ")[0];
          return (
            <g key={person.id}>
              <ellipse cx={cx} cy={ground - 2} rx={size * (lift ? 0.26 : 0.34)} ry={6} fill="#2b2233" opacity={0.16} />
              <g transform={`translate(${cx - size / 2} ${top})`}>
                <PookieAvatar avatar={person.avatar} size={size} />
              </g>
              <text
                x={cx + size * 0.36}
                y={top + size * 0.28}
                fontSize={size * 0.3}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {POSE_EMOJI[person.pose]}
              </text>
              <rect
                x={cx - Math.min(gap, 90) / 2 + 4}
                y={ground + 6}
                width={Math.min(gap, 90) - 8}
                height={20}
                rx={10}
                fill={dark ? "#ffffff" : "#2b2233"}
                opacity={0.85}
              />
              <text
                x={cx}
                y={ground + 16.5}
                fontSize={11}
                fontWeight={700}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={dark ? "#2b2233" : "#ffffff"}
              >
                {first.length > 11 ? `${first.slice(0, 10)}…` : first}
              </text>
            </g>
          );
        })}
      </g>
      <text x={PHOTO.x + 4} y={PRINT_HEIGHT - 22} fontSize={13} fontWeight={700} fill="#6b4ee6">
        Pookies
      </text>
      <text x={PRINT_WIDTH - PHOTO.x - 4} y={PRINT_HEIGHT - 22} fontSize={12} fontWeight={600} fill="#6a6074" textAnchor="end">
        {date}
      </text>
    </svg>
  );
}

/** Saves a print as a PNG in the downloads folder. */
export async function savePrint(svg: SVGSVGElement, takenAt: number): Promise<void> {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  copy.setAttribute("width", String(PRINT_WIDTH * 2));
  copy.setAttribute("height", String(PRINT_HEIGHT * 2));
  copy.removeAttribute("class");
  const xml = new XMLSerializer().serializeToString(copy);
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = PRINT_WIDTH * 2;
  canvas.height = PRINT_HEIGHT * 2;
  canvas.getContext("2d")?.drawImage(image, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `pookies-photo-${new Date(takenAt).toISOString().slice(0, 10)}.png`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
