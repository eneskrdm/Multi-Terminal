import { clsx } from "clsx";
import { ChevronDown } from "lucide-react";
import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";
import "./Select.css";

export type SelectSize = "sm" | "md" | "lg";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  options?: SelectOption[];
  invalid?: boolean;
  size?: SelectSize;
  containerClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    options,
    invalid = false,
    size = "md",
    disabled,
    className,
    containerClassName,
    children,
    ...rest
  },
  ref,
) {
  return (
    <div
      data-size={size}
      data-invalid={invalid || undefined}
      data-disabled={disabled || undefined}
      className={clsx("mt-select", containerClassName)}
    >
      <select
        ref={ref}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={clsx("mt-select__control", className)}
        {...rest}
      >
        {options
          ? options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))
          : children}
      </select>
      <span className="mt-select__chevron" aria-hidden="true">
        <ChevronDown />
      </span>
    </div>
  );
});
