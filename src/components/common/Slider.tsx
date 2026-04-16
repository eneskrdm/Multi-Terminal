import { clsx } from "clsx";
import { forwardRef, useMemo } from "react";
import type { ChangeEvent, CSSProperties, InputHTMLAttributes, ReactNode } from "react";
import "./Slider.css";

export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  formatValue?: (value: number) => ReactNode;
  showValue?: boolean;
  label?: ReactNode;
  containerClassName?: string;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(function Slider(
  {
    min = 0,
    max = 100,
    step = 1,
    value,
    onChange,
    formatValue,
    showValue = true,
    label,
    disabled,
    className,
    containerClassName,
    ...rest
  },
  ref,
) {
  const percent = useMemo(() => {
    if (max === min) return 0;
    const clamped = Math.min(Math.max(value, min), max);
    return ((clamped - min) / (max - min)) * 100;
  }, [value, min, max]);

  const displayValue = formatValue ? formatValue(value) : value;

  return (
    <div
      data-disabled={disabled || undefined}
      className={clsx("mt-slider", containerClassName)}
      style={{ "--mt-slider-progress": `${percent}%` } as CSSProperties}
    >
      {label != null && <span className="mt-slider__label">{label}</span>}
      <input
        ref={ref}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={clsx("mt-slider__control", className)}
        {...rest}
      />
      {showValue && <span className="mt-slider__value">{displayValue}</span>}
    </div>
  );
});
