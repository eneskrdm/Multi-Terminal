import { clsx } from "clsx";
import { Children, Fragment, isValidElement } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import "./Kbd.css";

export type KbdSize = "sm" | "md";

export interface KbdProps extends HTMLAttributes<HTMLElement> {
  size?: KbdSize;
  children: ReactNode;
}

export function Kbd({ size = "md", className, children, ...rest }: KbdProps): JSX.Element {
  return (
    <kbd data-size={size} className={clsx("mt-kbd", className)} {...rest}>
      {children}
    </kbd>
  );
}

export interface KbdGroupProps extends HTMLAttributes<HTMLSpanElement> {
  separator?: ReactNode;
  children: ReactNode;
}

export function KbdGroup({
  separator,
  className,
  children,
  ...rest
}: KbdGroupProps): JSX.Element {
  const items = Children.toArray(children);
  const sep = separator ?? null;

  return (
    <span className={clsx("mt-kbd-group", className)} {...rest}>
      {items.map((child, i) => {
        const key = isValidElement(child) && child.key != null ? child.key : i;
        return (
          <Fragment key={key}>
            {i > 0 && sep != null && (
              <span className="mt-kbd-group__sep" aria-hidden="true">
                {sep}
              </span>
            )}
            {child}
          </Fragment>
        );
      })}
    </span>
  );
}
