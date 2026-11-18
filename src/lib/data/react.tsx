"use client";

import {
  createContext,
  use,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { officeStore } from "./store";
import type {
  Member,
  OfficeActions,
  OfficeConnection,
  OfficeState,
  SessionActions,
  WorldTransport,
} from "./types";

export interface OfficeContextValue {
  state: OfficeState;
  actions: OfficeActions;
  me: Member;
}

interface ProviderValue {
  connection: OfficeConnection;
  office: OfficeContextValue | null;
}

const OfficeContext = createContext<ProviderValue | null>(null);

/**
 * Connects the subtree to the office. It always renders its children, so the
 * page frame can be prerendered; the office itself is missing on the server
 * and until the browser has connected. Wrap anything that needs live data in
 * <OfficeGate>.
 */
export function OfficeProvider({ children }: { children: ReactNode }) {
  const connection = useSyncExternalStore(
    officeStore.subscribe,
    officeStore.getSnapshot,
    officeStore.getServerSnapshot,
  );

  const value = useMemo<ProviderValue>(() => {
    if (connection.phase !== "ready") return { connection, office: null };
    const { state } = connection;
    const me = state.members.find((member) => member.id === state.currentUserId);
    return { connection, office: me ? { state, actions: officeStore.actions, me } : null };
  }, [connection]);

  return <OfficeContext value={value}>{children}</OfficeContext>;
}

function useProvider(): ProviderValue {
  const value = use(OfficeContext);
  if (!value) throw new Error("This component must be rendered inside <OfficeProvider>.");
  return value;
}

/**
 * Renders `children` once the office is connected. Before that it shows
 * `loading`; if nobody is signed in it shows `signedOut`; if the connection
 * failed it shows `failed`.
 */
export function OfficeGate({
  children,
  loading,
  signedOut,
  failed,
}: {
  children: ReactNode;
  loading: ReactNode;
  signedOut: ReactNode;
  failed: (message: string) => ReactNode;
}) {
  const { connection, office } = useProvider();
  if (office) return <>{children}</>;
  if (connection.phase === "signed-out") return <>{signedOut}</>;
  if (connection.phase === "error") return <>{failed(connection.message)}</>;
  return <>{loading}</>;
}

/** Where this browser stands: loading, signed out, setting up, ready or failed. */
export function useConnection() {
  return useProvider().connection;
}

/** The connected office. Only call inside <OfficeGate>. */
export function useOffice(): OfficeContextValue {
  const { office } = useProvider();
  if (!office) throw new Error("useOffice must be used inside a connected <OfficeGate>.");
  return office;
}

/** The office, or null while it is still connecting. For the app frame. */
export function useOfficeIfConnected(): OfficeContextValue | null {
  return useProvider().office;
}

/** Signing in and out. Works whether or not the office is connected. */
export function useSession(): SessionActions {
  return officeStore.session;
}

/** How this browser tells others where you are, and hears where they are. */
export function useWorldTransport(): WorldTransport {
  return officeStore.world;
}

/** "sample" for the built-in pretend office, "live" for the real backend. */
export const officeKind = officeStore.kind;
