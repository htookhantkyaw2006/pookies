import { memo, type ReactNode } from "react";
import type { PlantMood } from "@/lib/data/rules";
import {
  OFFICE_MAP,
  TILE,
  mapPixelSize,
  sitPoint,
  type Furniture,
  type Seat,
  type ZoneKind,
} from "@/lib/world/map";

/**
 * The office drawn from above: floors, walls and furniture. Decorative, and
 * only redrawn when a plant's mood changes.
 */

const T = TILE;
const WALL = "#5b4a63";
const WALL_FACE = "#463850";
const WOOD = "#ecd0a8";
const WOOD_EDGE = "#d6b184";
const SCREEN = "#3b3247";

const FLOOR: Record<ZoneKind, string> = {
  desks: "url(#floor-wood)",
  focus: "#dfe8f4",
  meeting: "#e9e1f8",
  kitchen: "url(#floor-tiles)",
  lounge: "#fbe6d6",
  game: "#e8defb",
  wash: "url(#floor-wash)",
  nap: "#d9d3ea",
  garden: "url(#floor-grass)",
  personal: "#efe4f7",
};

const LABELS: Record<ZoneKind, { x: number; y: number; anchor: "start" | "end" }> = {
  desks: { x: 12.3, y: 8.75, anchor: "start" },
  focus: { x: 3.4, y: 4.3, anchor: "start" },
  meeting: { x: 11.35, y: 6.7, anchor: "start" },
  kitchen: { x: 30.7, y: 6.7, anchor: "end" },
  lounge: { x: 22.3, y: 15.8, anchor: "start" },
  game: { x: 32.4, y: 6.7, anchor: "start" },
  wash: { x: 30.6, y: 25.7, anchor: "end" },
  nap: { x: 1.4, y: 25.7, anchor: "start" },
  garden: { x: 38.2, y: 14.7, anchor: "start" },
  personal: { x: 9.4, y: 25.7, anchor: "start" },
};

const LEAVES: Record<PlantMood, [string, string, string]> = {
  fresh: ["#3fae78", "#2f9a66", "#5fd294"],
  fine: ["#4fb283", "#3fa173", "#69c898"],
  thirsty: ["#a8b46a", "#97a35c", "#bcc47c"],
};

/** A potted plant. Fresh ones flower; thirsty ones droop and fade. */
function Plant({ x, y, mood }: { x: number; y: number; mood: PlantMood }) {
  const cx = x + T / 2;
  const cy = y + T / 2;
  const [left, right, middle] = LEAVES[mood];
  const droop = mood === "thirsty";
  const tilt = droop ? 55 : 28;
  const leafLength = droop ? 11 : 14;
  return (
    <g>
      <circle cx={cx} cy={cy + 6} r={14} fill="#c98b5e" />
      <circle cx={cx} cy={cy + 6} r={10} fill={droop ? "#a88a72" : "#8a6248"} />
      <ellipse cx={cx - 9} cy={cy - 1} rx={8} ry={leafLength} fill={left} transform={`rotate(${-tilt} ${cx - 9} ${cy - 1})`} />
      <ellipse cx={cx + 9} cy={cy - 1} rx={8} ry={leafLength} fill={right} transform={`rotate(${tilt} ${cx + 9} ${cy - 1})`} />
      <ellipse cx={cx} cy={droop ? cy - 4 : cy - 8} rx={8} ry={droop ? 11 : 15} fill={middle} />
      {mood === "fresh" && (
        <>
          <circle cx={cx - 6} cy={cy - 17} r={4.5} fill="#ff8fa3" />
          <circle cx={cx + 7} cy={cy - 12} r={4} fill="#ffe08a" />
          <circle cx={cx - 6} cy={cy - 17} r={1.6} fill="#fff6c9" />
        </>
      )}
    </g>
  );
}

/** A screen and keyboard; `chairAbove` puts the keyboard on the upper edge. */
function Workstation({ cx, y, chairAbove }: { cx: number; y: number; chairAbove: boolean }) {
  const keyboardY = chairAbove ? y + 7 : y + 33;
  const screenY = chairAbove ? y + 24 : y + 14;
  return (
    <g>
      <rect x={cx - 21} y={screenY} width={42} height={9} rx={3} fill={SCREEN} />
      <rect x={cx - 15} y={keyboardY} width={30} height={7} rx={2.5} fill="#fff" opacity={0.85} />
    </g>
  );
}

