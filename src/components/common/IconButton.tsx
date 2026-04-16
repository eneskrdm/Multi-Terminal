import { clsx } from "clsx";
import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./IconButton.css";

export type IconButtonVariant = "default" | "ghost" | "danger";
export type IconButtonSize = "sm" | "md" | "lg";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  shape?: "square" | "circle";
  loading?: boolean;
  "aria-label": string;
  children: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    variant = "ghost",
    size = "md",
    shape = "square",
    loading = false,
    disabled,
    className,
    children,
    type = "button",
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      data-variant={variant}
      data-size={size}
      data-shape={shape}
      data-loading={loading || undefined}
      className={clsx("mt-icon-button", className)}
      {...rest}
    >
      {loading ? (
        <span className="mt-icon-button__spinner" aria-hidden="true" />
      ) : (
        <span className="mt-icon-button__icon">{children}</span>
      )}
    </button>
  );
});
