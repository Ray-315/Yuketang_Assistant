import { useEffect, useMemo, useRef, useState } from "react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

type Option = {
  label: string;
  value: string;
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "sm";
  active?: boolean;
};

export function MacButton({
  variant = "secondary",
  size = "md",
  active = false,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  const classes = [
    "mac-button",
    `is-${variant}`,
    size === "sm" ? "is-sm" : "",
    active ? "is-active" : "",
    className ?? ""
  ].filter(Boolean).join(" ");
  return <button type={type} className={classes} {...props} />;
}

export function MacInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={["mac-input", className].filter(Boolean).join(" ")} {...props} />;
}

export function MacTextarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={["mac-textarea", className].filter(Boolean).join(" ")} {...props} />;
}

type SelectProps = {
  value: string;
  options: Option[];
  placeholder?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function MacSelect({ value, options, placeholder = "请选择", onChange, disabled = false }: SelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = useMemo(() => options.find((option) => option.value === value), [options, value]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <div className={`mac-select ${open ? "is-open" : ""} ${disabled ? "is-disabled" : ""}`} ref={rootRef}>
      <button type="button" className="mac-select-trigger" disabled={disabled} aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        <span className={selected ? "mac-select-value" : "mac-select-value is-placeholder"}>{selected?.label ?? placeholder}</span>
        <span className="mac-select-caret">▾</span>
      </button>
      {open ? (
        <div className="mac-select-menu">
          {options.map((option) => (
            <button
              type="button"
              key={option.value}
              className={option.value === value ? "mac-select-option is-active" : "mac-select-option"}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type SegmentProps = {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
};

export function MacSegmented({ value, options, onChange }: SegmentProps) {
  return (
    <div className="mac-segmented">
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          className={option.value === value ? "mac-segment is-active" : "mac-segment"}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function MacField({
  label,
  children,
  hint
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="mac-field">
      <span className="mac-field-label">{label}</span>
      {children}
      {hint ? <small className="mac-field-hint">{hint}</small> : null}
    </label>
  );
}
