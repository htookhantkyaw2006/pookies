"use client";

import dynamic from "next/dynamic";
import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  Box,
  CircleHelp,
  Hand,
  LocateFixed,
  Map as MapIcon,
  Signpost,
  MapPin,
  Maximize2,
  Minimize2,
  Minus,
  Moon,
  Plus,
  Sun,
  SunMoon,
  Volume2,
  Users,
  VolumeX,
} from "lucide-react";
import { plantMood, type PlantMood } from "@/lib/data/rules";
import { useOffice, useWorldTransport } from "@/lib/data/react";
import { buildRoom } from "@/lib/presence/derive";
import { playSound, setSoundEnabled, soundEnabled, subscribeSound } from "@/lib/sound";
import { NEAR_DISTANCE, type Nearby, type WorldPerson } from "@/lib/world/engine";
import { getWorldEngine } from "@/lib/world/instance";
import {
  OFFICE_MAP,
  PHOTO_BOOTH_AREA,
  TILE,
  freePersonalRoom,
  personalRoomMiddle,
  type Zone,
} from "@/lib/world/map";
import { PHOTO_MAX_PEOPLE } from "@/lib/data/rules";
import type { PhotoBackdrop } from "@/lib/data/types";
import { STATUS_META } from "@/components/ui/status";
import type { StageHandle } from "./stage";
import { getViewMode, setViewMode, subscribeViewMode, supports3D } from "./viewMode";
import { getSkyMode, nextSkyMode, setSkyMode, subscribeSkyMode, type SkyMode } from "@/lib/world3d/skyMode";

/** What the day/night button says it will switch to next. */
const SKY_LABELS: Record<SkyMode, string> = {
  auto: "Sky follows your clock. Switch to day",
  day: "Daytime. Switch to night",
  night: "Night-time. Switch back to your clock",
};
import { Breathe } from "@/components/calm/Breathe";
import { describeAction, runAction, type Activity } from "./interactions";
import { MirrorPanel } from "./MirrorPanel";
import { Darts } from "@/components/games/Darts";
import { ScoreBoard } from "@/components/games/ScoreBoard";
import { SnackCatch } from "@/components/games/SnackCatch";
import { PhotoBooth } from "@/components/photo/PhotoBooth";
import { PhotoWall } from "@/components/photo/PhotoWall";
import { SnapCountdown } from "@/components/photo/SnapCountdown";
import { PlacesMenu } from "./PlacesMenu";
import { WhiteboardEditor } from "./Whiteboard";
import { WorldStage2D } from "./WorldStage2D";

// Three.js is big: only load it in the browser, and only when the 3D office is showing.
const WorldStage3D = dynamic(() => import("./WorldStage3D").then((module) => module.WorldStage3D), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-[#5b4a63]">
      <p className="rounded-full bg-surface/95 px-4 py-2 text-sm font-bold text-ink shadow-lift">
        Building the office…
      </p>
    </div>
  ),
});

/** Keys that walk, by physical key so WASD works on any keyboard layout. */
const WALK_KEYS: Record<string, { x: number; y: number }> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  KeyW: { x: 0, y: -1 },
  KeyS: { x: 0, y: 1 },
  KeyA: { x: -1, y: 0 },
  KeyD: { x: 1, y: 0 },
};

/** Longest slice of time the world advances in one go, in seconds. */
const STEP = 1 / 30;
/** After a long pause (hidden tab, slow device) jump ahead at most this far. */
const MAX_CATCH_UP = 1;
/** While you walk, tell everyone else where you are this often, in seconds. */
const SEND_EVERY = 0.15;
/** A press that moves less than this many pixels is a click, not a drag. */
const DRAG_THRESHOLD = 6;
const ZOOM_STEP = 1.25;
/** Walking this many pixels makes one footstep. */
const STRIDE = 46;

