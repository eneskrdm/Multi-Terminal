import { clsx } from "clsx";
import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./Button.css";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "secondary",
    size = "md",
    leftIcon,
    rightIcon,
    loading = false,
    fullWidth = false,
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
      data-loading={loading || undefined}
      className={clsx(
        "mt-button",
        fullWidth && "mt-button--full-width",
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span className="mt-button__spinner" aria-hidden="true" />
      ) : leftIcon ? (
        <span className="mt-button__icon mt-button__icon--left">{leftIcon}</span>
      ) : null}
      {children != null && <span className="mt-button__label">{children}</span>}
      {!loading && rightIcon ? (
        <span className="mt-button__icon mt-button__icon--right">{rightIcon}</span>
      ) : null}
    </button>
  );
});
