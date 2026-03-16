import { useCallback, useSyncExternalStore } from "react";

export interface RecentVisit {
  path: string;
  title: string;
  subtitle?: string;
  emoji?: string;
  type:
    | "project"
    | "settings"
    | "flag"
    | "segment"
    | "flags"
    | "segments"
    | "environments"
    | "analytics"
    | "audit-log"
    | "api-keys"
    | "project-settings";
  visitedAt: number;
}

const STORAGE_KEY = "gradual:recently-visited";
const MAX_ITEMS = 10;

let listeners: Array<() => void> = [];
let cachedRaw: string | null = null;
let cachedSnapshot: RecentVisit[] = [];
const SERVER_SNAPSHOT: RecentVisit[] = [];

function emitChange() {
  cachedRaw = null;
  for (const listener of listeners) {
    listener();
  }
}

function getSnapshot(): RecentVisit[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) {
    return cachedSnapshot;
  }
  cachedRaw = raw;
  try {
    cachedSnapshot = raw ? (JSON.parse(raw) as RecentVisit[]) : [];
  } catch {
    cachedSnapshot = [];
  }
  return cachedSnapshot;
}

function getServerSnapshot(): RecentVisit[] {
  return SERVER_SNAPSHOT;
}

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];

  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      emitChange();
    }
  };
  window.addEventListener("storage", handleStorage);

  return () => {
    listeners = listeners.filter((l) => l !== listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function addRecentVisit(visit: Omit<RecentVisit, "visitedAt">) {
  const current = getSnapshot();
  const filtered = current.filter((v) => v.path !== visit.path);
  const updated: RecentVisit[] = [
    { ...visit, visitedAt: Date.now() },
    ...filtered,
  ].slice(0, MAX_ITEMS);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  emitChange();
}

export function useRecentlyVisited() {
  const visits = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const addVisit = useCallback((visit: Omit<RecentVisit, "visitedAt">) => {
    addRecentVisit(visit);
  }, []);

  return { visits, addVisit };
}
