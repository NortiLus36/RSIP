interface Timers {
  setInterval: (tick: () => void, ms: number) => number;
  clearInterval: (id: number) => void;
}
// One interval per effect lifetime; callers return this cleanup on pause/unmount.
export function startPlayback(
  tick: () => void,
  speed: 1 | 2 | 5,
  timers: Timers,
) {
  const id = timers.setInterval(tick, 1500 / speed);
  return () => timers.clearInterval(id);
}
