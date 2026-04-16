import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";

const HEX_RE = /^#([0-9a-fA-F]{6})$/;

export interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function ColorField({ label, value, onChange }: ColorFieldProps) {
  const fieldId = useId();
  const pickerRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(value);
  }, [value, focused]);

  const valid = HEX_RE.test(draft);

  const commit = (next: string) => {
    const normalized = next.startsWith("#") ? next : `#${next}`;
    if (HEX_RE.test(normalized)) {
      onChange(normalized.toLowerCase());
    }
  };

  const openPicker = () => {
    pickerRef.current?.click();
  };

  return (
    <label className="mt-color-field" htmlFor={fieldId}>
      <span className="mt-color-field__label">{label}</span>
      <div className={clsx("mt-color-field__control", { "is-invalid": !valid })}>
        <button
          type="button"
          className="mt-color-field__swatch"
          style={{ backgroundColor: valid ? draft : value }}
          onClick={openPicker}
          aria-label={`Pick color for ${label}`}
        />
        <input
          id={fieldId}
          className="mt-color-field__input"
          type="text"
          value={draft}
          spellCheck={false}
          autoComplete="off"
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            if (valid) commit(draft);
            else setDraft(value);
          }}
          onChange={(e) => {
            const next = e.target.value;
            setDraft(next);
            if (HEX_RE.test(next)) commit(next);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              (e.target as HTMLInputElement).blur();
            } else if (e.key === "Escape") {
              setDraft(value);
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
        <button
          type="button"
          className="mt-color-field__chevron"
          onClick={openPicker}
          aria-label={`Open color picker for ${label}`}
        >
          <ChevronDown size={14} />
        </button>
        <input
          ref={pickerRef}
          className="mt-color-field__native"
          type="color"
          value={valid ? draft : value}
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const next = e.target.value.toLowerCase();
            setDraft(next);
            onChange(next);
          }}
        />
      </div>
    </label>
  );
}
