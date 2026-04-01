import waitlistTotal from "@/server/db/waitlist/check-waitlist-total";
import { useEffect, useSyncExternalStore } from "react";

// Global cache state
let globalState = {
  count: 0,
  loading: false,
  lastFetchedAt: 0,
};

const REVALIDATE_MS = 60 * 1000; // 1 minute

// Listeners to notify multiple hook instances
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => globalState;

const notify = () => {
  listeners.forEach((listener) => listener());
};

const fetchWaitlist = async (force = false) => {
  if (globalState.loading) return;

  const now = Date.now();
  if (
    !force &&
    globalState.lastFetchedAt !== 0 &&
    now - globalState.lastFetchedAt < REVALIDATE_MS
  ) {
    return;
  }

  globalState = { ...globalState, loading: true };
  notify();

  try {
    const resp = await waitlistTotal();
    if (resp.success) {
      globalState = {
        count: resp.data ?? 0,
        loading: false,
        lastFetchedAt: Date.now(),
      };
    } else {
      globalState = { ...globalState, loading: false };
    }
  } catch (error) {
    console.error("Failed to fetch waitlist count:", error);
    globalState = { ...globalState, loading: false };
  } finally {
    notify();
  }
};

export default function useWaitlist() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    // Initial fetch check
    fetchWaitlist();

    // Set up periodic revalidation
    const interval = setInterval(() => fetchWaitlist(), REVALIDATE_MS);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return {
    loading: state.loading,
    count: state.count,
    revalidate: () => fetchWaitlist(true),
  };
}
