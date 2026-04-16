import { useMemo, useState, type ReactNode } from "react";
import { nanoid } from "nanoid";
import {
  Plus,
  Trash2,
  Copy,
  FolderOpen,
  X,
  Terminal as TerminalIcon,
  TerminalSquare,
  Zap,
  Sparkles,
  Command as CommandIcon,
  Box,
  Boxes,
  Ship,
  Anchor,
  Rocket,
} from "lucide-react";
import clsx from "clsx";
import { useSettingsStore } from "@/store/settings";
import { useThemesStore } from "@/store/themes";
import type { Profile } from "@/types";

const PROFILE_ICONS: Record<string, typeof TerminalIcon> = {
  Terminal: TerminalIcon,
  TerminalSquare: TerminalSquare,
  Shell: TerminalIcon,
  Zap: Zap,
  Sparkles: Sparkles,
  Command: CommandIcon,
  Box: Box,
  Boxes: Boxes,
  Ship: Ship,
  Anchor: Anchor,
  Rocket: Rocket,
};

const ICON_KEYS = Object.keys(PROFILE_ICONS);

export function Profiles() {
  const settings = useSettingsStore((s) => s.settings);
  const updateProfile = useSettingsStore((s) => s.updateProfile);
  const addProfile = useSettingsStore((s) => s.addProfile);
  const deleteProfile = useSettingsStore((s) => s.deleteProfile);
  const update = useSettingsStore((s) => s.update);
  const builtInThemes = useThemesStore((s) => s.builtInThemes);
  const customThemes = useThemesStore((s) => s.customThemes);
  const allThemes = useMemo(
    () => [...builtInThemes, ...customThemes],
    [builtInThemes, customThemes],
  );

  const [selectedId, setSelectedId] = useState<string | null>(
    settings.profiles[0]?.id ?? null,
  );

  const selectedProfile = useMemo(
    () => settings.profiles.find((p) => p.id === selectedId) ?? null,
    [settings.profiles, selectedId],
  );

  const handleAdd = () => {
    const id = nanoid();
    const profile: Profile = {
      id,
      name: "New Profile",
      shell: "",
      args: [],
      env: {},
      cwd: null,
      icon: "Terminal",
      color: "#bb9af7",
    };
    addProfile(profile);
    setSelectedId(id);
  };

  const handleDuplicate = (profile: Profile) => {
    const dup: Profile = {
      ...profile,
      id: nanoid(),
      name: `${profile.name} (copy)`,
      isDefault: false,
      args: [...profile.args],
      env: { ...profile.env },
    };
    addProfile(dup);
    setSelectedId(dup.id);
  };

  const handleDelete = (id: string) => {
    deleteProfile(id);
    if (selectedId === id) {
      const next = settings.profiles.find((p) => p.id !== id);
      setSelectedId(next?.id ?? null);
    }
  };

  const handleSetDefault = (id: string) => {
    update({ defaultProfileId: id });
  };

  const handleBrowseShell = async () => {
    if (!selectedProfile) return;
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const result = await open({
        multiple: false,
        directory: false,
        title: "Select shell executable",
      });
      if (typeof result === "string") {
        updateProfile(selectedProfile.id, { shell: result });
      }
    } catch {
      // Dialog plugin unavailable — silently skip.
    }
  };

  const handleBrowseCwd = async () => {
    if (!selectedProfile) return;
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const result = await open({
        multiple: false,
        directory: true,
        title: "Select working directory",
      });
      if (typeof result === "string") {
        updateProfile(selectedProfile.id, { cwd: result });
      }
    } catch {
      // Dialog plugin unavailable — silently skip.
    }
  };

  return (
    <div className="settings-section">
      <h2 className="settings-section__title">Profiles</h2>

      <div className="settings-profiles">
        <div>
          <div className="settings-profiles__list">
            {settings.profiles.length === 0 ? (
              <div className="settings-empty" style={{ padding: "20px 8px" }}>
                No profiles yet.
              </div>
            ) : (
              settings.profiles.map((p) => {
                const Icon = PROFILE_ICONS[p.icon ?? "Terminal"] ?? TerminalIcon;
                const isDefault = settings.defaultProfileId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={clsx(
                      "settings-profiles__item",
                      selectedId === p.id && "settings-profiles__item--active",
                    )}
                    onClick={() => setSelectedId(p.id)}
                  >
                    <Icon size={14} style={{ color: p.color ?? undefined }} />
                    <span className="settings-profiles__item-name">
                      {p.name}
                    </span>
                    {isDefault && (
                      <span className="settings-profiles__item-badge">
                        Default
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          <button
            type="button"
            className="settings-btn settings-btn--primary settings-profiles__add"
            onClick={handleAdd}
          >
            <Plus size={14} /> Add profile
          </button>
        </div>

        {selectedProfile ? (
          <div className="settings-profiles__editor">
            <ProfileField label="Name">
              <input
                type="text"
                className="settings-input"
                value={selectedProfile.name}
                onChange={(e) =>
                  updateProfile(selectedProfile.id, { name: e.target.value })
                }
              />
            </ProfileField>

            <ProfileField label="Shell path">
              <div style={{ display: "flex", gap: 6, width: "100%" }}>
                <input
                  type="text"
                  className="settings-input"
                  value={selectedProfile.shell}
                  placeholder="e.g. C:\\Windows\\System32\\cmd.exe"
                  onChange={(e) =>
                    updateProfile(selectedProfile.id, {
                      shell: e.target.value,
                    })
                  }
                />
                <button
                  type="button"
                  className="settings-btn"
                  onClick={handleBrowseShell}
                >
                  <FolderOpen size={14} /> Browse…
                </button>
              </div>
            </ProfileField>

            <ProfileField label="Arguments">
              <ArgsList
                items={selectedProfile.args}
                onChange={(args) =>
                  updateProfile(selectedProfile.id, { args })
                }
              />
            </ProfileField>

            <ProfileField label="Working directory">
              <div style={{ display: "flex", gap: 6, width: "100%" }}>
                <input
                  type="text"
                  className="settings-input"
                  value={selectedProfile.cwd ?? ""}
                  placeholder="Leave empty for default"
                  onChange={(e) =>
                    updateProfile(selectedProfile.id, {
                      cwd: e.target.value || null,
                    })
                  }
                />
                <button
                  type="button"
                  className="settings-btn"
                  onClick={handleBrowseCwd}
                >
                  <FolderOpen size={14} /> Browse…
                </button>
              </div>
            </ProfileField>

            <ProfileField label="Environment variables">
              <EnvList
                items={selectedProfile.env}
                onChange={(env) =>
                  updateProfile(selectedProfile.id, { env })
                }
              />
            </ProfileField>

            <ProfileField label="Icon">
              <select
                className="settings-select"
                value={selectedProfile.icon ?? "Terminal"}
                onChange={(e) =>
                  updateProfile(selectedProfile.id, { icon: e.target.value })
                }
              >
                {ICON_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
            </ProfileField>

            <ProfileField label="Color">
              <input
                type="color"
                className="settings-color"
                value={selectedProfile.color ?? "#bb9af7"}
                onChange={(e) =>
                  updateProfile(selectedProfile.id, { color: e.target.value })
                }
              />
            </ProfileField>

            <ProfileField label="Theme override">
              <select
                className="settings-select"
                value={selectedProfile.themeId ?? ""}
                onChange={(e) =>
                  updateProfile(selectedProfile.id, {
                    themeId: e.target.value || undefined,
                  })
                }
              >
                <option value="">Use global theme</option>
                {allThemes.map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.name}
                  </option>
                ))}
              </select>
            </ProfileField>

            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                justifyContent: "flex-end",
                marginTop: 8,
                borderTop: "1px solid var(--mt-border-subtle, #232433)",
                paddingTop: 12,
              }}
            >
              <button
                type="button"
                className={clsx(
                  "settings-btn",
                  settings.defaultProfileId === selectedProfile.id &&
                    "settings-btn--primary",
                )}
                onClick={() => handleSetDefault(selectedProfile.id)}
                disabled={
                  settings.defaultProfileId === selectedProfile.id
                }
              >
                {settings.defaultProfileId === selectedProfile.id
                  ? "Default profile"
                  : "Set as default"}
              </button>
              <button
                type="button"
                className="settings-btn"
                onClick={() => handleDuplicate(selectedProfile)}
              >
                <Copy size={14} /> Duplicate
              </button>
              <button
                type="button"
                className="settings-btn settings-btn--danger"
                onClick={() => handleDelete(selectedProfile.id)}
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="settings-profiles__empty">
            Select a profile to edit
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: "var(--mt-text-muted, #565f89)",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginBottom: 4,
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex" }}>{children}</div>
    </div>
  );
}

function ArgsList({
  items,
  onChange,
}: {
  items: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <div className="settings-list">
      {items.map((arg, idx) => (
        <div className="settings-list__item" key={idx}>
          <input
            type="text"
            className="settings-input"
            value={arg}
            onChange={(e) => {
              const next = [...items];
              next[idx] = e.target.value;
              onChange(next);
            }}
          />
          <button
            type="button"
            className="settings-btn settings-btn--ghost settings-btn--small"
            onClick={() => onChange(items.filter((_, i) => i !== idx))}
            title="Remove"
          >
            <X size={12} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="settings-btn settings-btn--small settings-list__add"
        onClick={() => onChange([...items, ""])}
      >
        <Plus size={12} /> Add argument
      </button>
    </div>
  );
}

function EnvList({
  items,
  onChange,
}: {
  items: Record<string, string>;
  onChange: (items: Record<string, string>) => void;
}) {
  const entries = Object.entries(items);

  const updateKey = (oldKey: string, newKey: string) => {
    if (oldKey === newKey) return;
    const next: Record<string, string> = {};
    for (const [k, v] of entries) {
      if (k === oldKey) {
        if (newKey) next[newKey] = v;
      } else {
        next[k] = v;
      }
    }
    onChange(next);
  };

  const updateValue = (key: string, value: string) => {
    onChange({ ...items, [key]: value });
  };

  const removeEntry = (key: string) => {
    const next = { ...items };
    delete next[key];
    onChange(next);
  };

  const addEntry = () => {
    let key = "NEW_VAR";
    let counter = 1;
    while (key in items) {
      key = `NEW_VAR_${counter++}`;
    }
    onChange({ ...items, [key]: "" });
  };

  return (
    <div className="settings-list">
      {entries.map(([k, v]) => (
        <div className="settings-list__item" key={k}>
          <input
            type="text"
            className="settings-input"
            value={k}
            placeholder="KEY"
            onChange={(e) => updateKey(k, e.target.value)}
            style={{ flex: "0 0 40%" }}
          />
          <input
            type="text"
            className="settings-input"
            value={v}
            placeholder="value"
            onChange={(e) => updateValue(k, e.target.value)}
          />
          <button
            type="button"
            className="settings-btn settings-btn--ghost settings-btn--small"
            onClick={() => removeEntry(k)}
            title="Remove"
          >
            <X size={12} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="settings-btn settings-btn--small settings-list__add"
        onClick={addEntry}
      >
        <Plus size={12} /> Add variable
      </button>
    </div>
  );
}
