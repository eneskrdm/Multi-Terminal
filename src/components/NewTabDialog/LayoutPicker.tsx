import clsx from "clsx";

import { PANE_LAYOUT_SIZES, type PaneLayout } from "@/store/tabs";

interface LayoutPickerProps {
  value: PaneLayout;
  onChange: (value: PaneLayout) => void;
}

interface LayoutOption {
  id: PaneLayout;
  label: string;
  diagram: JSX.Element;
}

function Cell({ x, y, w, h }: { x: number; y: number; w: number; h: number }): JSX.Element {
  return <rect x={x} y={y} width={w} height={h} rx={2} ry={2} />;
}

function LayoutDiagram({ id }: { id: PaneLayout }): JSX.Element {
  const pad = 2;
  const size = 44;
  const full = size - pad * 2;
  const gap = 2;

  let cells: JSX.Element[] = [];
  switch (id) {
    case "single":
      cells = [<Cell key="a" x={pad} y={pad} w={full} h={full} />];
      break;
    case "columns-2": {
      const w = (full - gap) / 2;
      cells = [
        <Cell key="a" x={pad} y={pad} w={w} h={full} />,
        <Cell key="b" x={pad + w + gap} y={pad} w={w} h={full} />,
      ];
      break;
    }
    case "rows-2": {
      const h = (full - gap) / 2;
      cells = [
        <Cell key="a" x={pad} y={pad} w={full} h={h} />,
        <Cell key="b" x={pad} y={pad + h + gap} w={full} h={h} />,
      ];
      break;
    }
    case "columns-3": {
      const w = (full - gap * 2) / 3;
      cells = [
        <Cell key="a" x={pad} y={pad} w={w} h={full} />,
        <Cell key="b" x={pad + w + gap} y={pad} w={w} h={full} />,
        <Cell key="c" x={pad + (w + gap) * 2} y={pad} w={w} h={full} />,
      ];
      break;
    }
    case "main-right-stacked": {
      const w = (full - gap) / 2;
      const h = (full - gap) / 2;
      cells = [
        <Cell key="a" x={pad} y={pad} w={w} h={full} />,
        <Cell key="b" x={pad + w + gap} y={pad} w={w} h={h} />,
        <Cell key="c" x={pad + w + gap} y={pad + h + gap} w={w} h={h} />,
      ];
      break;
    }
    case "grid-2x2": {
      const w = (full - gap) / 2;
      const h = (full - gap) / 2;
      cells = [
        <Cell key="a" x={pad} y={pad} w={w} h={h} />,
        <Cell key="b" x={pad + w + gap} y={pad} w={w} h={h} />,
        <Cell key="c" x={pad} y={pad + h + gap} w={w} h={h} />,
        <Cell key="d" x={pad + w + gap} y={pad + h + gap} w={w} h={h} />,
      ];
      break;
    }
  }

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="mt-opentab__diagram"
      aria-hidden="true"
    >
      {cells}
    </svg>
  );
}

const OPTIONS: LayoutOption[] = [
  { id: "single", label: "Single", diagram: <LayoutDiagram id="single" /> },
  { id: "columns-2", label: "Two columns", diagram: <LayoutDiagram id="columns-2" /> },
  { id: "rows-2", label: "Two rows", diagram: <LayoutDiagram id="rows-2" /> },
  { id: "columns-3", label: "Three columns", diagram: <LayoutDiagram id="columns-3" /> },
  { id: "main-right-stacked", label: "Main + stack", diagram: <LayoutDiagram id="main-right-stacked" /> },
  { id: "grid-2x2", label: "2 × 2 grid", diagram: <LayoutDiagram id="grid-2x2" /> },
];

export function LayoutPicker({ value, onChange }: LayoutPickerProps): JSX.Element {
  return (
    <div className="mt-opentab__layout">
      <label className="mt-opentab__label">Layout</label>
      <div className="mt-opentab__layout-grid" role="radiogroup" aria-label="Pane layout">
        {OPTIONS.map((opt) => {
          const count = PANE_LAYOUT_SIZES[opt.id];
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={value === opt.id}
              className={clsx("mt-opentab__layout-option", {
                "is-selected": value === opt.id,
              })}
              onClick={() => onChange(opt.id)}
            >
              {opt.diagram}
              <span className="mt-opentab__layout-label">{opt.label}</span>
              <span className="mt-opentab__layout-count">
                {count} pane{count === 1 ? "" : "s"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
