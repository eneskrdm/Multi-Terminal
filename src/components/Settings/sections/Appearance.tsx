import { useMemo, useState } from "react";
import { Edit3 } from "lucide-react";
import clsx from "clsx";
import { useSettingsStore } from "@/store/settings";
import { useThemesStore } from "@/store/themes";
import { ThemeEditor } from "@/components/ThemeEditor";

const FONT_SUGGESTIONS = [
  "Cascadia Code",
  "Consolas",
  "Fira Code",
  "JetBrains Mono",
  "Hack",
  "Source Code Pro",
  "SF Mono",
  "Menlo",
];

export function Appearance() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const setActiveTheme = useThemesStore((s) => s.setActiveTheme);
  const builtInThemes = useThemesStore((s) => s.builtInThemes);
  const customThemes = useThemesStore((s) => s.customThemes);
  const allThemes = useMemo(
    () => [...builtInThemes, ...customThemes],
    [builtInThemes, customThemes],
  );

  const [themeEditorOpen, setThemeEditorOpen] = useState(false);

  const handleThemeSelect = (themeId: string) => {
    update({ themeId });
    setActiveTheme(themeId);
  };

  return (
    <div className="settings-section">
      <h2 className="settings-section__title">Appearance</h2>

      <div className="settings-row settings-row--block">
        <div className="settings-row__label">
          <span className="settings-row__label-text">Theme</span>
          <span className="settings-row__hint">
            Choose from built-in themes or customize your own.
          </span>
        </div>
        <div className="settings-theme-grid">
          {allThemes.map((theme) => (
            <button
              key={theme.id}
              type="button"
              className={clsx(
                "settings-theme-card",
                settings.themeId === theme.id && "settings-theme-card--active",
              )}
              onClick={() => handleThemeSelect(theme.id)}
            >
              <div className="settings-theme-card__swatches">
                <div
                  className="settings-theme-card__swatch"
                  style={{ background: theme.terminal.background }}
                />
                <div
                  className="settings-theme-card__swatch"
                  style={{ background: theme.ui.accent }}
                />
                <div
                  className="settings-theme-card__swatch"
                  style={{ background: theme.terminal.ansi.green }}
                />
                <div
                  className="settings-theme-card__swatch"
                  style={{ background: theme.terminal.ansi.red }}
                />
              </div>
              <span className="settings-theme-card__name">{theme.name}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="settings-btn"
          onClick={() => setThemeEditorOpen(true)}
        >
          <Edit3 size={14} />
          Customize theme…
        </button>
      </div>

      <div className="settings-row">
        <div className="settings-row__label">
          <span className="settings-row__label-text">Font family</span>
          <span className="settings-row__hint">
            Monospace fonts work best for terminals.
          </span>
        </div>
        <div className="settings-row__control">
          <input
            type="text"
            className="settings-input"
            list="settings-font-list"
            value={settings.fontFamily}
            onChange={(e) => update({ fontFamily: e.target.value })}
          />
          <datalist id="settings-font-list">
            {FONT_SUGGESTIONS.map((font) => (
              <option key={font} value={font} />
            ))}
          </datalist>
        </div>
      </div>

      <RangeRow
        label="Font size"
        hint="Terminal and UI text size in pixels."
        value={settings.fontSize}
        min={8}
        max={36}
        step={1}
        onChange={(v) => update({ fontSize: v })}
      />

      <RangeRow
        label="Font weight"
        value={settings.fontWeight}
        min={100}
        max={900}
        step={100}
        onChange={(v) => update({ fontWeight: v })}
      />

      <RangeRow
        label="Line height"
        value={settings.lineHeight}
        min={0.8}
        max={2.0}
        step={0.05}
        decimals={2}
        onChange={(v) => update({ lineHeight: v })}
      />

      <RangeRow
        label="Letter spacing"
        value={settings.letterSpacing}
        min={-1}
        max={5}
        step={0.1}
        decimals={1}
        onChange={(v) => update({ letterSpacing: v })}
      />

      <RangeRow
        label="Opacity"
        hint="Window background opacity."
        value={settings.opacity}
        min={0.5}
        max={1.0}
        step={0.01}
        decimals={2}
        onChange={(v) => update({ opacity: v })}
      />

      <SwitchRow
        label="Window blur"
        hint="Apply blur behind the window when transparent."
        checked={settings.windowBlur}
        onChange={(v) => update({ windowBlur: v })}
      />

      <SwitchRow
        label="Animations"
        hint="Enable subtle UI animations."
        checked={settings.animations}
        onChange={(v) => update({ animations: v })}
      />

      {themeEditorOpen && (
        <ThemeEditor
          isOpen={themeEditorOpen}
          onClose={() => setThemeEditorOpen(false)}
        />
      )}
    </div>
  );
}

interface RangeRowProps {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  decimals?: number;
  onChange: (v: number) => void;
}

function RangeRow({
  label,
  hint,
  value,
  min,
  max,
  step,
  decimals = 0,
  onChange,
}: RangeRowProps) {
  return (
    <div className="settings-row">
      <div className="settings-row__label">
        <span className="settings-row__label-text">{label}</span>
        {hint && <span className="settings-row__hint">{hint}</span>}
      </div>
      <div className="settings-row__control">
        <div className="settings-range">
          <input
            type="range"
            className="settings-slider"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
          />
          <span className="settings-range__value">{value.toFixed(decimals)}</span>
        </div>
        <input
          type="number"
          className="settings-input settings-input--number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!Number.isNaN(v)) onChange(v);
          }}
        />
      </div>
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
