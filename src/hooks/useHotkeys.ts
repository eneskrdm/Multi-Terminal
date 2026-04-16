import { useEffect, useMemo, useRef } from "react";
import type { CommandDescriptor, CommandId } from "@/types";
import { useSettingsStore } from "@/store/settings";
import {
  commandRegistry,
  executeCommand,
  matchParsed,
  parseAcceleratorChord,
  type ParsedAccelerator,
} from "@/lib/commands";

interface Binding {
  id: CommandId;
  category: CommandDescriptor["category"];
  chord: ParsedAccelerator[];
}

const CHORD_TIMEOUT_MS = 1000;

const MODIFIER_KEYS = new Set([
  "control",
  "shift",
  "alt",
  "meta",
  "altgraph",
  "capslock",
  "numlock",
  "scrolllock",
  "fn",
  "symbol",
  "hyper",
  "super",
]);

function isModifierOnly(e: KeyboardEvent): boolean {
  return MODIFIER_KEYS.has(e.key?.toLowerCase() ?? "");
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

function shouldFireInContext(
  category: CommandDescriptor["category"],
  editable: boolean,
): boolean {
  if (!editable) return true;
  return category === "Application";
}

export function useHotkeys(): void {
  const keybindings = useSettingsStore((s) => s.settings.keybindings);

  const bindings = useMemo<Binding[]>(() => {
    const out: Binding[] = [];
    for (const cmd of commandRegistry) {
      let accel: string | null;
      if (cmd.id in keybindings) {
        accel = keybindings[cmd.id] ?? null; // user may set null to unbind
      } else {
        accel = cmd.defaultKey ?? null;
      }
      if (!accel) continue;
      const chord = parseAcceleratorChord(accel);
      if (chord.length === 0) continue;
      out.push({ id: cmd.id, category: cmd.category, chord });
    }
    return out;
  }, [keybindings]);

  const bindingsRef = useRef<Binding[]>(bindings);
  bindingsRef.current = bindings;

  // firstBindingId is the command whose first chord we already matched; we're
  // now waiting for its second chord within CHORD_TIMEOUT_MS.
  const pendingRef = useRef<{
    firstBindingId: CommandId;
    timeout: ReturnType<typeof setTimeout>;
  } | null>(null);

  useEffect(() => {
    function clearPending(): void {
      if (pendingRef.current) {
        clearTimeout(pendingRef.current.timeout);
        pendingRef.current = null;
      }
    }

    function handleKeyDown(e: KeyboardEvent): void {
      if (isModifierOnly(e)) return;

      const editable = isEditableTarget(e.target);
      const active = bindingsRef.current;

      // Phase 1: chord completion, if pending.
      if (pendingRef.current) {
        const pending = pendingRef.current;
        const match = active.find(
          (b) =>
            b.id === pending.firstBindingId &&
            b.chord.length >= 2 &&
            matchParsed(e, b.chord[1]),
        );
        clearPending();
        if (match) {
          if (shouldFireInContext(match.category, editable)) {
            e.preventDefault();
            e.stopPropagation();
            executeCommand(match.id);
            return;
          }
          return;
        }
        // Non-matching second key cancels the chord silently and falls through
        // so that the current keystroke can still trigger other shortcuts.
      }

      // Phase 2a: single-chord match.
      const single = active.find(
        (b) => b.chord.length === 1 && matchParsed(e, b.chord[0]),
      );
      if (single) {
        if (shouldFireInContext(single.category, editable)) {
          e.preventDefault();
          e.stopPropagation();
          executeCommand(single.id);
          return;
        }
        return;
      }

      // Phase 2b: first chord of a multi-chord binding.
      const multi = active.find(
        (b) => b.chord.length > 1 && matchParsed(e, b.chord[0]),
      );
      if (multi) {
        if (shouldFireInContext(multi.category, editable)) {
          e.preventDefault();
          e.stopPropagation();
          const timeout = setTimeout(() => {
            pendingRef.current = null;
          }, CHORD_TIMEOUT_MS);
          pendingRef.current = {
            firstBindingId: multi.id,
            timeout,
          };
          return;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      clearPending();
    };
  }, []);
}
