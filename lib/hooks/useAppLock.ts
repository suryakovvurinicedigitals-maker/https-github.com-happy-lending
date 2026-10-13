"use client";

import { useEffect, useState } from "react";

const UNLOCK_KEY = "happy-lending-unlocked-at";
const BACKGROUNDED_KEY = "happy-lending-backgrounded-at";
const LOCK_GRACE_MS = 10_000;

export function seedUnlock() {
  try {
    sessionStorage.setItem(UNLOCK_KEY, String(Date.now()));
    sessionStorage.removeItem(BACKGROUNDED_KEY);
  } catch {
    // storage unavailable (private mode, etc.) - gate stays locked, the safe default
  }
}

function isCurrentlyUnlocked(): boolean {
  try {
    const unlockedAt = sessionStorage.getItem(UNLOCK_KEY);
    if (!unlockedAt) return false;
    const backgroundedAt = sessionStorage.getItem(BACKGROUNDED_KEY);
    if (backgroundedAt && Date.now() - Number(backgroundedAt) > LOCK_GRACE_MS) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function consumeJustUnlockedCookie(): boolean {
  const hasMarker = document.cookie
    .split("; ")
    .some((entry) => entry === "just-unlocked=1");
  if (hasMarker) {
    document.cookie = "just-unlocked=; Max-Age=0; path=/";
  }
  return hasMarker;
}

export function useAppLock() {
  const [locked, setLocked] = useState(true);

  useEffect(() => {
    if (isCurrentlyUnlocked() || consumeJustUnlockedCookie()) {
      seedUnlock();
      setLocked(false);
    } else {
      setLocked(true);
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        try {
          sessionStorage.setItem(BACKGROUNDED_KEY, String(Date.now()));
        } catch {
          // ignore - worst case we just re-lock unnecessarily on return
        }
      } else {
        setLocked(!isCurrentlyUnlocked());
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  function unlock() {
    seedUnlock();
    setLocked(false);
  }

  return { locked, unlock };
}
