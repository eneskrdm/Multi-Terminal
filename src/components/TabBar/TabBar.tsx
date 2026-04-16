import {
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, LayoutGroup } from "framer-motion";
import { ChevronLeft, ChevronRight, Settings as SettingsIcon } from "lucide-react";
import { useSettingsStore } from "@/store/settings";
import { useTabsStore } from "@/store/tabs";
import { useUIStore } from "@/lib/commands";
import type { Profile } from "@/types";
import { Tab } from "./Tab";
import { NewTabButton } from "./NewTabButton";
import "./TabBar.css";

interface DragState {
  sourceIndex: number;
  pointerId: number;
  originX: number;
  originY: number;
  active: boolean;
  targetIndex: number;
  tabCenters: number[];
}

const DRAG_THRESHOLD_PX = 5;

export function TabBar() {
  const tabs = useTabsStore((s) => s.tabs);
  const activeTabId = useTabsStore((s) => s.activeTabId);
  const setActiveTab = useTabsStore((s) => s.setActiveTab);
  const closeTab = useTabsStore((s) => s.closeTab);
  const reorderTabs = useTabsStore((s) => s.reorderTabs);
  const renameTab = useTabsStore((s) => s.renameTab);
  const createTabWithProfile = useTabsStore((s) => s.createTabWithProfile);

  const settings = useSettingsStore((s) => s.settings);
  const profiles: Profile[] = settings?.profiles ?? [];
  const defaultProfileId = settings?.defaultProfileId ?? "";

  const openNewTabDialog = useUIStore((s) => s.setNewTabDialog);
  const openSettings = useUIStore((s) => s.setSettings);

  const trackRef = useRef<HTMLDivElement | null>(null);
  const tabsContainerRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const dragStateRef = useRef<DragState | null>(null);

  const [dragSource, setDragSource] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  const registerTabRef = useCallback((index: number, el: HTMLDivElement | null) => {
    if (el) {
      tabRefs.current.set(index, el);
    } else {
      tabRefs.current.delete(index);
    }
  }, []);

  const updateOverflow = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const overflow = track.scrollWidth - track.clientWidth > 1;
    setHasOverflow(overflow);
    setCanScrollLeft(track.scrollLeft > 1);
    setCanScrollRight(track.scrollLeft + track.clientWidth < track.scrollWidth - 1);
  }, []);

  useLayoutEffect(() => {
    updateOverflow();
  }, [tabs.length, updateOverflow]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const ro = new ResizeObserver(() => updateOverflow());
    ro.observe(track);
    const tabsEl = tabsContainerRef.current;
    if (tabsEl) ro.observe(tabsEl);
    track.addEventListener("scroll", updateOverflow, { passive: true });
    return () => {
      ro.disconnect();
      track.removeEventListener("scroll", updateOverflow);
    };
  }, [updateOverflow]);

  useEffect(() => {
    if (!activeTabId) return;
    const idx = tabs.findIndex((t) => t.id === activeTabId);
    if (idx < 0) return;
    const el = tabRefs.current.get(idx);
    const track = trackRef.current;
    if (!el || !track) return;
    const elLeft = el.offsetLeft;
    const elRight = elLeft + el.offsetWidth;
    const viewLeft = track.scrollLeft;
    const viewRight = viewLeft + track.clientWidth;
    if (elLeft < viewLeft) {
      track.scrollTo({ left: Math.max(0, elLeft - 12), behavior: "smooth" });
    } else if (elRight > viewRight) {
      track.scrollTo({ left: elRight - track.clientWidth + 12, behavior: "smooth" });
    }
  }, [activeTabId, tabs]);

  const profileById = useMemo(() => {
    const map = new Map<string, Profile>();
    for (const p of profiles) map.set(p.id, p);
    return map;
  }, [profiles]);

  const computeTabCenters = useCallback((): number[] => {
    const container = tabsContainerRef.current;
    if (!container) return [];
    const containerRect = container.getBoundingClientRect();
    const centers: number[] = [];
    for (let i = 0; i < tabs.length; i += 1) {
      const el = tabRefs.current.get(i);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      centers[i] = rect.left + rect.width / 2 - containerRect.left;
    }
    return centers;
  }, [tabs.length]);

  const computeDropIndex = useCallback(
    (clientX: number, centers: number[], sourceIndex: number): number => {
      const container = tabsContainerRef.current;
      if (!container) return sourceIndex;
      const localX = clientX - container.getBoundingClientRect().left;
      let idx = centers.length;
      for (let i = 0; i < centers.length; i += 1) {
        if (localX < centers[i]) {
          idx = i;
          break;
        }
      }
      if (idx > sourceIndex) idx -= 1;
      if (idx < 0) idx = 0;
      if (idx > tabs.length - 1) idx = tabs.length - 1;
      return idx;
    },
    [tabs.length],
  );

  const handlePointerDownStart = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, index: number) => {
      if (e.button !== 0) return;
      dragStateRef.current = {
        sourceIndex: index,
        pointerId: e.pointerId,
        originX: e.clientX,
        originY: e.clientY,
        active: false,
        targetIndex: index,
        tabCenters: [],
      };
    },
    [],
  );

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const state = dragStateRef.current;
      if (!state || e.pointerId !== state.pointerId) return;
      if (!state.active) {
        const dx = Math.abs(e.clientX - state.originX);
        const dy = Math.abs(e.clientY - state.originY);
        if (dx < DRAG_THRESHOLD_PX && dy < DRAG_THRESHOLD_PX) return;
        state.active = true;
        state.tabCenters = computeTabCenters();
        setDragSource(state.sourceIndex);
        document.body.style.cursor = "grabbing";
      }
      const target = computeDropIndex(e.clientX, state.tabCenters, state.sourceIndex);
      if (target !== state.targetIndex) {
        state.targetIndex = target;
        setDropIndex(target);
      } else if (dropIndex === null) {
        setDropIndex(target);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const state = dragStateRef.current;
      if (!state || e.pointerId !== state.pointerId) return;
      const wasActive = state.active;
      const { sourceIndex, targetIndex } = state;
      dragStateRef.current = null;
      setDragSource(null);
      setDropIndex(null);
      document.body.style.cursor = "";
      if (wasActive && targetIndex !== sourceIndex) {
        reorderTabs(sourceIndex, targetIndex);
      }
    };

    const onPointerCancel = (e: PointerEvent) => {
      const state = dragStateRef.current;
      if (!state || e.pointerId !== state.pointerId) return;
      dragStateRef.current = null;
      setDragSource(null);
      setDropIndex(null);
      document.body.style.cursor = "";
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
    };
  }, [computeDropIndex, computeTabCenters, dropIndex, reorderTabs]);

  const handleCreate = useCallback(
    (profile: Profile) => {
      void createTabWithProfile(profile);
    },
    [createTabWithProfile],
  );

  const scrollBy = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    const delta = Math.max(120, Math.round(track.clientWidth * 0.6)) * direction;
    track.scrollBy({ left: delta, behavior: "smooth" });
  };

  const dropIndicatorLeft = useMemo(() => {
    if (dragSource === null || dropIndex === null) return null;
    const container = tabsContainerRef.current;
    if (!container) return null;
    const containerRect = container.getBoundingClientRect();
    const displayOrder = tabs.map((_, i) => i).filter((i) => i !== dragSource);
    displayOrder.splice(dropIndex, 0, dragSource);
    const targetPosInDisplay = displayOrder.indexOf(dragSource);
    const beforeIdx = displayOrder[targetPosInDisplay - 1];
    const afterIdx = displayOrder[targetPosInDisplay + 1];
    if (beforeIdx !== undefined) {
      const el = tabRefs.current.get(beforeIdx);
      if (el) {
        const r = el.getBoundingClientRect();
        return r.right - containerRect.left + 1;
      }
    }
    if (afterIdx !== undefined) {
      const el = tabRefs.current.get(afterIdx);
      if (el) {
        const r = el.getBoundingClientRect();
        return r.left - containerRect.left - 1;
      }
    }
    return null;
  }, [dragSource, dropIndex, tabs]);

  return (
    <div className="mt-tabbar" role="tablist" aria-label="Terminal tabs">
      {hasOverflow && (
        <button
          type="button"
          className="mt-tabbar__scroll-btn"
          onClick={() => scrollBy(-1)}
          disabled={!canScrollLeft}
          aria-label="Scroll tabs left"
          tabIndex={-1}
        >
          <ChevronLeft size={14} strokeWidth={2.2} />
        </button>
      )}

      <div className="mt-tabbar__track" ref={trackRef}>
        <div className="mt-tabbar__tabs" ref={tabsContainerRef}>
          <LayoutGroup>
            <AnimatePresence initial={false} mode="popLayout">
              {tabs.map((tab, index) => (
                <Tab
                  key={tab.id}
                  tab={tab}
                  index={index}
                  isActive={tab.id === activeTabId}
                  isDragging={dragSource === index}
                  profile={profileById.get(tab.profileId)}
                  onActivate={setActiveTab}
                  onClose={(id) => {
                    void closeTab(id);
                  }}
                  onRename={renameTab}
                  onPointerDownStart={handlePointerDownStart}
                  registerRef={registerTabRef}
                />
              ))}
            </AnimatePresence>
          </LayoutGroup>

          {dropIndicatorLeft !== null && (
            <div
              className="mt-tabbar__drop-indicator"
              style={{ transform: `translateX(${dropIndicatorLeft}px)` }}
              aria-hidden="true"
            />
          )}
        </div>

        <NewTabButton
          profiles={profiles}
          defaultProfileId={defaultProfileId}
          onCreate={handleCreate}
          onOpenDialog={() => openNewTabDialog(true)}
        />

        <button
          type="button"
          className="mt-tabbar__action"
          onClick={() => openSettings(true)}
          aria-label="Open settings"
          title="Settings (Ctrl+,)"
        >
          <SettingsIcon size={14} strokeWidth={2} />
        </button>
      </div>

      {hasOverflow && (
        <button
          type="button"
          className="mt-tabbar__scroll-btn"
          onClick={() => scrollBy(1)}
          disabled={!canScrollRight}
          aria-label="Scroll tabs right"
          tabIndex={-1}
        >
          <ChevronRight size={14} strokeWidth={2.2} />
        </button>
      )}
    </div>
  );
}
