"use client";

import { useEffect, useImperativeHandle, useRef } from "react";
import { getWorldEngine } from "@/lib/world/instance";
import { OFFICE_MAP, mapPixelSize } from "@/lib/world/map";
import { WhiteboardText } from "./Whiteboard";
import { WorldAvatar } from "./WorldAvatar";
import { WorldMapArt } from "./WorldMapArt";
import { syncAvatarNode, type StageProps } from "./stage";

const MAP = mapPixelSize(OFFICE_MAP);
const MAX_ZOOM = 1.6;

/** Smaller screens start zoomed out a little. */
function startingZoom(width: number): number {
  if (width < 480) return 0.62;
  if (width < 760) return 0.8;
  return 1;
}

/** Zoomed all the way out, the whole office fits on screen. */
function minZoom(width: number, height: number): number {
  const fit = Math.min(width / MAP.width, height / MAP.height);
  return Math.max(0.3, Math.min(fit, 1));
}

/** Keeps the camera over the map; centres the map when it is smaller than the view. */
function clampAxis(position: number, view: number, total: number): number {
  return total <= view ? (total - view) / 2 : Math.min(Math.max(position, 0), total - view);
}

/** The office drawn flat, from straight above. */
export function WorldStage2D({
  handle,
  room,
  plantMoods,
  board,
  boardAuthor,
  now,
  showBoardDetails,
}: StageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLSpanElement>(null);
  const nodes = useRef(new Map<string, HTMLDivElement>());
  /** Where the camera is drawn right now. */
  const camera = useRef({ x: 0, y: 0, scale: 1 });
  /** Where the camera wants to be: on you, or wherever you've looked. Zoom 0 = not chosen yet. */
  const view = useRef({ follow: true, x: 0, y: 0, zoom: 0 });
  const size = useRef({ width: 0, height: 0 });
  const inset = useRef(0);
  /** Jump the camera straight to its target on the next frame. */
  const snap = useRef(true);
  const calm = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    calm.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const measure = () => {
      size.current = { width: container.clientWidth, height: container.clientHeight };
      snap.current = true;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useImperativeHandle(handle, () => {
    const clampZoom = (zoom: number) =>
      Math.min(
        Math.max(zoom, minZoom(size.current.width - inset.current, size.current.height)),
        MAX_ZOOM,
      );
    const stopFollowing = () => {
      const v = view.current;
      if (!v.follow) return;
      v.follow = false;
      v.x = camera.current.x;
      v.y = camera.current.y;
    };

    return {
      frame(dt) {
        const world = worldRef.current;
        if (!world) return;
        const engine = getWorldEngine();
        const player = engine.player;
        const { width, height } = size.current;
        const v = view.current;
        const cam = camera.current;
        const scale = clampZoom(v.zoom || startingZoom(width));
        const zoomed = scale !== cam.scale;
        v.zoom = scale;
        cam.scale = scale;
        const viewWidth = width / scale;
        const viewHeight = height / scale;
        // The panel counts as extra floor on the right, so the map can slide out from under it.
        const covered = inset.current / scale;
        const reachX = MAP.width + covered;

        if (v.follow) {
          const targetX = clampAxis(
            (player?.x ?? MAP.width / 2) - (viewWidth - covered) / 2,
            viewWidth,
            reachX,
          );
          const targetY = clampAxis(
            (player?.y ?? MAP.height / 2) - viewHeight / 2,
            viewHeight,
            MAP.height,
          );
          const ease = snap.current || zoomed || calm.current ? 1 : 1 - Math.exp(-dt * 9);
          cam.x += (targetX - cam.x) * ease;
          cam.y += (targetY - cam.y) * ease;
        } else {
          v.x = clampAxis(v.x, viewWidth, reachX);
          v.y = clampAxis(v.y, viewHeight, MAP.height);
          cam.x = v.x;
          cam.y = v.y;
        }
        snap.current = false;
        world.style.transform = `scale(${scale}) translate3d(${-cam.x}px, ${-cam.y}px, 0)`;

        for (const [id, entity] of engine.entities) {
          const node = nodes.current.get(id);
          if (!node) continue;
          node.style.transform = `translate3d(${entity.x}px, ${entity.y}px, 0)`;
          node.style.zIndex = String(Math.round(entity.y));
          syncAvatarNode(node, entity, player);
        }

        const marker = markerRef.current;
        if (marker) {
          const target = engine.playerTarget;
          marker.style.opacity = target ? "1" : "0";
          if (target) marker.style.transform = `translate3d(${target.x}px, ${target.y}px, 0)`;
        }
      },

      screenToWorld(sx, sy) {
        const cam = camera.current;
        return { x: sx / cam.scale + cam.x, y: sy / cam.scale + cam.y };
      },

      panBy(dx, dy) {
        stopFollowing();
        view.current.x -= dx / camera.current.scale;
        view.current.y -= dy / camera.current.scale;
      },

      zoomBy(factor, sx = size.current.width / 2, sy = size.current.height / 2) {
        const v = view.current;
        const cam = camera.current;
        const next = clampZoom(v.zoom * factor);
        // Following zooms around you; otherwise the point under the pointer stays put.
        if (!v.follow) {
          v.x = sx / cam.scale + cam.x - sx / next;
          v.y = sy / cam.scale + cam.y - sy / next;
        }
        v.zoom = next;
      },

      setFollow(follow) {
        if (follow) view.current.follow = true;
        else stopFollowing();
      },

      setInset(pixels) {
        inset.current = pixels;
      },
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 bg-[#5b4a63]">
      <div
        ref={worldRef}
        className="absolute top-0 left-0 origin-top-left will-change-transform"
        style={{ width: MAP.width, height: MAP.height }}
      >
        <WorldMapArt plantMoods={plantMoods} />
        <WhiteboardText board={board} author={boardAuthor} now={now} showDetails={showBoardDetails} />

        <span
          ref={markerRef}
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 opacity-0"
        >
          <span className="absolute -top-3 -left-3 size-6 animate-marker rounded-full border-[3px] border-brand" />
          <span className="absolute -top-1 -left-1 size-2 rounded-full bg-brand" />
        </span>

        {room.map((entry) => (
          <WorldAvatar
            key={entry.member.id}
            member={entry.member}
            status={entry.presence.status}
            note={entry.presence.note}
            isYou={entry.isYou}
            nodeRef={(node) => {
              if (node) nodes.current.set(entry.member.id, node);
              return () => {
                nodes.current.delete(entry.member.id);
              };
            }}
          />
        ))}
      </div>
    </div>
  );
}
