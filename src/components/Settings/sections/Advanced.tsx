import clsx from "clsx";
import { useSettingsStore } from "@/store/settings";
import type { TabBarPosition } from "@/types";

export function Advanced() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);

  return (
    <div className="settings-section">
      <h2 className="settings-section__title">Advanced</h2>

      <SwitchRow
        label="GPU acceleration"
        hint="Use hardware acceleration for terminal rendering."
        checked={settings.gpuAcceleration}
        onChange={(v) => update({ gpuAcceleration: v })}
      />

      <SwitchRow
        label="WebGL rendering"
        hint="Enable xterm WebGL renderer for maximum performance."
        checked={settings.webGLRendering}
        onChange={(v) => update({ webGLRendering: v })}
      />

      <SwitchRow
        label="Ligatures"
        hint="Enable font ligatures in terminal text."
        checked={settings.ligatures}
        onChange={(v) => update({ ligatures: v })}
      />

      <SwitchRow
        label="Confirm on tab close"
        hint="Ask before closing a tab with running processes."
        checked={settings.confirmCloseTab}
        onChange={(v) => update({ confirmCloseTab: v })}
      />

      <SwitchRow
        label="Confirm on window close"
        hint="Ask before quitting the application."
        checked={settings.confirmCloseWindow}
        onChange={(v) => update({ confirmCloseWindow: v })}
      />

      <SwitchRow
        label="Show tab bar when single tab"
        hint="Keep the tab bar visible even when only one tab is open."
        checked={settings.showTabBarWhenSingle}
        onChange={(v) => update({ showTabBarWhenSingle: v })}
      />

      <SwitchRow
        label="Show status bar"
        hint="Display the bottom status bar."
        checked={settings.showStatusBar}
        onChange={(v) => update({ showStatusBar: v })}
      />

      <div className="settings-row">
        <div className="settings-row__label">
          <span className="settings-row__label-text">Tab bar position</span>
        </div>
        <div className="settings-row__control">
          <div className="settings-segmented">
            {(["top", "bottom"] as TabBarPosition[]).map((pos) => (
              <button
                key={pos}
                type="button"
                className={clsx(
                  "settings-segmented__btn",
                  settings.tabBarPosition === pos &&
                    "settings-segmented__btn--active",
                )}
                onClick={() => update({ tabBarPosition: pos })}
              >
                {pos === "top" ? "Top" : "Bottom"}
              </button>
            ))}
          </div>
        </div>
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
