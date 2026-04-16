import { clsx } from "clsx";
import { motion } from "framer-motion";
import { useId } from "react";
import type { ReactNode } from "react";
import "./SegmentedControl.css";

export type SegmentedControlSize = "sm" | "md" | "lg";

export interface SegmentedOption<T extends string = string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  ariaLabel?: string;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: SegmentedControlSize;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = "md",
  disabled = false,
  fullWidth = false,
  className,
  ariaLabel,
}: SegmentedControlProps<T>): JSX.Element {
  const layoutId = useId();

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      data-size={size}
      data-disabled={disabled || undefined}
      data-full-width={fullWidth || undefined}
      className={clsx("mt-segmented", className)}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        const isDisabled = disabled || opt.disabled;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={opt.ariaLabel}
            tabIndex={selected ? 0 : -1}
            disabled={isDisabled}
            data-selected={selected || undefined}
            onClick={() => !isDisabled && onChange(opt.value)}
            className="mt-segmented__option"
          >
            {selected && (
              <motion.span
                layoutId={`mt-segmented-pill-${layoutId}`}
                className="mt-segmented__pill"
                transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.8 }}
                aria-hidden="true"
              />
            )}
            <span className="mt-segmented__content">
              {opt.icon != null && (
                <span className="mt-segmented__icon" aria-hidden="true">
                  {opt.icon}
                </span>
              )}
              {opt.label != null && <span className="mt-segmented__label">{opt.label}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
