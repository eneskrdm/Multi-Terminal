import { useMemo } from "react";
import { useLayoutStore } from "@/store/layout";
import { useTabsStore } from "@/store/tabs";
import type { PaneNode } from "@/types";
import { Split } from "./Split";
import { Pane } from "./Pane";
import "./SplitPane.css";

interface SplitPaneTreeProps {
  rootPaneId: string;
  tabId?: string;
  activePaneId?: string;
}

export function SplitPaneTree({
  rootPaneId,
  tabId: tabIdProp,
  activePaneId: activePaneIdProp,
}: SplitPaneTreeProps): JSX.Element {
  // AppShell currently calls <SplitPaneTree rootPaneId={...} /> without tabId/
  // activePaneId. We support that by resolving them from the tabs store.
  const tabs = useTabsStore((s) => s.tabs);

  const owningTab = useMemo(() => {
    if (tabIdProp) return tabs.find((t) => t.id === tabIdProp);
    return tabs.find((t) => t.rootPaneId === rootPaneId);
  }, [tabs, tabIdProp, rootPaneId]);

  const tabId = owningTab?.id ?? tabIdProp ?? "";
  const activePaneId = activePaneIdProp ?? owningTab?.activePaneId ?? "";

  const rootNode = useLayoutStore((s) => s.panes[rootPaneId]);

  if (!rootNode) {
    return (
      <div className="mt-split-tree">
        <div className="mt-split-tree__missing">Pane not found.</div>
      </div>
    );
  }

  return (
    <div className="mt-split-tree">
      <NodeRenderer node={rootNode} tabId={tabId} activePaneId={activePaneId} />
    </div>
  );
}

interface NodeRendererProps {
  node: PaneNode;
  tabId: string;
  activePaneId: string;
}

export function NodeRenderer({ node, tabId, activePaneId }: NodeRendererProps): JSX.Element {
  if (node.type === "leaf") {
    return (
      <Pane
        node={node}
        tabId={tabId}
        isFocused={node.id === activePaneId}
      />
    );
  }
  return <Split node={node} tabId={tabId} activePaneId={activePaneId} />;
}
