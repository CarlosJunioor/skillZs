"use client";
// Adapted from beui.dev/components/motion/input.

import { animate, useReducedMotion } from "motion/react";
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

export type InputClassNames = {
  root?: string;
  label?: string;
  field?: string;
  input?: string;
  leftIcon?: string;
  rightIcon?: string;
};

export interface InputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "defaultValue" | "onChange"
> {
  label?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  error?: string | boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  classNames?: InputClassNames;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    value: valueProp,
    defaultValue,
    onChange,
    onFocus,
    onBlur,
    error,
    leftIcon,
    rightIcon,
    className,
    classNames,
    disabled,
    id: idProp,
    type,
    ...rest
  },
  ref,
) {
  const reactId = useId();
  const id = idProp ?? reactId;
  const reduce = useReducedMotion();
  const controlled = valueProp !== undefined;
  const [internal, setInternal] = useState(defaultValue ?? "");
  const value = controlled ? (valueProp ?? "") : internal;
  const [focused, setFocused] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const hasError = Boolean(error);

  useEffect(() => {
    if (!fieldRef.current || reduce || !hasError) return;
    animate(fieldRef.current, { x: [0, -6, 6, -4, 4, -2, 0] }, { duration: 0.45 });
  }, [hasError, reduce]);

  return (
    <div className={cn("flex flex-col gap-1.5", className, classNames?.root)}>
      {label ? (
        <label htmlFor={id} className={cn("px-1 text-sm font-medium text-foreground", classNames?.label)}>
          {label}
        </label>
      ) : null}
      <div
        ref={fieldRef}
        className={cn(
          "relative h-11 overflow-hidden rounded-full border border-border transition-colors duration-200",
          focused && !hasError && "border-primary ring-2 ring-ring/25",
          hasError && "border-destructive ring-2 ring-destructive/25",
          disabled && "opacity-60",
          classNames?.field,
        )}
      >
        {leftIcon ? (
          <span className={cn("pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 items-center text-muted-foreground", classNames?.leftIcon)}>
            {leftIcon}
          </span>
        ) : null}
        <input
          ref={ref}
          id={id}
          type={type}
          value={value}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          {...rest}
          onChange={(event) => {
            if (!controlled) setInternal(event.target.value);
            onChange?.(event.target.value);
          }}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          className={cn(
            "peer h-full w-full bg-transparent text-base leading-6 text-foreground caret-foreground outline-none placeholder:text-muted-foreground/60",
            leftIcon ? "pl-10" : "pl-3.5",
            rightIcon ? "pr-10" : "pr-3.5",
            disabled && "cursor-not-allowed",
            classNames?.input,
          )}
        />
        {rightIcon ? (
          <span className={cn("absolute right-3 top-1/2 flex -translate-y-1/2 items-center text-muted-foreground", classNames?.rightIcon)}>
            {rightIcon}
          </span>
        ) : null}
      </div>
    </div>
  );
});
