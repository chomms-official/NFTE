export const AUTOPILOT_STOP_MS = 5000;

/** The dwell starts on arrival, independently of how long a flight takes. */
export function createAutopilotStops(
  next: () => void,
  clock = {
    setTimeout: (callback: () => void, delay: number) => globalThis.setTimeout(callback, delay),
    clearTimeout: (timer: ReturnType<typeof setTimeout>) => globalThis.clearTimeout(timer),
  },
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  const depart = () => {
    if (timer !== undefined) clock.clearTimeout(timer);
    timer = undefined;
  };
  return {
    depart,
    arrive() {
      depart();
      if (stopped) return;
      timer = clock.setTimeout(() => {
        timer = undefined;
        if (!stopped) next();
      }, AUTOPILOT_STOP_MS);
    },
    stop() { stopped = true; depart(); },
  };
}