const CHAIR_COLORS: Partial<Record<ZoneKind, { seat: string; back: string }>> = {
  desks: { seat: "#a597f3", back: "#7a68e0" },
  focus: { seat: "#97c6ee", back: "#5f9fd6" },
  meeting: { seat: "#f6b3c5", back: "#e3809b" },
};

/** Office chairs and stools, seen from above. Sofas and beanbags are drawn as furniture. */
function drawSeat(seat: Seat): ReactNode {
  const point = sitPoint(seat);
  const x = point.x * T;
  const y = point.y * T;
  if (seat.kind === "stool") {
    return (
      <g key={seat.id}>
        <circle cx={x} cy={y - 10} r={14} fill="#2b2233" opacity={0.08} />
        <circle cx={x} cy={y - 13} r={13} fill="#f6c56b" stroke="#e0a83f" strokeWidth={2.5} />
        <circle cx={x - 3} cy={y - 16} r={4.5} fill="#fff" opacity={0.45} />
      </g>
    );
  }
  if (seat.kind !== "chair") return null;
  const colors = CHAIR_COLORS[seat.zone] ?? CHAIR_COLORS.desks!;
  const backY = seat.facing === "up" ? y - 4 : y - 38;
  return (
    <g key={seat.id}>
      <circle cx={x} cy={y - 12} r={16} fill="#2b2233" opacity={0.08} />
      <rect x={x - 15} y={y - 29} width={30} height={25} rx={9} fill={colors.seat} />
      <rect x={x - 10} y={y - 24} width={20} height={6} rx={3} fill="#fff" opacity={0.3} />
      <rect x={x - 18} y={backY} width={36} height={11} rx={5.5} fill={colors.back} />
    </g>
  );
}

