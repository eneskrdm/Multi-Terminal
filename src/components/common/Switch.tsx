import { clsx } from "clsx";
import { forwardRef } from "react";
import type { ReactNode, KeyboardEvent } from "react";
import "./Switch.css";

export type SwitchSize = "sm" | "md";

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: ReactNode;
  description?: ReactNode;
  size?: SwitchSize;
  id?: string;
  name?: string;
  className?: string;
  ariaLabel?: string;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  {
    checked,
    onChange,
    disabled = false,
    label,
    description,
    size = "md",
    id,
    name,
    className,
    ariaLabel,
  },
  ref,
) {
  const toggle = () => {
    if (disabled) return;
    onChange(!checked);
  };

  const handleKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      toggle();
    }
  };

  const track = (
    <button
      ref={ref}
      id={id}
      name={name}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label == null ? ariaLabel : undefined}
      aria-labelledby={undefined}
      disabled={disabled}
      data-size={size}
      data-checked={checked || undefined}
      onClick={toggle}
      onKeyDown={handleKey}
      className={clsx("mt-switch", !label && className)}
    >
      <span className="mt-switch__track" aria-hidden="true">
        <span className="mt-switch__thumb" />
      </span>
    </button>
  );

  if (label == null && description == null) {
    return track;
  }

  return (
    <label
      data-disabled={disabled || undefined}
      className={clsx("mt-switch-field", className)}
    >
      {track}
      <span className="mt-switch-field__text">
        {label != null && <span className="mt-switch-field__label">{label}</span>}
        {description != null && (
          <span className="mt-switch-field__description">{description}</span>
        )}
      </span>
    </label>
  );
});
