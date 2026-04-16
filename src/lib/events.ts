export type AppEvent =
  | { type: "focus-active-terminal" }
  | { type: "terminal-zoom"; delta: number }
  | { type: "terminal-zoom-reset" }
  | { type: "terminal-clear" }
  | { type: "terminal-search" }
  | { type: "terminal-copy" }
  | { type: "terminal-paste" }
  | { type: "terminal-select-all" }
  | { type: "pane-split"; direction: "horizontal" | "vertical" }
  | { type: "pane-close" }
  | { type: "pane-focus"; direction: "left" | "right" | "up" | "down" };

type AnyHandler = (e: AppEvent) => void;

const handlers: Map<string, Set<AnyHandler>> = new Map();

export function emit(event: AppEvent): void {
  const bucket = handlers.get(event.type);
  if (!bucket) return;
  for (const handler of Array.from(bucket)) {
    try {
      handler(event);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[events] handler for "${event.type}" threw`, err);
    }
  }
}

export function on<T extends AppEvent["type"]>(
  type: T,
  handler: (e: Extract<AppEvent, { type: T }>) => void,
): () => void {
  let bucket = handlers.get(type);
  if (!bucket) {
    bucket = new Set();
    handlers.set(type, bucket);
  }
  const wrapped = handler as AnyHandler;
  bucket.add(wrapped);
  return () => {
    const current = handlers.get(type);
    if (!current) return;
    current.delete(wrapped);
    if (current.size === 0) handlers.delete(type);
  };
}