function drawFurniture(item: Furniture, moods: Record<string, PlantMood>): ReactNode {
  const x = item.rect.x * T;
  const y = item.rect.y * T;
  const w = item.rect.w * T;
  const h = item.rect.h * T;

  switch (item.kind) {
    case "pod":
      return (
        <g key={item.id}>
          <rect x={x + 2} y={y + 2} width={w - 4} height={h - 4} rx={14} fill={WOOD} stroke={WOOD_EDGE} strokeWidth={2.5} />
          <path d={`M${x + 12} ${y + h / 2} H${x + w - 12} M${x + w / 2} ${y + 10} V${y + h - 10}`} stroke={WOOD_EDGE} strokeWidth={2.5} strokeLinecap="round" />
          <Workstation cx={x + T} y={y} chairAbove />
          <Workstation cx={x + 3 * T} y={y} chairAbove />
          <Workstation cx={x + T} y={y + T} chairAbove={false} />
          <Workstation cx={x + 3 * T} y={y + T} chairAbove={false} />
          <circle cx={x + 2 * T - 14} cy={y + 20} r={5} fill="#ff8fa3" />
          <rect x={x + 2 * T + 8} y={y + T + 14} width={11} height={11} rx={2} fill="#ffe08a" />
        </g>
      );
    case "desk": {
      const chairAbove = item.flip === true;
      return (
        <g key={item.id}>
          <rect x={x + 3} y={y + 3} width={w - 6} height={h - 6} rx={10} fill={WOOD} stroke={WOOD_EDGE} strokeWidth={2.5} />
          <Workstation cx={x + w / 2} y={y} chairAbove={chairAbove} />
          <circle cx={x + w - 16} cy={y + h / 2} r={6} fill="#ffe08a" stroke="#efc04a" strokeWidth={2} />
        </g>
      );
    }
    case "meetingTable":
      return (
        <g key={item.id}>
          <rect x={x + 4} y={y + 6} width={w - 8} height={h - 12} rx={34} fill="#f1dbbb" stroke={WOOD_EDGE} strokeWidth={2.5} />
          <rect x={x + 50} y={y + 28} width={30} height={20} rx={3} fill="#fff" transform={`rotate(-8 ${x + 65} ${y + 38})`} />
          <rect x={x + 150} y={y + 44} width={30} height={20} rx={3} fill="#fff" transform={`rotate(6 ${x + 165} ${y + 54})`} />
          <rect x={x + 100} y={y + 36} width={36} height={22} rx={4} fill={SCREEN} />
          <circle cx={x + 196} cy={y + 30} r={6} fill="#a9e5c8" />
        </g>
      );
    case "counter":
      return (
        <g key={item.id}>
          <rect x={x + 2} y={y + 2} width={w - 4} height={h - 8} rx={8} fill="#ffffff" stroke="#c3ddd0" strokeWidth={2.5} />
          <rect x={x + 18} y={y + 9} width={50} height={24} rx={7} fill="#cfe0ea" stroke="#a9c3d1" strokeWidth={2} />
          <circle cx={x + 43} cy={y + 14} r={3} fill="#8ba9ba" />
          <rect x={x + 96} y={y + 6} width={34} height={30} rx={6} fill={SCREEN} />
          <circle cx={x + 113} cy={y + 15} r={4} fill="#e5484d" />
          <rect x={x + 104} y={y + 24} width={18} height={8} rx={2} fill="#6a5c78" />
          <circle cx={x + 152} cy={y + 20} r={7} fill="#ffb5c9" />
          <circle cx={x + 172} cy={y + 20} r={7} fill="#aed6f8" />
          <circle cx={x + 192} cy={y + 20} r={7} fill="#ffe08a" />
          <ellipse cx={x + 244} cy={y + 20} rx={22} ry={12} fill="#f1dbbb" stroke={WOOD_EDGE} strokeWidth={2} />
          <circle cx={x + 237} cy={y + 18} r={6} fill="#f2a31b" />
          <circle cx={x + 250} cy={y + 21} r={6} fill="#e5484d" />
        </g>
      );
    case "fridge":
      return (
        <g key={item.id}>
          <rect x={x + 4} y={y + 2} width={w - 8} height={h - 8} rx={8} fill="#e9eff4" stroke="#bccbd6" strokeWidth={2.5} />
          <path d={`M${x + w / 2} ${y + 6} V${y + h - 10}`} stroke="#bccbd6" strokeWidth={2.5} />
          <path d={`M${x + w / 2 - 8} ${y + 14} V${y + 28} M${x + w / 2 + 8} ${y + 14} V${y + 28}`} stroke="#8fa3b1" strokeWidth={3} strokeLinecap="round" />
        </g>
      );
    case "roundTable":
      return (
        <g key={item.id}>
          <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2 - 6} ry={h / 2 - 3} fill="#f1dbbb" stroke={WOOD_EDGE} strokeWidth={2.5} />
          <circle cx={x + w / 2 - 16} cy={y + h / 2} r={6} fill="#fff" stroke="#d9c7b3" strokeWidth={2} />
          <circle cx={x + w / 2 + 16} cy={y + h / 2 - 2} r={6} fill="#ffb5c9" />
        </g>
      );
    case "sofa": {
      const backY = item.flip ? y + h - 18 : y + 2;
      const seatY = item.flip ? y + 2 : y + 12;
      return (
        <g key={item.id}>
          <rect x={x + 2} y={backY} width={w - 4} height={16} rx={8} fill="#8f73df" />
          <rect x={x + 2} y={seatY} width={w - 4} height={h - 14} rx={12} fill="#b8a2f0" />
          <path d={`M${x + w / 2} ${seatY + 5} V${seatY + h - 19}`} stroke="#9c84e4" strokeWidth={2.5} strokeLinecap="round" />
          <rect x={x + 2} y={y + 2} width={14} height={h - 4} rx={7} fill="#8f73df" />
          <rect x={x + w - 16} y={y + 2} width={14} height={h - 4} rx={7} fill="#8f73df" />
        </g>
      );
    }
    case "coffeeTable":
      return (
        <g key={item.id}>
          <rect x={x + 6} y={y + 7} width={w - 12} height={h - 14} rx={12} fill={WOOD} stroke={WOOD_EDGE} strokeWidth={2.5} />
          <rect x={x + 22} y={y + 15} width={24} height={17} rx={2} fill="#ff8fa3" transform={`rotate(-10 ${x + 34} ${y + 23})`} />
          <circle cx={x + w - 26} cy={y + h / 2} r={6} fill="#fff" stroke="#d9c7b3" strokeWidth={2} />
        </g>
      );
    case "beanbag":
      return (
        <g key={item.id}>
          <ellipse cx={x + T / 2} cy={y + T / 2 + 2} rx={22} ry={20} fill={item.id.endsWith("1") ? "#ffc4a3" : "#a9e5c8"} />
          <ellipse cx={x + T / 2} cy={y + T / 2 - 2} rx={13} ry={10} fill="#fff" opacity={0.35} />
        </g>
      );
    case "gameTable":
      return (
        <g key={item.id}>
          <rect x={x + 3} y={y + 4} width={w - 6} height={h - 10} rx={6} fill="#3fa173" stroke="#2f8660" strokeWidth={2.5} />
          <rect x={x + 9} y={y + 10} width={w - 18} height={h - 22} rx={2} fill="none" stroke="#fff" strokeWidth={1.5} opacity={0.8} />
          <path d={`M${x + w / 2} ${y + 2} V${y + h - 4}`} stroke="#fff" strokeWidth={3} />
          <circle cx={x + w / 2 + 28} cy={y + 18} r={3.5} fill="#ffe08a" />
        </g>
      );
    case "plant":
      return <Plant key={item.id} x={x} y={y} mood={moods[item.id] ?? "fine"} />;
    case "bookshelf": {
      const spines = ["#ff8fa3", "#aed6f8", "#ffe08a", "#a9e5c8", "#cfbcf8", "#ffc4a3", "#aed6f8", "#ff8fa3", "#a9e5c8", "#ffe08a"];
      return (
        <g key={item.id}>
          <rect x={x + 2} y={y + 4} width={w - 4} height={h - 12} rx={6} fill="#b98a62" stroke="#9a6f4c" strokeWidth={2.5} />
          {spines.map((fill, index) => (
            <rect key={index} x={x + 10 + index * 12.6} y={y + 10} width={9} height={h - 24} rx={2} fill={fill} />
          ))}
        </g>
      );
    }
    case "rug":
      return (
        <g key={item.id}>
          <rect x={x + 6} y={y + 6} width={w - 12} height={h - 12} rx={26} fill="#f6c3a6" opacity={0.75} />
          <rect x={x + 18} y={y + 18} width={w - 36} height={h - 36} rx={18} fill="none" stroke="#fff" strokeWidth={3} strokeDasharray="2 12" strokeLinecap="round" opacity={0.9} />
        </g>
      );
    case "whiteboard":
      return (
        <g key={item.id}>
          <rect x={x + 4} y={y + 3} width={w - 8} height={48} rx={5} fill="#ffffff" stroke="#cfc4d6" strokeWidth={2.5} />
          <rect x={x + 20} y={y + 48} width={w - 40} height={5} rx={2.5} fill="#cfc4d6" />
          <circle cx={x + 30} cy={y + 50.5} r={2.5} fill="#e5484d" />
          <circle cx={x + 40} cy={y + 50.5} r={2.5} fill="#6b4ee6" />
        </g>
      );
    case "doormat":
      return (
        <g key={item.id}>
          <rect x={x} y={y + h} width={w} height={20} fill="#c98b5e" />
          <rect x={x + 6} y={y + h + 3} width={w - 12} height={14} rx={3} fill="#e0a877" />
          <circle cx={x + w - 16} cy={y + h + 10} r={3} fill="#ffe08a" />
          <rect x={x + 6} y={y + h - 26} width={w - 12} height={22} rx={6} fill="#cfbcf8" />
          <text x={x + w / 2} y={y + h - 10} textAnchor="middle" fontSize={11} fontWeight={600} fill="#4a2fb8" style={{ fontFamily: "var(--font-display)" }}>
            hello!
          </text>
        </g>
      );
    case "waterCooler":
      return (
        <g key={item.id}>
          <rect x={x + 10} y={y + 10} width={28} height={30} rx={6} fill="#eef2f6" stroke="#bccbd6" strokeWidth={2} />
          <circle cx={x + T / 2} cy={y + 20} r={10} fill="#a9d8ff" stroke="#7bb5e6" strokeWidth={2} />
          <circle cx={x + 18} cy={y + 34} r={2.5} fill="#e5484d" />
          <circle cx={x + 30} cy={y + 34} r={2.5} fill="#5f9fd6" />
        </g>
      );
    case "printer":
      return (
        <g key={item.id}>
          <rect x={x + 5} y={y + 8} width={w - 10} height={30} rx={6} fill="#f4f2f7" stroke="#cfc4d6" strokeWidth={2} />
          <rect x={x + 12} y={y + 30} width={w - 24} height={12} rx={2} fill="#ffffff" stroke="#d9d2e2" strokeWidth={1.5} />
          <circle cx={x + w - 12} cy={y + 16} r={2.5} fill="#3fb37f" />
        </g>
      );
    case "floorLamp":
      return (
        <g key={item.id}>
          <circle cx={x + T / 2} cy={y + T / 2} r={15} fill="#fff1c9" opacity={0.6} />
          <circle cx={x + T / 2} cy={y + T / 2} r={10} fill="#fff4d6" stroke="#e8c97a" strokeWidth={2} />
        </g>
      );
    case "path": {
      const stones: ReactNode[] = [];
      const along = w >= h;
      const length = along ? w : h;
      for (let step = 18; step < length - 8; step += 30) {
        for (const lane of [-18, 18]) {
          const sx = along ? x + step : x + w / 2 + lane;
          const sy = along ? y + h / 2 + lane : y + step;
          stones.push(<rect key={`${step}-${lane}`} x={sx - 12} y={sy - 10} width={24} height={20} rx={8} />);
        }
      }
      return (
        <g key={item.id} fill="#ebe2d4" stroke="#d9cdbb" strokeWidth={1.5}>
          {stones}
        </g>
      );
    }
    case "tree":
      return (
        <g key={item.id}>
          <circle cx={x + T / 2} cy={y + T / 2 + 4} r={20} fill="#2b2233" opacity={0.08} />
          <circle cx={x + T / 2} cy={y + T / 2} r={20} fill="#5fb07a" />
          <circle cx={x + T / 2 - 7} cy={y + T / 2 - 6} r={10} fill="#79c48f" />
        </g>
      );
    case "picnicTable":
      return (
        <g key={item.id}>
          <rect x={x + 8} y={y + 6} width={w - 16} height={14} rx={4} fill="#c99a6c" />
          <rect x={x + 8} y={y + h - 20} width={w - 16} height={14} rx={4} fill="#c99a6c" />
          <rect x={x + 10} y={y + 26} width={w - 20} height={h - 52} rx={6} fill="#dcb38a" stroke="#a97c55" strokeWidth={2} />
          <rect x={x + w / 2 - 22} y={y + 32} width={44} height={h - 64} fill="#f6b3c5" />
        </g>
      );
    case "bench":
      return (
        <g key={item.id}>
          <rect x={x + 6} y={y + 10} width={w - 12} height={8} rx={4} fill="#a97c55" />
          <rect x={x + 6} y={y + 20} width={w - 12} height={18} rx={5} fill="#c99a6c" />
        </g>
      );
    case "log":
      return (
        <g key={item.id}>
          <rect x={x + 7} y={y + 16} width={w - 14} height={16} rx={8} fill="#9a6b4a" />
          <ellipse cx={x + 9} cy={y + 24} rx={5} ry={7} fill="#e2c39d" />
        </g>
      );
    case "firePit":
      return (
        <g key={item.id}>
          <circle cx={x + w / 2} cy={y + h / 2} r={34} fill="#b8aea4" />
          <circle cx={x + w / 2} cy={y + h / 2} r={26} fill="#6b5a50" />
          <circle cx={x + w / 2} cy={y + h / 2} r={14} fill="#ff7a45" />
          <circle cx={x + w / 2} cy={y + h / 2} r={8} fill="#ffd166" />
        </g>
      );
    case "pond":
      return (
        <g key={item.id}>
          <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2 - 6} ry={h / 2 - 6} fill="#8fd0f0" stroke="#cfc6bb" strokeWidth={6} />
          <circle cx={x + w / 2 - 28} cy={y + h / 2 - 6} r={8} fill="#6cc48a" />
          <circle cx={x + w / 2 + 22} cy={y + h / 2 + 12} r={7} fill="#6cc48a" />
          <ellipse cx={x + w / 2 + 6} cy={y + h / 2 - 10} rx={6} ry={3} fill="#ff9a4a" />
        </g>
      );
    case "flowerBed":
      return (
        <g key={item.id}>
          <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} rx={8} fill="#8a6248" stroke="#a97c55" strokeWidth={3} />
          {Array.from({ length: Math.round((w * h) / 260) }, (_, i) => (
            <circle
              key={i}
              cx={x + 12 + ((i * 37) % (w - 24))}
              cy={y + 12 + ((i * 23) % (h - 24))}
              r={5}
              fill={["#ff8fa3", "#ffe08a", "#cfbcf8", "#ffc4a3", "#ffffff"][i % 5]}
            />
          ))}
        </g>
      );
    case "stall":
      return (
        <g key={item.id}>
          <rect x={x + 3} y={y + 3} width={w - 6} height={h - 6} rx={4} fill="#eef6fb" stroke="#a9c7d8" strokeWidth={3} />
          <rect x={x + w / 2 - 14} y={y + 10} width={28} height={16} rx={6} fill="#ffffff" stroke="#cfdbe3" strokeWidth={2} />
          <ellipse cx={x + w / 2} cy={y + 42} rx={16} ry={14} fill="#ffffff" stroke="#cfdbe3" strokeWidth={2} />
          <rect x={x + 8} y={y + h - 9} width={w - 16} height={6} rx={3} fill="#a9c7d8" />
        </g>
      );
    case "sinkCounter":
      return (
        <g key={item.id}>
          <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} rx={6} fill="#ffffff" stroke="#cfdbe3" strokeWidth={2} />
          <ellipse cx={x + w / 2} cy={y + h / 2 - 30} rx={13} ry={10} fill="#e3eef5" stroke="#b9c4cc" strokeWidth={2} />
          <ellipse cx={x + w / 2} cy={y + h / 2 + 30} rx={13} ry={10} fill="#e3eef5" stroke="#b9c4cc" strokeWidth={2} />
        </g>
      );
    case "shower":
      return (
        <g key={item.id}>
          <rect x={x + 5} y={y + 5} width={w - 10} height={h - 10} rx={8} fill="#e6f5fc" stroke="#9fd2ea" strokeWidth={3} />
          <circle cx={x + w - 20} cy={y + 20} r={9} fill="#b9c4cc" />
          <circle cx={x + 30} cy={y + h - 26} r={6} fill="#ffe08a" />
        </g>
      );
    case "napPod":
      return (
        <g key={item.id}>
          <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} rx={18} fill="#b9a8e6" />
          <rect x={x + 9} y={y + 30} width={w - 18} height={h - 40} rx={10} fill="#8fa5e8" />
          <rect x={x + 12} y={y + 12} width={w - 24} height={14} rx={6} fill="#ffffff" />
        </g>
      );
    case "breathMat":
      return (
        <g key={item.id}>
          <circle cx={x + w / 2} cy={y + h / 2} r={w / 2 - 6} fill="#c9bff2" />
          <circle cx={x + w / 2} cy={y + h / 2} r={w / 2 - 22} fill="#e6dffb" />
          <circle cx={x + w / 2} cy={y + h / 2} r={10} fill="#cfbcf8" />
        </g>
      );
    case "floorCushion":
      return (
        <g key={item.id}>
          <rect x={x + 9} y={y + 9} width={w - 18} height={h - 18} rx={10} fill={item.id.endsWith("1") ? "#ffb5c9" : "#a9e5c8"} />
          <circle cx={x + w / 2} cy={y + h / 2} r={3} fill="#ffffff" />
        </g>
      );
    case "roomRug":
      return (
        <g key={item.id}>
          <rect x={x + 18} y={y + 18} width={w - 36} height={h - 36} rx={30} fill="#f3c6d6" opacity={0.8} />
          <rect x={x + 34} y={y + 34} width={w - 68} height={h - 68} rx={22} fill="#fbe3ec" />
        </g>
      );
    case "armchair":
      return (
        <g key={item.id}>
          <circle cx={x + w / 2} cy={y + h / 2 + 6} r={30} fill="#2b2233" opacity={0.08} />
          <rect x={x + 10} y={y + 8} width={w - 20} height={h - 16} rx={14} fill="#7f98d6" />
          <rect x={x + 22} y={y + 26} width={w - 44} height={h - 36} rx={10} fill="#9fb7ea" />
          <rect x={x + w - 26} y={y + 26} width={12} height={28} rx={4} fill="#ffe08a" />
        </g>
      );
    case "sideTable":
      return (
        <g key={item.id}>
          <circle cx={x + w / 2} cy={y + h / 2} r={24} fill="#d9a77a" stroke="#b9875a" strokeWidth={3} />
          <circle cx={x + w / 2 - 7} cy={y + h / 2 - 6} r={10} fill="#ffe08a" />
          <rect x={x + w / 2 + 2} y={y + h / 2 + 2} width={14} height={18} rx={2} fill="#a597f3" />
        </g>
      );
    case "doorSign":
      return (
        <g key={item.id}>
          <rect x={x - 26} y={y + h + 4} width={28} height={14} rx={4} fill="#ffffff" stroke="#cfdbe3" strokeWidth={2} />
          <circle cx={x - 12} cy={y + h + 11} r={3.5} fill="#cdb8f0" />
        </g>
      );
    case "arcade": {
      const first = item.id.endsWith("1");
      return (
        <g key={item.id}>
          <rect x={x + 5} y={y + 2} width={w - 10} height={h - 8} rx={8} fill={first ? "#7a5fd2" : "#ff8fa3"} />
          <rect x={x + 13} y={y + 10} width={w - 26} height={24} rx={4} fill={first ? "#9fe8ff" : "#ffd27a"} />
          <rect x={x + 9} y={y + h - 22} width={w - 18} height={12} rx={4} fill="#3b3247" />
          <circle cx={x + 22} cy={y + h - 16} r={3.5} fill="#e5484d" />
          <circle cx={x + w - 22} cy={y + h - 16} r={3} fill="#ffe08a" />
        </g>
      );
    }
    case "foosball": {
      const rods: ReactNode[] = [];
      for (let i = 0; i < 6; i += 1) {
        const rx = x + 22 + (i * (w - 44)) / 5;
        rods.push(<line key={`r${i}`} x1={rx} y1={y + 8} x2={rx} y2={y + h - 8} stroke="#9a8fa6" strokeWidth={2} />);
        rods.push(<rect key={`p${i}`} x={rx - 4} y={y + h / 2 - 5} width={8} height={10} rx={2} fill={i % 2 === 0 ? "#e5484d" : "#7bb5e6"} />);
      }
      return (
        <g key={item.id}>
          <rect x={x + 6} y={y + 10} width={w - 12} height={h - 20} rx={8} fill="#c9a27a" />
          <rect x={x + 14} y={y + 16} width={w - 28} height={h - 32} rx={4} fill="#3fa173" />
          <line x1={x + w / 2} y1={y + 16} x2={x + w / 2} y2={y + h - 16} stroke="#ffffff" strokeWidth={2} />
          {rods}
        </g>
      );
    }
    case "photoBooth": {
      const stripes: ReactNode[] = [];
      for (let i = 0; i < 6; i += 1) {
        stripes.push(
          <rect key={i} x={x + 18 + i * ((w - 36) / 6)} y={y + h - 26} width={(w - 36) / 6} height={18} fill={i % 2 === 0 ? "#fbd9e6" : "#dcebfb"} />,
        );
      }
      return (
        <g key={item.id}>
          <rect x={x + 6} y={y + h - 30} width={w - 12} height={26} rx={6} fill="#f7e9ff" stroke="#c9a27a" strokeWidth={3} />
          {stripes}
          <rect x={x + w / 2 - 34} y={y + h - 36} width={68} height={12} rx={6} fill="#7a5fd2" />
          {[0, 1, 2, 3].map((i) => (
            <circle key={`spot${i}`} cx={x + 24 + i * T} cy={y + T * 1.6} r={10} fill="#ffffff" opacity={0.8} />
          ))}
        </g>
      );
    }
    case "photoCamera":
      return (
        <g key={item.id}>
          <circle cx={x + w / 2} cy={y + h / 2 + 6} r={16} fill="#2b2233" opacity={0.08} />
          <rect x={x + w / 2 - 14} y={y + h / 2 - 10} width={28} height={20} rx={6} fill="#ff8fa3" />
          <circle cx={x + w / 2} cy={y + h / 2 - 12} r={8} fill="#3b3247" />
          <circle cx={x + w / 2} cy={y + h / 2 - 12} r={4} fill="#7bb5e6" />
        </g>
      );
    case "photoWall":
      return (
        <g key={item.id}>
          <rect x={x + 6} y={y + 8} width={w - 12} height={h - 22} rx={5} fill="#d9a77a" stroke="#c9a27a" strokeWidth={3} />
          {["#fbd9e6", "#dcebfb", "#e4f6ec", "#fff1c4"].map((fill, i) => (
            <rect key={fill} x={x + 14 + i * ((w - 28) / 4)} y={y + 14} width={(w - 28) / 4 - 4} height={14} rx={2} fill={fill} stroke="#ffffff" strokeWidth={2} />
          ))}
        </g>
      );
    case "throwLine":
      return <rect key={item.id} x={x + 20} y={y + h / 2 - 3} width={w - 40} height={6} rx={3} fill="#ffe08a" />;
    case "stringLights": {
      const bulbs: ReactNode[] = [];
      for (let bx = x + 12; bx < x + w - 6; bx += 24) {
        bulbs.push(<circle key={`n${bx}`} cx={bx} cy={y + 10} r={3.5} />);
        bulbs.push(<circle key={`s${bx}`} cx={bx} cy={y + h - 10} r={3.5} />);
      }
      return (
        <g key={item.id} fill="#ffe7a8" stroke="#e8c97a" strokeWidth={1}>
          {bulbs}
        </g>
      );
    }
  }
}

