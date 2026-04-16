import { Minus, Square, X } from "lucide-react";
import {
  windowClose,
  windowMinimize,
  windowToggleMaximize,
} from "@/lib/tauri";

interface WindowControlsProps {
  isMaximized: boolean;
}

function RestoreIcon({ size = 12 }: { size?: number }): JSX.Element {
  // Two overlapping squares — canonical "restore" Windows icon.
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      aria-hidden="true"
    >
      <rect x="2.75" y="2.75" width="6.5" height="6.5" rx="0.5" />
      <path d="M4.5 2.75V1.5h4.75V6.25H8" />
    </svg>
  );
}

export function WindowControls({
  isMaximized,
}: WindowControlsProps): JSX.Element {
  const handleMinimize = (): void => {
    void windowMinimize();
  };

  const handleToggle = (): void => {
    void windowToggleMaximize();
  };

  const handleClose = (): void => {
    void windowClose();
  };

  return (
    <div className="mt-wincontrols" role="group" aria-label="Window controls">
      <button
        type="button"
        className="mt-wincontrols__btn mt-wincontrols__btn--minimize"
        aria-label="Minimize window"
        onClick={handleMinimize}
        tabIndex={-1}
      >
        <Minus size={14} strokeWidth={1.5} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="mt-wincontrols__btn mt-wincontrols__btn--maximize"
        aria-label={isMaximized ? "Restore window" : "Maximize window"}
        onClick={handleToggle}
        tabIndex={-1}
      >
        {isMaximized ? (
          <RestoreIcon size={12} />
        ) : (
          <Square size={11} strokeWidth={1.5} aria-hidden="true" />
        )}
      </button>
      <button
        type="button"
        className="mt-wincontrols__btn mt-wincontrols__btn--close"
        aria-label="Close window"
        onClick={handleClose}
        tabIndex={-1}
      >
        <X size={15} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  );
}