/** A stable key, so React only hears about it when it changes. */
function nearbyKey(nearby: Nearby | null): string {
  if (!nearby) return "";
  return nearby.kind === "thing" ? `thing:${nearby.thing.id}` : `${nearby.kind}:${nearby.seat.id}`;
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

function subscribeFullscreen(onChange: () => void) {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
}
const noSubscribe = () => () => {};

interface Gesture {
  lastX: number;
  lastY: number;
  startX: number;
  startY: number;
  dragging: boolean;
  /** Distance between two fingers last time, while pinching. */
  pinch: number | null;
}

/**
 * The walkable office. Arrow keys or WASD walk, a click or tap walks you to
 * that spot, dragging or scrolling looks around, E waves. Walking into a room
 * sets your status to match it. The office itself is drawn by a stage: 3D, or
 * the flat 2D map.
 */
export function WorldView({
  greeting,
  status,
  renderPanel,
}: {
  /** Top left, above the room you're in. */
  greeting: ReactNode;
  /** Top right: your own status control. */
  status: ReactNode;
  /** The floating People / Check-ins panel. */
  renderPanel: (close: () => void) => ReactNode;
}) {
  const { state, me, actions } = useOffice();
  const transport = useWorldTransport();
  const [zone, setZone] = useState<Zone | null>(null);
  const [following, setFollowing] = useState(true);
  /** The one thing you could do where you stand: sit, make coffee, water a plant… */
  const [nearby, setNearby] = useState<Nearby | null>(null);
  /** A panel opened from something in the office: the whiteboard, the mirror, the breathing guide… */
  const [activity, setActivity] = useState<Activity | null>(null);
  const boardOpen = activity === "board";
  /** While a game is open, the arrow keys and Space belong to it. */
  const playing = activity === "arcade" || activity === "darts";
  const isPlaying = useEffectEvent(() => playing);
  /** A photo booth countdown on screen; `mine` if we pressed the button (and so save the photo). */
  const [snap, setSnap] = useState<{ key: number; mine: boolean; backdrop: PhotoBackdrop } | null>(null);
  const [boothSince, setBoothSince] = useState(0);
  const openActivity = (next: Activity) => {
    if (next === "booth") setBoothSince(Date.now());
    setActivity(next);
  };
  const [panelOpen, setPanelOpen] = useState<boolean | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [placesOpen, setPlacesOpen] = useState(false);
  const soundOn = useSyncExternalStore(subscribeSound, soundEnabled, () => false);
  const viewMode = useSyncExternalStore(subscribeViewMode, getViewMode, () => "2d" as const);
  const skyMode = useSyncExternalStore(subscribeSkyMode, getSkyMode, () => "auto" as const);
  const can3D = useSyncExternalStore(noSubscribe, supports3D, () => false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<StageHandle>(null);
  /** Screen pixels on the right that the panel covers; the camera keeps you clear of them. */
  const inset = useRef(0);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture | null>(null);
  /** Set when everyone needs to hear where we are, moved or not. */
  const announce = useRef(true);

  const isFullscreen = useSyncExternalStore(
    subscribeFullscreen,
    () => document.fullscreenElement !== null,
    () => false,
  );
  const canFullscreen = useSyncExternalStore(
    noSubscribe,
    () => document.fullscreenEnabled,
    () => false,
  );

  const room = useMemo(
    () => buildRoom(state.members, state.presence, state.currentUserId),
    [state.members, state.presence, state.currentUserId],
  );
  const authorName = state.things.board?.authorId
    ? (state.members.find((member) => member.id === state.things.board?.authorId)?.displayName ?? null)
    : null;
  // Only redraw plants when a plant's mood actually changes, not on every clock tick.
  const moodKey = OFFICE_MAP.things
    .filter((thing) => thing.kind === "plant")
    .map((thing) => plantMood(state.things.plants[thing.id], state.now))
    .join(",");
  const plantMoods = useMemo(() => {
    const moods: Record<string, PlantMood> = {};
    const list = moodKey.split(",");
    OFFICE_MAP.things
      .filter((thing) => thing.kind === "plant")
      .forEach((thing, index) => {
        moods[thing.id] = list[index] as PlantMood;
      });
    return moods;
  }, [moodKey]);

  const people = useMemo<WorldPerson[]>(
    () => room.map((entry) => ({ id: entry.member.id, status: entry.presence.status })),
    [room],
  );

  // Keep the world in step with who is here and what their status is.
  useEffect(() => {
    const engine = getWorldEngine();
    engine.setTeammateMode(transport.teammates);
    engine.sync(people, me.id);
  }, [people, me.id, transport]);

  /** Someone else started the booth countdown: if we're in the booth, we're in the photo too. */
  const onRemoteSnap = useEffectEvent((backdrop: PhotoBackdrop) => {
    const engine = getWorldEngine();
    if (snap || !engine.player || !engine.peopleIn(PHOTO_BOOTH_AREA).includes(engine.player.id)) return;
    setSnap({ key: Date.now(), mine: false, backdrop });
  });

  // Other browsers: where their people are, and when they wave.
  useEffect(() => {
    announce.current = true;
    return transport.subscribe((message) => {
      const engine = getWorldEngine();
      if (message.type === "position") {
        engine.setRemotePosition(message.id, message.x, message.y, message.seat);
      } else if (message.type === "wave") {
        engine.showWave(message.id);
        const them = engine.entities.get(message.id);
        const player = engine.player;
        if (them && player && Math.hypot(them.x - player.x, them.y - player.y) < NEAR_DISTANCE * 1.5) {
          playSound("wave");
        }
      } else if (message.type === "emote") {
        engine.showRemoteEmote(message.id, message.emoji, message.hold);
      } else if (message.type === "snap") {
        onRemoteSnap(message.backdrop);
      } else {
        announce.current = true; // someone arrived: tell them where we are
      }
    });
  }, [transport]);

  const startSnap = (backdrop: PhotoBackdrop) => {
    if (snap) return;
    const engine = getWorldEngine();
    engine.emote("📸");
    transport.sendEmote("📸", false);
    transport.sendSnap(backdrop);
    setSnap({ key: Date.now(), mine: true, backdrop });
  };

  /** The flash: everyone in the booth poses, and whoever pressed the button saves the photo. */
  const onFlash = () => {
    const engine = getWorldEngine();
    const inBooth = engine.peopleIn(PHOTO_BOOTH_AREA).slice(0, PHOTO_MAX_PEOPLE);
    engine.pose(inBooth);
    if (snap?.mine && inBooth.includes(me.id)) void actions.pinPhoto(snap.backdrop, inBooth);
  };

  const wave = () => {
    getWorldEngine().wave();
    transport.sendWave();
    playSound("wave");
  };
  const onWaveKey = useEffectEvent(wave);

  /** Sends our position if it's due. Returns true when it went out. */
  const sharePosition = useEffectEvent((x: number, y: number, seat: string | null) => {
    if (!transport.sendPosition(x, y, seat)) return false;
    announce.current = false;
    return true;
  });

  const enterZone = useEffectEvent((next: Zone, arrivedOnFoot: boolean) => {
    setZone(next);
    if (arrivedOnFoot && next.status !== me.status) void actions.setStatus(next.status);
  });

  // A side panel covers part of the map; a bottom sheet (phones) doesn't push the camera.
  useEffect(() => {
    const panel = panelRef.current;
    const viewport = viewportRef.current;
    if (!panel || !viewport) return;
    const measure = () => {
      const width = panel.offsetWidth;
      inset.current = width > 0 && width < viewport.clientWidth * 0.6 ? width + 12 : 0;
    };
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  /** Stop following you, keeping the camera where it is. */
  const lookAround = () => {
    stageRef.current?.setFollow(false);
    setFollowing(false);
  };

  /** Does whatever is at hand: sit, stand, make coffee, wash your hands… (see interactions.tsx). */
  const actOnNearby = () => {
    const engine = getWorldEngine();
    const here = engine.nearby();
    if (here) runAction(here, { engine, transport, actions, open: openActivity });
  };
  const onActionKey = useEffectEvent(actOnNearby);
  const showNearby = useEffectEvent((next: Nearby | null) => {
    setNearby(next);
    // Walking away from the thing that opened a panel closes it.
    setActivity((open) => (open && next?.kind === "thing" && next.thing.kind === open ? open : null));
  });

  const recenter = () => {
    stageRef.current?.setFollow(true);
    setFollowing(true);
  };
  const onWalkKey = useEffectEvent(recenter);

  const zoomBy = (factor: number) => stageRef.current?.zoomBy(factor);

  const switchView = () => {
    setViewMode(viewMode === "3d" ? "2d" : "3d");
    setFollowing(true); // a new stage starts on you
  };

  // The game loop: step the world, then let the stage draw it.
  useEffect(() => {
    const engine = getWorldEngine();
    let last = performance.now();
    let first = true;
    let frame = 0;
    let sinceSent = 0;
    let sent: { x: number; y: number; seat: string | null } = {
      x: Number.NaN,
      y: Number.NaN,
      seat: null,
    };
    let shownNearby = "";
    let stepped = 0;
    let lastFeet = { x: Number.NaN, y: Number.NaN };

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;

      // Step in small slices so a slow frame rate never slows the world down
      // (or lets anyone skip through a wall). Catch up at most a second.
      let remaining = Math.min(dt, MAX_CATCH_UP);
      let entered: Zone | null = null;
      while (remaining > 0) {
        const slice = Math.min(remaining, STEP);
        entered = engine.step(slice) ?? entered;
        remaining -= slice;
      }
      if (entered) enterZone(entered, true);
      else if (first && engine.zone) enterZone(engine.zone, false);

      const player = engine.player;

      // Let everyone else see us move: a few times a second while walking,
      // once more when we stop, and whenever someone new needs to be told.
      sinceSent += dt;
      if (player && sinceSent >= SEND_EVERY) {
        const seat = player.sitting ? player.seatId : null;
        const moved = player.x !== sent.x || player.y !== sent.y || seat !== sent.seat;
        if ((moved || announce.current) && sharePosition(player.x, player.y, seat)) {
          sent = { x: player.x, y: player.y, seat };
          sinceSent = 0;
        }
      }

      const here = engine.nearby();
      const key = nearbyKey(here);
      if (key !== shownNearby) {
        shownNearby = key;
        showNearby(here);
      }

      // Soft footsteps while you walk (silent unless sounds are on).
      if (player) {
        if (player.walking && Number.isFinite(lastFeet.x)) {
          stepped += Math.hypot(player.x - lastFeet.x, player.y - lastFeet.y);
          if (stepped >= STRIDE) {
            stepped = 0;
            playSound("step");
          }
        } else if (!player.walking) {
          stepped = STRIDE * 0.6; // the first step comes quickly
        }
        lastFeet = { x: player.x, y: player.y };
      }

      const stage = stageRef.current;
      if (stage) {
        stage.setInset(inset.current);
        stage.frame(Math.min(dt, MAX_CATCH_UP));
      }

      first = false;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      engine.setInput(0, 0);
    };
  }, []);

  // Keyboard: held keys set a direction (and bring the camera back to you), E waves.
  useEffect(() => {
    const engine = getWorldEngine();
    const held = new Set<string>();
    const apply = () => {
      let x = 0;
      let y = 0;
      for (const code of held) {
        x += WALK_KEYS[code].x;
        y += WALK_KEYS[code].y;
      }
      engine.setInput(x, y);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
      if (isPlaying()) {
        release();
        return;
      }
      if (event.code in WALK_KEYS) {
        held.add(event.code);
        apply();
        onWalkKey();
        if (event.code.startsWith("Arrow")) event.preventDefault(); // don't scroll the page
      } else if (event.code === "KeyE" && !event.repeat) {
        onWaveKey();
      } else if (event.code === "KeyF" && !event.repeat) {
        event.preventDefault();
        onActionKey();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (held.delete(event.code)) apply();
    };
    const release = () => {
      held.clear();
      apply();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", release);
      release();
    };
  }, []);

  const onWheel = useEffectEvent((event: WheelEvent) => {
    // Panels and popovers over the map scroll normally.
    if (event.target instanceof Element && event.target.closest("[data-hud]")) return;
    event.preventDefault();
    const viewport = viewportRef.current!;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1;
    if (event.ctrlKey) {
      // Trackpad pinch (and ctrl + wheel) zooms around the pointer.
      const rect = viewport.getBoundingClientRect();
      stageRef.current?.zoomBy(
        Math.exp(-event.deltaY * unit * 0.01),
        event.clientX - rect.left,
        event.clientY - rect.top,
      );
      return;
    }
    lookAround();
    stageRef.current?.panBy(-event.deltaX * unit, -event.deltaY * unit);
  });

  // Wheel needs a non-passive listener so it can stop the page scrolling.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const listener = (event: WheelEvent) => onWheel(event);
    viewport.addEventListener("wheel", listener, { passive: false });
    return () => viewport.removeEventListener("wheel", listener);
  }, []);

  const pinchDistance = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 1) {
      gesture.current = {
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        dragging: false,
        pinch: null,
      };
    } else if (pointers.current.size === 2 && gesture.current) {
      lookAround();
      gesture.current.dragging = true;
      gesture.current.pinch = pinchDistance();
    }
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const g = gesture.current;
    if (!g) return;

    if (g.pinch !== null && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const rect = event.currentTarget.getBoundingClientRect();
      const distance = pinchDistance();
      stageRef.current?.zoomBy(
        distance / Math.max(g.pinch, 1),
        (a.x + b.x) / 2 - rect.left,
        (a.y + b.y) / 2 - rect.top,
      );
      g.pinch = distance;
      return;
    }

    if (!g.dragging) {
      if (Math.hypot(event.clientX - g.startX, event.clientY - g.startY) < DRAG_THRESHOLD) return;
      lookAround();
      g.dragging = true;
    }
    stageRef.current?.panBy(event.clientX - g.lastX, event.clientY - g.lastY);
    g.lastX = event.clientX;
    g.lastY = event.clientY;
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.delete(event.pointerId)) return;
    const g = gesture.current;
    if (pointers.current.size === 1 && g) {
      // One finger left after a pinch: carry on panning with it.
      const [rest] = [...pointers.current.values()];
      g.pinch = null;
      g.lastX = rest.x;
      g.lastY = rest.y;
      return;
    }
    gesture.current = null;
    if (!g || g.dragging || event.type === "pointercancel") return;

    const rect = event.currentTarget.getBoundingClientRect();
    const spot = stageRef.current?.screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
    if (spot) getWorldEngine().walkTo(spot.x, spot.y);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void viewportRef.current?.requestFullscreen();
  };

  const zoneStatus = zone ? STATUS_META[zone.status] : null;
  // null means "open on wide screens, closed on phones" until someone chooses.
  const panelClass = { null: "hidden md:flex", true: "flex", false: "hidden" }[String(panelOpen)];
  const reopenClass = { null: "inline-flex md:hidden", true: "hidden", false: "inline-flex" }[
    String(panelOpen)
  ];
  const insetClass = panelOpen === false ? "" : "md:[--panel:21rem]";
  const stop = (event: { stopPropagation(): void }) => event.stopPropagation();
  const stageProps = {
    handle: stageRef,
    room,
    plantMoods,
    board: state.things.board,
    boardAuthor: authorName,
    now: state.now,
    showBoardDetails: nearby?.kind === "thing" && nearby.thing.kind === "board" && !boardOpen,
  };

  return (
    <section aria-labelledby="world-title" className="flex min-h-0 min-w-0 flex-1 flex-col">
      <h2 id="world-title" className="sr-only">
        The office
      </h2>
      <div
        id="office-world"
        ref={viewportRef}
        role="group"
        data-view={viewMode}
        aria-label="Office map. Walk with the arrow keys or W, A, S, D. Drag or scroll to look around. The People list has the same information."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={`relative min-h-[22rem] w-full flex-1 cursor-pointer touch-none overflow-clip bg-[#5b4a63] select-none active:cursor-grabbing ${insetClass}`}
      >
        {viewMode === "3d" ? (
          <WorldStage3D
            {...stageProps}
            onUnavailable={() => setViewMode("2d")}
          />
        ) : (
          <WorldStage2D {...stageProps} />
        )}

        {/* Heads-up display. Everything below floats over the map. */}

        {/* Top left: hello, and the room you're in. */}
        <div className="pointer-events-none absolute top-[4.25rem] left-3 flex max-w-[calc(100%-1.5rem)] min-w-0 flex-col items-start gap-2 sm:top-3 sm:max-w-[calc(100%-max(var(--panel,0rem),17rem)-1.5rem)]">
          {greeting}
          <p
            aria-live="polite"
            className="flex max-w-full items-center gap-2 rounded-full bg-surface/95 py-1.5 pr-4 pl-2 text-sm font-bold text-ink shadow-lift backdrop-blur"
          >
            {zone && zoneStatus ? (
              <>
                <span
                  className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full text-white ${zoneStatus.dot}`}
                >
                  <MapPin aria-hidden="true" className="size-4" strokeWidth={2.6} />
                </span>
                <span className="truncate">
                  {zone.name}
                  <span className="hidden font-semibold text-ink-soft sm:inline"> · {zone.hint}</span>
                </span>
              </>
            ) : (
              <span className="pl-2">Finding your desk…</span>
            )}
          </p>
        </div>

        {/* Top right: your status, and the People button while the panel is closed. */}
        <div
          data-hud
          onPointerDown={stop}
          className="absolute top-3 right-3 flex items-start gap-2"
        >
          {status}
          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            className={`${reopenClass} min-h-11 items-center gap-2 rounded-full bg-surface/95 px-4 text-sm font-bold text-ink shadow-lift backdrop-blur transition-colors hover:bg-brand-soft`}
          >
            <Users aria-hidden="true" className="size-4" />
            People
            <span className="text-ink-soft">
              {room.filter((entry) => entry.presence.status !== "offline").length}/{room.length}
            </span>
          </button>
        </div>

        {/* Right: who's here and today's check-ins. A bottom sheet on phones. */}
        <div
          ref={panelRef}
          data-hud
          onPointerDown={stop}
          className={`${panelClass} absolute right-3 bottom-3 left-3 z-[2500] h-[min(70%,34rem)] cursor-auto flex-col overflow-hidden rounded-[1.5rem] border border-line bg-canvas/95 shadow-lift backdrop-blur-md select-text md:top-[4.25rem] md:left-auto md:h-auto md:w-80`}
        >
          {renderPanel(() => setPanelOpen(false))}
        </div>

        {/* Bottom left: map controls. */}
        <div
          data-hud
          onPointerDown={stop}
          className="absolute bottom-3 left-3 flex flex-col items-start gap-2"
        >
          {placesOpen && (
            <PlacesMenu
              current={zone}
              onPick={(place) => {
                const engine = getWorldEngine();
                let goal = place.spot;
                if (place.id === "personal") {
                  // Head for a room nobody else is using.
                  const others = [...engine.entities.values()]
                    .filter((entity) => entity !== engine.player && entity.visible)
                    .map((entity) => ({ x: entity.x / TILE, y: entity.y / TILE }));
                  goal = personalRoomMiddle(freePersonalRoom(others));
                }
                engine.hurryTo(goal.x * TILE, goal.y * TILE);
                recenter();
                setPlacesOpen(false);
              }}
            />
          )}
          {helpOpen && (
            <div className="w-64 rounded-2xl border border-line bg-surface/95 p-3 text-xs leading-5 font-semibold text-ink-soft shadow-lift backdrop-blur">
              <p className="mb-1 text-sm font-bold text-ink">How to get around</p>
              <p className="hidden [@media(pointer:fine)]:block">
                <kbd className="font-bold text-ink">W A S D</kbd> or arrows to walk, or click a spot.
              </p>
              <p className="[@media(pointer:fine)]:hidden">Tap a spot to walk there.</p>
              <p>Drag to look around; pinch or scroll to zoom.</p>
              <p>
                <kbd className="font-bold text-ink">F</kbd> sits, makes coffee, waters plants, writes on
                the whiteboard. <kbd className="font-bold text-ink">E</kbd> waves.
              </p>
              <p>Rooms set your status as you walk in.</p>
            </div>
          )}
          <div className="flex overflow-hidden rounded-full bg-surface/95 shadow-lift backdrop-blur">
            <MapButton
              label={placesOpen ? "Close places" : "Go to a place"}
              pressed={placesOpen}
              onClick={() => {
                setPlacesOpen((open) => !open);
                setHelpOpen(false);
              }}
              grouped
            >
              <Signpost aria-hidden="true" className="size-5" />
            </MapButton>
            <span aria-hidden="true" className="my-2.5 w-px bg-line" />
            {can3D && (
              <>
                <MapButton
                  label={viewMode === "3d" ? "Switch to the flat 2D map" : "Switch to the 3D office"}
                  onClick={switchView}
                  grouped
                >
                  {viewMode === "3d" ? (
                    <MapIcon aria-hidden="true" className="size-5" />
                  ) : (
                    <Box aria-hidden="true" className="size-5" />
                  )}
                </MapButton>
                {/* Day and night only show in the 3D office. */}
                {viewMode === "3d" && (
                  <MapButton
                    label={SKY_LABELS[skyMode]}
                    pressed={skyMode !== "auto"}
                    onClick={() => setSkyMode(nextSkyMode(skyMode))}
                    grouped
                  >
                    {skyMode === "day" ? (
                      <Sun aria-hidden="true" className="size-5" />
                    ) : skyMode === "night" ? (
                      <Moon aria-hidden="true" className="size-5" />
                    ) : (
                      <SunMoon aria-hidden="true" className="size-5" />
                    )}
                  </MapButton>
                )}
                <span aria-hidden="true" className="my-2.5 w-px bg-line" />
              </>
            )}
            <MapButton label="Zoom out" onClick={() => zoomBy(1 / ZOOM_STEP)} grouped>
              <Minus aria-hidden="true" className="size-5" />
            </MapButton>
            <span aria-hidden="true" className="my-2.5 w-px bg-line" />
            <MapButton label="Zoom in" onClick={() => zoomBy(ZOOM_STEP)} grouped>
              <Plus aria-hidden="true" className="size-5" />
            </MapButton>
            <span aria-hidden="true" className="my-2.5 w-px bg-line" />
            <MapButton
              label={soundOn ? "Turn sounds off" : "Turn sounds on"}
              pressed={soundOn}
              onClick={() => setSoundEnabled(!soundOn)}
              grouped
            >
              {soundOn ? (
                <Volume2 aria-hidden="true" className="size-5" />
              ) : (
                <VolumeX aria-hidden="true" className="size-5 text-ink-soft" />
              )}
            </MapButton>
            {canFullscreen && (
              <>
                <span aria-hidden="true" className="my-2.5 w-px bg-line" />
                <MapButton
                  label={isFullscreen ? "Exit full screen" : "Full screen"}
                  onClick={toggleFullscreen}
                  grouped
                >
                  {isFullscreen ? (
                    <Minimize2 aria-hidden="true" className="size-5" />
                  ) : (
                    <Maximize2 aria-hidden="true" className="size-5" />
                  )}
                </MapButton>
              </>
            )}
            <span aria-hidden="true" className="my-2.5 w-px bg-line" />
            <MapButton
              label={helpOpen ? "Hide controls help" : "How to get around"}
              pressed={helpOpen}
              onClick={() => {
                setHelpOpen((open) => !open);
                setPlacesOpen(false);
              }}
              grouped
            >
              <CircleHelp aria-hidden="true" className="size-5" />
            </MapButton>
          </div>
        </div>

        {activity === "board" && (
          <WhiteboardEditor
            board={state.things.board}
            onSave={async (text) => {
              const result = await actions.writeBoard(text);
              if (result.ok) playSound("marker");
              return result;
            }}
            onClose={() => setActivity(null)}
          />
        )}
        {activity === "mirror" && <MirrorPanel onClose={() => setActivity(null)} />}
        {activity === "breathe" && <Breathe onClose={() => setActivity(null)} />}
        {activity === "arcade" && <SnackCatch onClose={() => setActivity(null)} />}
        {activity === "darts" && <Darts onClose={() => setActivity(null)} />}
        {activity === "scores" && <ScoreBoard onClose={() => setActivity(null)} />}
        {activity === "booth" && (
          <PhotoBooth
            onClose={() => setActivity(null)}
            onSnap={startSnap}
            snapping={snap !== null}
            since={boothSince}
          />
        )}
        {activity === "photos" && <PhotoWall onClose={() => setActivity(null)} />}
        {snap && <SnapCountdown key={snap.key} onFlash={onFlash} onDone={() => setSnap(null)} />}

        {/* Bottom centre (of the open floor): what you can do right here. */}
        <div
          data-hud
          onPointerDown={stop}
          className="absolute right-3 bottom-[4.25rem] flex max-w-[calc(100%-1.5rem)] flex-wrap items-center justify-end gap-2 md:right-auto md:bottom-3 md:left-[calc((100%-var(--panel,0rem))/2)] md:-translate-x-1/2 md:flex-nowrap md:justify-center"
        >
          {nearby && !activity && <ActionButton nearby={nearby} onClick={actOnNearby} />}
          {!following && (
            <button
              type="button"
              onClick={recenter}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-4 text-sm font-bold whitespace-nowrap text-white shadow-lift transition-colors hover:bg-brand-ink"
            >
              <LocateFixed aria-hidden="true" className="size-4" />
              Recenter
            </button>
          )}
          <button
            type="button"
            onClick={wave}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-surface/95 px-4 text-sm font-bold whitespace-nowrap text-ink shadow-lift backdrop-blur transition-colors hover:bg-brand-soft"
          >
            <Hand aria-hidden="true" className="size-4" />
            Wave
            <kbd className="hidden rounded-md bg-sunken px-1.5 text-xs font-bold text-ink-soft [@media(pointer:fine)]:inline">
              E
            </kbd>
          </button>
        </div>
      </div>
    </section>
  );
}

function ActionButton({ nearby, onClick }: { nearby: Nearby; onClick: () => void }) {
  const { label, icon: Icon } = describeAction(nearby);
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-soft px-4 text-sm font-bold text-brand-ink shadow-lift ring-2 ring-brand/30 transition-colors hover:bg-surface"
    >
      <Icon aria-hidden="true" className="size-4" />
      {label}
      <kbd className="hidden rounded-md bg-surface px-1.5 text-xs font-bold text-brand-ink [@media(pointer:fine)]:inline">
        F
      </kbd>
    </button>
  );
}

function MapButton({
  label,
  onClick,
  grouped = false,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  grouped?: boolean;
  pressed?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`inline-flex size-11 items-center justify-center text-ink transition-colors hover:bg-brand-soft ${
        grouped ? "" : "rounded-full bg-surface/95 shadow-lift"
      }`}
    >
      {children}
    </button>
  );
}