function WorldMapArtInner({ plantMoods }: { plantMoods: Record<string, PlantMood> }) {
  const { width, height } = mapPixelSize(OFFICE_MAP);
  const walls: ReactNode[] = [];
  const faces: ReactNode[] = [];
  const lawn: ReactNode[] = [];
  const hedges: ReactNode[] = [];
  OFFICE_MAP.layout.forEach((row, r) => {
    for (let c = 0; c < row.length; c += 1) {
      if (row[c] === "g") {
        lawn.push(<rect key={`${c}-${r}`} x={c * T} y={r * T} width={T} height={T} />);
        continue;
      }
      if (row[c] === "h") {
        hedges.push(<rect key={`${c}-${r}`} x={c * T + 3} y={r * T + 1} width={T - 6} height={T - 2} rx={16} />);
        continue;
      }
      if (row[c] !== "#") continue;
      walls.push(<rect key={`${c}-${r}`} x={c * T} y={r * T} width={T} height={T} />);
      // A darker strip where a wall faces the floor below it gives a little depth.
      if (OFFICE_MAP.layout[r + 1]?.[c] === ".") {
        faces.push(<rect key={`${c}-${r}`} x={c * T} y={(r + 1) * T - 12} width={T} height={12} />);
      }
    }
  });

  // Flat things (rugs, paths) go under everything else.
  const flat = (item: Furniture) =>
    item.kind === "rug" || item.kind === "roomRug" || item.kind === "path" || item.kind === "throwLine";
  const floorItems = OFFICE_MAP.furniture.filter(flat);
  const otherItems = OFFICE_MAP.furniture.filter((item) => !flat(item));

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className="absolute top-0 left-0 block max-w-none select-none"
    >
      <defs>
        <pattern id="floor-wood" width={96} height={32} patternUnits="userSpaceOnUse">
          <rect width={96} height={32} fill="#f6e3ca" />
          <path d="M0 0.5 H96 M0 16.5 H96 M30 0 V16 M78 16 V32" stroke="#ead0ae" strokeWidth={1.5} />
        </pattern>
        <pattern id="floor-grass" width={48} height={48} patternUnits="userSpaceOnUse">
          <rect width={48} height={48} fill="#cdeab4" />
          <path d="M8 12 l2 -5 l2 5 M30 34 l2 -5 l2 5 M36 10 l2 -4 l2 4" stroke="#a9d58e" strokeWidth={1.5} fill="none" />
        </pattern>
        <pattern id="floor-wash" width={24} height={24} patternUnits="userSpaceOnUse">
          <rect width={24} height={24} fill="#eef6fb" />
          <path d="M0 0.5 H24 M0.5 0 V24" stroke="#d5e6f0" strokeWidth={1.5} />
        </pattern>
        <pattern id="floor-tiles" width={48} height={48} patternUnits="userSpaceOnUse">
          <rect width={48} height={48} fill="#e2f3ea" />
          <rect width={24} height={24} fill="#d3ebde" />
          <rect x={24} y={24} width={24} height={24} fill="#d3ebde" />
        </pattern>
      </defs>

      <rect width={width} height={height} fill="#f2e4d2" />
      {OFFICE_MAP.zones.map((zone) => (
        <rect
          key={zone.id}
          x={zone.rect.x * T}
          y={zone.rect.y * T}
          width={zone.rect.w * T}
          height={zone.rect.h * T}
          fill={FLOOR[zone.id]}
        />
      ))}

      {floorItems.map((item) => drawFurniture(item, plantMoods))}

      {OFFICE_MAP.zones.map((zone) => {
        const label = LABELS[zone.id];
        return (
          <text
            key={zone.id}
            x={label.x * T}
            y={label.y * T}
            textAnchor={label.anchor}
            fontSize={17}
            fontWeight={600}
            letterSpacing={2.5}
            fill="#2b2233"
            opacity={0.34}
            style={{ fontFamily: "var(--font-display)", textTransform: "uppercase" }}
          >
            {zone.name}
          </text>
        );
      })}

      <g fill="#b9dca0">{lawn}</g>
      <g fill="#5fae6e" stroke="#4a9a5c" strokeWidth={2}>
        {hedges}
      </g>
      <g fill={WALL} shapeRendering="crispEdges">
        {walls}
      </g>
      <g fill={WALL_FACE} shapeRendering="crispEdges">
        {faces}
      </g>

      {OFFICE_MAP.seats.map(drawSeat)}
      {otherItems.map((item) => drawFurniture(item, plantMoods))}
    </svg>
  );
}

export const WorldMapArt = memo(WorldMapArtInner);
