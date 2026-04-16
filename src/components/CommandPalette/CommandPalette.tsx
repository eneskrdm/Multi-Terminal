import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Command } from "cmdk";
import { AnimatePresence, motion } from "framer-motion";
import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CommandDescriptor, CommandId } from "@/types";
import { useSettingsStore } from "@/store/settings";
import {
  commandRegistry,
  executeCommand,
  formatAccelerator,
  loadRecentCommands,
  pushRecentCommand,
  useUIStore,
} from "@/lib/commands";
import { emit } from "@/lib/events";
import "./CommandPalette.css";

const CATEGORY_ORDER: CommandDescriptor["category"][] = [
  "Application",
  "Tab",
  "Pane",
  "Terminal",
];

const CATEGORY_LABELS: Record<CommandDescriptor["category"], string> = {
  Application: "Application",
  Tab: "Tabs",
  Pane: "Panes",
  Terminal: "Terminal",
};

function getIconComponent(name: string | undefined): LucideIcon | null {
  if (!name) return null;
  const registry = Icons as unknown as Record<string, LucideIcon | undefined>;
  return registry[name] ?? null;
}

function resolveAccelerator(
  descriptor: CommandDescriptor,
  overrides: Record<string, string | null>,
): string | null {
  if (descriptor.id in overrides) {
    const override = overrides[descriptor.id];
    return override ?? null;
  }
  return descriptor.defaultKey ?? null;
}

interface AcceleratorChipsProps {
  accelerator: string | null;
}

function AcceleratorChips({ accelerator }: AcceleratorChipsProps): JSX.Element | null {
  if (!accelerator) return null;
  const chords = accelerator.split(/\s+/).filter(Boolean);
  return (
    <span className="mt-palette__chips">
      {chords.map((chord, chordIdx) => {
        const tokens = formatAccelerator(chord);
        return (
          <span key={`${chord}-${chordIdx}`} className="mt-palette__chord">
            {tokens.map((token, idx) => (
              <kbd key={`${token}-${idx}`} className="mt-palette__kbd">
                {token}
              </kbd>
            ))}
          </span>
        );
      })}
    </span>
  );
}

interface PaletteItemProps {
  descriptor: CommandDescriptor;
  accelerator: string | null;
  onRun: (id: CommandId) => void;
}

function PaletteItem({ descriptor, accelerator, onRun }: PaletteItemProps): JSX.Element {
  const Icon = getIconComponent(descriptor.icon);
  const keywords = useMemo(
    () =>
      [
        descriptor.label,
        descriptor.description ?? "",
        descriptor.category,
        descriptor.id,
      ].filter(Boolean),
    [descriptor],
  );
  return (
    <Command.Item
      value={`${descriptor.label} ${descriptor.id}`}
      keywords={keywords}
      onSelect={() => onRun(descriptor.id)}
      className="mt-palette__item"
    >
      <span className="mt-palette__item-icon">
        {Icon ? <Icon size={16} strokeWidth={1.75} /> : <span className="mt-palette__icon-dot" />}
      </span>
      <span className="mt-palette__item-body">
        <span className="mt-palette__item-label">{descriptor.label}</span>
        {descriptor.description ? (
          <span className="mt-palette__item-description">{descriptor.description}</span>
        ) : null}
      </span>
      <AcceleratorChips accelerator={accelerator} />
    </Command.Item>
  );
}

export function CommandPalette(): JSX.Element {
  const open = useUIStore((s) => s.paletteOpen);
  const setPalette = useUIStore((s) => s.setPalette);
  const keybindings = useSettingsStore((s) => s.settings.keybindings);

  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<CommandId[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setRecent(loadRecentCommands());
      // Give the modal a frame to mount before we focus the input.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const handleClose = useCallback(() => {
    setPalette(false);
  }, [setPalette]);

  const runCommand = useCallback(
    (id: CommandId) => {
      pushRecentCommand(id);
      setPalette(false);
      // Defer execution a microtask so the palette unmount doesn't swallow
      // focus side effects of the command (e.g. settings/theme-editor open).
      queueMicrotask(() => {
        executeCommand(id);
        emit({ type: "focus-active-terminal" });
      });
    },
    [setPalette],
  );

  // Global Esc to close (cmdk handles its own, but we want a safety net when
  // focus drifted to an item rather than the input).
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === "Escape") {
        e.stopPropagation();
        handleClose();
      }
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, handleClose]);

  const grouped = useMemo(() => {
    const map = new Map<CommandDescriptor["category"], CommandDescriptor[]>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const cmd of commandRegistry) {
      const list = map.get(cmd.category);
      if (list) list.push(cmd);
    }
    return map;
  }, []);

  const recentDescriptors = useMemo<CommandDescriptor[]>(() => {
    if (recent.length === 0) return [];
    const byId = new Map(commandRegistry.map((c) => [c.id, c]));
    return recent
      .map((id) => byId.get(id))
      .filter((c): c is CommandDescriptor => Boolean(c));
  }, [recent]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="mt-palette-root"
          className="mt-palette-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
          role="presentation"
        >
          <motion.div
            className="mt-palette__dialog"
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ duration: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
            role="dialog"
            aria-label="Command palette"
            aria-modal="true"
          >
            <Command
              label="Command palette"
              shouldFilter={true}
              className="mt-palette"
              loop
              onKeyDown={(e) => {
                if (e.key === "Tab") e.preventDefault();
              }}
            >
              <div className="mt-palette__search">
                <Icons.Search size={16} strokeWidth={1.75} aria-hidden />
                <Command.Input
                  ref={inputRef}
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Type a command or search…"
                  className="mt-palette__input"
                />
              </div>
              <Command.List className="mt-palette__list">
                <Command.Empty className="mt-palette__empty">
                  No commands found.
                </Command.Empty>

                {query.length === 0 && recentDescriptors.length > 0 ? (
                  <Command.Group
                    heading="Recently used"
                    className="mt-palette__group"
                  >
                    {recentDescriptors.map((descriptor) => (
                      <PaletteItem
                        key={`recent-${descriptor.id}`}
                        descriptor={descriptor}
                        accelerator={resolveAccelerator(descriptor, keybindings)}
                        onRun={runCommand}
                      />
                    ))}
                  </Command.Group>
                ) : null}

                {CATEGORY_ORDER.map((category) => {
                  const list = grouped.get(category) ?? [];
                  if (list.length === 0) return null;
                  return (
                    <Command.Group
                      key={category}
                      heading={CATEGORY_LABELS[category]}
                      className="mt-palette__group"
                    >
                      {list.map((descriptor) => (
                        <PaletteItem
                          key={descriptor.id}
                          descriptor={descriptor}
                          accelerator={resolveAccelerator(descriptor, keybindings)}
                          onRun={runCommand}
                        />
                      ))}
                    </Command.Group>
                  );
                })}
              </Command.List>
              <div className="mt-palette__footer">
                <span className="mt-palette__hint">
                  <kbd className="mt-palette__kbd">Enter</kbd>
                  to run
                </span>
                <span className="mt-palette__hint">
                  <kbd className="mt-palette__kbd">Esc</kbd>
                  to close
                </span>
              </div>
            </Command>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
