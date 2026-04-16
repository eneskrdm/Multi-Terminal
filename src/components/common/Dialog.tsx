import { clsx } from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { MouseEvent, ReactNode } from "react";
import { IconButton } from "./IconButton";
import "./Dialog.css";

export type DialogSize = "sm" | "md" | "lg" | "xl";

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: DialogSize;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  showCloseButton?: boolean;
  className?: string;
  contentClassName?: string;
  ariaLabel?: string;
}

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  closeOnBackdrop = true,
  closeOnEsc = true,
  showCloseButton = true,
  className,
  contentClassName,
  ariaLabel,
}: DialogProps): JSX.Element | null {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, closeOnEsc, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const previousActive = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (dialog) {
      const focusable = dialog.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      (focusable ?? dialog).focus({ preventScroll: true });
    }
    return () => {
      previousActive?.focus?.({ preventScroll: true });
    };
  }, [isOpen]);

  const handleBackdrop = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!closeOnBackdrop) return;
      if (e.target === e.currentTarget) onClose();
    },
    [closeOnBackdrop, onClose],
  );

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="mt-dialog__backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
          onMouseDown={handleBackdrop}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            tabIndex={-1}
            data-size={size}
            className={clsx("mt-dialog", className)}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {(title || showCloseButton) && (
              <header className="mt-dialog__header">
                <div className="mt-dialog__titles">
                  {title != null && <h2 className="mt-dialog__title">{title}</h2>}
                  {description != null && (
                    <p className="mt-dialog__description">{description}</p>
                  )}
                </div>
                {showCloseButton && (
                  <IconButton
                    size="sm"
                    variant="ghost"
                    onClick={onClose}
                    aria-label="Close dialog"
                    className="mt-dialog__close"
                  >
                    <X />
                  </IconButton>
                )}
              </header>
            )}
            <div className={clsx("mt-dialog__content", contentClassName)}>{children}</div>
            {footer != null && <footer className="mt-dialog__footer">{footer}</footer>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
