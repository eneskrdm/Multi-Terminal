const STORAGE_KEY = "multiterminal:recent-dirs";
const MAX_ENTRIES = 8;

export function loadRecentDirs(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

export function addRecentDir(dir: string): void {
  const trimmed = dir.trim();
  if (!trimmed) return;
  try {
    const current = loadRecentDirs();
    const next = [trimmed, ...current.filter((d) => d !== trimmed)].slice(
      0,
      MAX_ENTRIES,
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable — silently ignore.
  }
}
