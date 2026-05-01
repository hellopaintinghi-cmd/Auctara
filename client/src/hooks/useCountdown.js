// src/hooks/useCountdown.js
import { useState, useEffect, useRef } from 'react';

const ZERO = { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0, expired: true, urgent: false };

export function useCountdown(endsAt) {
  const [remaining, setRemaining] = useState(() => calcRemaining(endsAt));
  const rafRef = useRef(null);

  useEffect(() => {
    if (!endsAt) return;
    function tick() {
      setRemaining(calcRemaining(endsAt));
      rafRef.current = setTimeout(tick, 1_000);
    }
    rafRef.current = setTimeout(tick, 1_000);
    return () => clearTimeout(rafRef.current);
  }, [endsAt]);

  return remaining;
}

function calcRemaining(endsAt) {
  if (!endsAt) return ZERO;
  const diff = Math.max(0, new Date(endsAt) - Date.now());
  const secs = Math.floor(diff / 1000);
  return {
    days:    Math.floor(secs / 86400),
    hours:   Math.floor((secs % 86400) / 3600),
    minutes: Math.floor((secs % 3600) / 60),
    seconds: secs % 60,
    total:   secs,
    expired: secs === 0,
    urgent:  secs <= 120 && secs > 0,
  };
}
