"use client";

import { useEffect, useEffectEvent, useImperativeHandle, useRef } from "react";
import { getWorldEngine } from "@/lib/world/instance";
import { OFFICE_MAP } from "@/lib/world/map";
import { OfficeStage3D } from "@/lib/world3d/stage";
import { BoardDetails } from "./Whiteboard";
import { WorldAvatar } from "./WorldAvatar";
import { syncAvatarNode, type StageProps } from "./stage";
import { supports3D } from "./viewMode";

/** Where the details card hangs: above the whiteboard, clear of whoever is standing at it. */
const BOARD_CARD = (() => {
  const board = OFFICE_MAP.furniture.find((item) => item.kind === "whiteboard");
  return board
    ? { x: board.rect.x + board.rect.w / 2, y: 1.25, z: board.rect.y + board.rect.h }
    : { x: 0, y: 0, z: 0 };
})();

/** The office in 3D. Characters are drawn in WebGL; their name tags stay crisp HTML on top. */
export function WorldStage3D({
  handle,
  room,
  plantMoods,
  board,
  boardAuthor,
  now,
  showBoardDetails,
  onUnavailable,
}: StageProps & { onUnavailable: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<OfficeStage3D | null>(null);
  const nodes = useRef(new Map<string, HTMLDivElement>());
  const giveUp = useEffectEvent(onUnavailable);
  const startingMoods = useEffectEvent(() => plantMoods);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    if (!supports3D()) {
      giveUp();
      return;
    }
    let stage: OfficeStage3D;
    try {
      stage = new OfficeStage3D(canvas, OFFICE_MAP, startingMoods());
    } catch {
      giveUp();
      return;
    }
    stageRef.current = stage;
    const measure = () => stage.resize(container.clientWidth, container.clientHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    const lost = (event: Event) => {
      event.preventDefault();
      giveUp();
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => {
      observer.disconnect();
      canvas.removeEventListener("webglcontextlost", lost);
      stage.dispose();
      stageRef.current = null;
    };
  }, []);

  useEffect(() => {
    stageRef.current?.setPeople(
      room.map((entry) => ({
        id: entry.member.id,
        avatar: entry.member.avatar,
        status: entry.presence.status,
        isYou: entry.isYou,
      })),
    );
  }, [room]);

  useEffect(() => {
    stageRef.current?.setPlantMoods(plantMoods);
  }, [plantMoods]);

  const boardText = board?.text ?? null;
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const font = () =>
      getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim() || "sans-serif";
    stage.setBoard(boardText, font());
    // Redraw once the display font has loaded, so the board uses it.
    let cancelled = false;
    void document.fonts?.ready.then(() => {
      if (!cancelled) stageRef.current?.setBoard(boardText, font());
    });
    return () => {
      cancelled = true;
    };
  }, [boardText]);

  useImperativeHandle(handle, () => ({
    frame(dt) {
      const stage = stageRef.current;
      if (!stage) return;
      const engine = getWorldEngine();
      stage.frame(dt, engine);
      const player = engine.player;
      for (const [id, entity] of engine.entities) {
        const node = nodes.current.get(id);
        if (!node) continue;
        const point = stage.labelPoint(id);
        if (point) {
          node.style.transform = `translate3d(${point.x}px, ${point.y}px, 0)`;
          node.style.zIndex = String(point.depth);
        }
        syncAvatarNode(node, entity, player);
        if (point && !point.visible) node.style.opacity = "0";
      }
      const card = cardRef.current;
      if (card) {
        const point = stage.project(BOARD_CARD.x, BOARD_CARD.y, BOARD_CARD.z);
        card.style.transform = `translate3d(${point.x}px, ${point.y}px, 0)`;
      }
    },
    screenToWorld: (sx, sy) => stageRef.current?.screenToWorld(sx, sy) ?? null,
    panBy: (dx, dy) => stageRef.current?.panBy(dx, dy),
    zoomBy: (factor, sx, sy) => stageRef.current?.zoomBy(factor, sx, sy),
    setFollow: (follow) => stageRef.current?.setFollow(follow),
    setInset: (pixels) => stageRef.current?.setInset(pixels),
  }), []);

  return (
    <div ref={containerRef} className="absolute inset-0 bg-[#5b4a63]">
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 block size-full" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {room.map((entry) => (
          <WorldAvatar
            key={entry.member.id}
            member={entry.member}
            status={entry.presence.status}
            note={entry.presence.note}
            isYou={entry.isYou}
            labelOnly
            nodeRef={(node) => {
              if (node) nodes.current.set(entry.member.id, node);
              return () => {
                nodes.current.delete(entry.member.id);
              };
            }}
          />
        ))}
        {showBoardDetails && board && (
          <div ref={cardRef} className="absolute top-0 left-0 z-[3000] will-change-transform">
            <div className="-translate-x-1/2 -translate-y-full pb-2">
              <BoardDetails board={board} author={boardAuthor} now={now} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
