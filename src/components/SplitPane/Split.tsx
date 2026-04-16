import {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  useCallback,
  useRef,
  useState,
} from "react";
import clsx from "clsx";
import { useLayoutStore } from "@/store/layout";
import type { PaneNode, PaneNodeSplit } from "@/types";
import { NodeRenderer } from "./SplitPaneTree";

interface SplitProps {
  node: PaneNodeSplit;
  tabId: string;
  activePaneId: string;
}

interface DragState {
  index: number;
  startClient: number;
  sizeLeft: number;
  sizeRight: number;
  totalPx: number;
  initialSizes: number[];
}

const MIN_CHILD_FRACTION = 0.08;

export function Split({ node, tabId, activePaneId }: SplitProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const resizeSplit = useLayoutStore((s) => s.resizeSplit);
  const panes = useLayoutStore((s) => s.panes);

  const [liveSizes, setLiveSizes] = useState<number[] | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const dragStateRef = useRef<DragState | null>(null);

  const sizes = liveSizes ?? node.sizes;
  const isHorizontal = node.direction === "horizontal";

  const handlePointerDown = useCallback(
    (index: number) => (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      const container = containerRef.current;
      if (!container) return;
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const totalPx = isHorizontal ? rect.width : rect.height;
      if (totalPx <= 0) return;

      const startClient = isHorizontal ? e.clientX : e.clientY;
      const sizeLeft = node.sizes[index] ?? 0.5;
      const sizeRight = node.sizes[index + 1] ?? 0.5;

      dragStateRef.current = {
        index,
        startClient,
        sizeLeft,
        sizeRight,
        totalPx,
        initialSizes: node.sizes.slice(),
      };
      setDraggingIndex(index);
      (e.target as Element).setPointerCapture(e.pointerId);
    },
    [isHorizontal, node.sizes],
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const state = dragStateRef.current;
      if (!state) return;
      const delta = (isHorizontal ? e.clientX : e.clientY) - state.startClient;
      const deltaFrac = delta / state.totalPx;
      const minFrac = MIN_CHILD_FRACTION;

      let nextLeft = state.sizeLeft + deltaFrac;
      let nextRight = state.sizeRight - deltaFrac;

      if (nextLeft < minFrac) {
        nextRight -= minFrac - nextLeft;
        nextLeft = minFrac;
      }
      if (nextRight < minFrac) {
        nextLeft -= minFrac - nextRight;
        nextRight = minFrac;
      }

      const next = state.initialSizes.slice();
      next[state.index] = nextLeft;
      next[state.index + 1] = nextRight;
      setLiveSizes(next);
    },
    [isHorizontal],
  );

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const state = dragStateRef.current;
      if (!state) return;
      try {
        (e.target as Element).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      dragStateRef.current = null;
      setDraggingIndex(null);
      const committed = liveSizes;
      setLiveSizes(null);
      if (committed) {
        resizeSplit(node.id, committed);
      }
    },
    [liveSizes, node.id, resizeSplit],
  );

  const handleDividerKeyDown = useCallback(
    (index: number) => (e: ReactKeyboardEvent<HTMLDivElement>) => {
      const step = e.shiftKey ? 0.05 : 0.02;
      let dir = 0;
      if (isHorizontal) {
        if (e.key === "ArrowLeft") dir = -1;
        else if (e.key === "ArrowRight") dir = 1;
      } else {
        if (e.key === "ArrowUp") dir = -1;
        else if (e.key === "ArrowDown") dir = 1;
      }
      if (dir === 0) return;
      e.preventDefault();
      const minFrac = MIN_CHILD_FRACTION;
      const current = node.sizes.slice();
      let left = current[index] + dir * step;
      let right = current[index + 1] - dir * step;
      if (left < minFrac) {
        right -= minFrac - left;
        left = minFrac;
      }
      if (right < minFrac) {
        left -= minFrac - right;
        right = minFrac;
      }
      current[index] = left;
      current[index + 1] = right;
      resizeSplit(node.id, current);
    },
    [isHorizontal, node.id, node.sizes, resizeSplit],
  );

  const className = clsx("mt-split", {
    "mt-split--horizontal": isHorizontal,
    "mt-split--vertical": !isHorizontal,
  });

  const elements: JSX.Element[] = [];
  for (let i = 0; i < node.children.length; i += 1) {
    const childId = node.children[i];
    const childNode: PaneNode | undefined = panes[childId];
    const size = sizes[i] ?? 1 / node.children.length;

    elements.push(
      <div
        key={`child-${childId}`}
        className="mt-split__child"
        style={{
          flex: `${size} 0 0`,
          minWidth: isHorizontal ? 0 : undefined,
          minHeight: !isHorizontal ? 0 : undefined,
        }}
      >
        {childNode ? (
          <NodeRenderer node={childNode} tabId={tabId} activePaneId={activePaneId} />
        ) : null}
      </div>,
    );

    if (i < node.children.length - 1) {
      elements.push(
        <div
          key={`divider-${childId}-${i}`}
          role="separator"
          tabIndex={0}
          aria-orientation={isHorizontal ? "vertical" : "horizontal"}
          aria-label={
            isHorizontal
              ? "Resize horizontal split (Left/Right arrows)"
              : "Resize vertical split (Up/Down arrows)"
          }
          className={clsx("mt-split__divider", {
            "mt-split__divider--dragging": draggingIndex === i,
          })}
          onPointerDown={handlePointerDown(i)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={handleDividerKeyDown(i)}
        />,
      );
    }
  }

  return (
    <div className={className} ref={containerRef}>
      {elements}
    </div>
  );
}
