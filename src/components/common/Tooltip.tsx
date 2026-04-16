import { clsx } from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type {
  FocusEvent as ReactFocusEvent,
  MouseEvent as ReactMouseEvent,
  MutableRefObject,
  ReactElement,
  ReactNode,
  Ref,
} from "react";
import "./Tooltip.css";

export type TooltipSide = "top" | "bottom" | "left" | "right";

export interface TooltipProps {
  content: ReactNode;
  children: ReactElement;
  side?: TooltipSide;
  align?: "start" | "center" | "end";
  delay?: number;
  disabled?: boolean;
  className?: string;
  offset?: number;
}

interface Position {
  left: number;
  top: number;
  side: TooltipSide;
}

export function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
  delay = 350,
  disabled = false,
  className,
  offset = 8,
}: TooltipProps): JSX.Element {
  const tooltipId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Position>({ left: 0, top: 0, side });

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const show = useCallback(() => {
    if (disabled || content == null || content === false) return;
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      setOpen(true);
    }, delay);
  }, [disabled, content, delay, clearTimer]);

  const hide = useCallback(() => {
    clearTimer();
    setOpen(false);
  }, [clearTimer]);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => hide();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, hide]);

  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!trigger || !tooltip) return;

    const rect = trigger.getBoundingClientRect();
    const tipRect = tooltip.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 6;

    let finalSide: TooltipSide = side;
    const fits = (s: TooltipSide): boolean => {
      if (s === "top") return rect.top - tipRect.height - offset >= pad;
      if (s === "bottom") return rect.bottom + tipRect.height + offset <= vh - pad;
      if (s === "left") return rect.left - tipRect.width - offset >= pad;
      return rect.right + tipRect.width + offset <= vw - pad;
    };
    if (!fits(finalSide)) {
      const opposites: Record<TooltipSide, TooltipSide> = {
        top: "bottom",
        bottom: "top",
        left: "right",
        right: "left",
      };
      if (fits(opposites[finalSide])) finalSide = opposites[finalSide];
    }

    let left = 0;
    let top = 0;
    if (finalSide === "top" || finalSide === "bottom") {
      if (align === "start") left = rect.left;
      else if (align === "end") left = rect.right - tipRect.width;
      else left = rect.left + (rect.width - tipRect.width) / 2;
      top = finalSide === "top" ? rect.top - tipRect.height - offset : rect.bottom + offset;
    } else {
      if (align === "start") top = rect.top;
      else if (align === "end") top = rect.bottom - tipRect.height;
      else top = rect.top + (rect.height - tipRect.height) / 2;
      left = finalSide === "left" ? rect.left - tipRect.width - offset : rect.right + offset;
    }

    left = Math.max(pad, Math.min(left, vw - tipRect.width - pad));
    top = Math.max(pad, Math.min(top, vh - tipRect.height - pad));

    setPos({ left, top, side: finalSide });
  }, [open, side, align, offset, content]);

  if (!isValidElement(children)) {
    return children as unknown as JSX.Element;
  }

  const child = children as ReactElement<{
    ref?: Ref<HTMLElement>;
    onMouseEnter?: (e: ReactMouseEvent) => void;
    onMouseLeave?: (e: ReactMouseEvent) => void;
    onFocus?: (e: ReactFocusEvent) => void;
    onBlur?: (e: ReactFocusEvent) => void;
    "aria-describedby"?: string;
  }>;

  const triggerProps = {
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;
      const childRef = (child as unknown as { ref?: Ref<HTMLElement> }).ref;
      if (typeof childRef === "function") childRef(node);
      else if (childRef && typeof childRef === "object")
        (childRef as MutableRefObject<HTMLElement | null>).current = node;
    },
    onMouseEnter: (e: ReactMouseEvent) => {
      child.props.onMouseEnter?.(e);
      show();
    },
    onMouseLeave: (e: ReactMouseEvent) => {
      child.props.onMouseLeave?.(e);
      hide();
    },
    onFocus: (e: ReactFocusEvent) => {
      child.props.onFocus?.(e);
      show();
    },
    onBlur: (e: ReactFocusEvent) => {
      child.props.onBlur?.(e);
      hide();
    },
    "aria-describedby": open ? tooltipId : undefined,
  };

  const trigger = cloneElement(child, triggerProps);

  const portal =
    typeof document !== "undefined"
      ? createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                ref={tooltipRef}
                id={tooltipId}
                role="tooltip"
                data-side={pos.side}
                className={clsx("mt-tooltip", className)}
                style={{ left: pos.left, top: pos.top }}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.12, ease: [0.4, 0, 0.2, 1] }}
              >
                {content}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )
      : null;

  return (
    <>
      {trigger}
      {portal}
    </>
  );
}
