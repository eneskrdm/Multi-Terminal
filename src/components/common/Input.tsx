import { clsx } from "clsx";
import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import "./Input.css";

export type InputSize = "sm" | "md" | "lg";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  invalid?: boolean;
  size?: InputSize;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    leftIcon,
    rightIcon,
    invalid = false,
    size = "md",
    disabled,
    className,
    containerClassName,
    type = "text",
    ...rest
  },
  ref,
) {
  return (
    <div
      data-size={size}
      data-invalid={invalid || undefined}
      data-disabled={disabled || undefined}
      className={clsx(
        "mt-input",
        leftIcon && "mt-input--has-left",
        rightIcon && "mt-input--has-right",
        containerClassName,
      )}
    >
      {leftIcon != null && (
        <span className="mt-input__icon mt-input__icon--left" aria-hidden="true">
          {leftIcon}
        </span>
      )}
      <input
        ref={ref}
        type={type}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={clsx("mt-input__control", className)}
        {...rest}
      />
      {rightIcon != null && (
        <span className="mt-input__icon mt-input__icon--right" aria-hidden="true">
          {rightIcon}
        </span>
      )}
    </div>
  );
});
