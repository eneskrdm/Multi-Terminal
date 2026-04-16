import {
  Palette,
  Terminal as TerminalIcon,
  Keyboard,
  UserCircle,
  Sliders,
} from "lucide-react";
import clsx from "clsx";

export type SettingsSectionId =
  | "appearance"
  | "terminal"
  | "keybindings"
  | "profiles"
  | "advanced";

interface SectionMeta {
  id: SettingsSectionId;
  label: string;
  Icon: typeof Palette;
}

const sections: SectionMeta[] = [
  { id: "appearance", label: "Appearance", Icon: Palette },
  { id: "terminal", label: "Terminal", Icon: TerminalIcon },
  { id: "keybindings", label: "Keybindings", Icon: Keyboard },
  { id: "profiles", label: "Profiles", Icon: UserCircle },
  { id: "advanced", label: "Advanced", Icon: Sliders },
];

interface SettingsSidebarProps {
  activeSection: SettingsSectionId;
  onChange: (id: SettingsSectionId) => void;
}

export function SettingsSidebar({
  activeSection,
  onChange,
}: SettingsSidebarProps) {
  return (
    <nav className="settings-sidebar" aria-label="Settings sections">
      {sections.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className={clsx(
            "settings-sidebar__item",
            activeSection === id && "settings-sidebar__item--active",
          )}
          onClick={() => onChange(id)}
        >
          <span className="settings-sidebar__icon">
            <Icon size={16} />
          </span>
          {label}
        </button>
      ))}
    </nav>
  );
}
