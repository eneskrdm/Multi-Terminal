import clsx from "clsx";
import { useSettingsStore } from "@/store/settings";
import type {
  BellStyle,
  CursorStyle,
  RightClickBehavior,
} from "@/types";

export function Terminal() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);

  return (
    <div className="settings-section">
      <h2 className="settings-section__title">Terminal</h2>

      <div className="settings-row">
        <div className="settings-row__label">
          <span className="settings-row__label-text">Cursor style</span>
        </div>
        <div className="settings-row__control">
          <Segmented<CursorStyle>
            value={settings.cursorStyle}
            options={[
              { value: "block", label: "Block" },
              { value: "underline", label: "Underline" },
              { value: "bar", label: "Bar" },
            ]}
            onChange={(v) => update({ cursorStyle: v })}
          />
        </div>
      </div>

      <SwitchRow
        label="Cursor blink"
        hint="Blink the cursor when focused."
        checked={settings.cursorBlink}
        onChange={(v) => update({ cursorBlink: v })}
      />

      <div className="settings-row">
        <div className="settings-row__label">
          <span className="settings-row__label-text">Scrollback</span>
          <span className="settings-row__hint">
            Lines of output kept in terminal history.
          </span>
        </div>
        <div className="settings-row__control">
          <input
            type="number"
            className="settings-input settings-input--number"
            min={100}
            max={100000}
            step={100}
            value={settings.scrollback}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!Number.isNaN(v)) {
                update({ scrollback: Math.max(100, Math.min(100000, v)) });
              }
            }}
          />
        </div>
      </div>

      <div className="settings-row">
        <div className="settings-row__label">
          <span className="settings-row__label-text">Bell style</span>
          <span className="settings-row__hint">
            How to respond to terminal bell.
          </span>
        </div>
        <div className="settings-row__control">
          <select
            className="settings-select"
            value={settings.bellStyle}
            onChange={(e) =>
              update({ bellStyle: e.target.value as BellStyle })
            }
          >
            <option value="none">None</option>
            <option value="sound">Sound</option>
            <option value="visual">Visual</option>
          </select>
        </div>
      </div>

      <SwitchRow
        label="Copy on select"
        hint="Automatically copy selected text to clipboard."
        checked={settings.copyOnSelect}
        onChange={(v) => update({ copyOnSelect: v })}
      />

      <div className="settings-row">
        <div className="settings-row__label">
          <span className="settings-row__label-text">Right-click behavior</span>
        </div>
        <div className="settings-row__control">
          <select
            className="settings-select"
            value={settings.rightClickBehavior}
            onChange={(e) =>
              update({
                rightClickBehavior: e.target.value as RightClickBehavior,
              })
            }
          >
            <option value="paste">Paste</option>
            <option value="menu">Context menu</option>
            <option value="selectWord">Select word</option>
          </select>
        </div>
      </div>

      <div className="settings-row">
        <div className="settings-row__label">
          <span className="settings-row__label-text">Word separators</span>
          <span className="settings-row__hint">
            Characters that delimit double-click word selection.
          </span>
        </div>
        <div className="settings-row__control">
          <input
            type="text"
            className="settings-input"
            value={settings.wordSeparators}
            onChange={(e) => update({ wordSeparators: e.target.value })}
          />
        </div>
      </div>

      <SwitchRow
        label="Smooth scrolling"
        hint="Animate terminal scroll with eased transitions."
        checked={settings.smoothScrolling}
        onChange={(v) => update({ smoothScrolling: v })}
      />
    </div>
  );
}

interface SegmentedProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: SegmentedProps<T>) {
  return (
    <div className="settings-segmented">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={clsx(
            "settings-segmented__btn",
            value === opt.value && "settings-segmented__btn--active",
          )}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

interface SwitchRowProps {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function SwitchRow({ label, hint, checked, onChange }: SwitchRowProps) {
  return (
    <div className="settings-row">
      <div className="settings-row__label">
        <span className="settings-row__label-text">{label}</span>
        {hint && <span className="settings-row__hint">{hint}</span>}
      </div>
      <div className="settings-row__control">
        <label className="settings-switch">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className="settings-switch__slider" />
        </label>
      </div>
    </div>
  );
}
