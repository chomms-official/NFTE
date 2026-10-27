export interface PresentationPosition {
  index: number;
  progress: number;
}

// Keep slide selection and progress together. React may replay an updater in
// Strict Mode, so an updater must never enqueue a second state update.
export function advancePresentation(
  position: PresentationPosition,
  delta: number,
  count: number,
): PresentationPosition {
  if (count === 0) return position;
  const progress = position.progress + delta;
  if (progress > 1.8) return { index: (position.index + 1) % count, progress: 0 };
  if (progress < 0) return { index: (position.index - 1 + count) % count, progress: 1.8 };
  return { ...position, progress };
}

