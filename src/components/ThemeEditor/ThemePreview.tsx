import type { Theme } from "@/types";

export interface ThemePreviewProps {
  theme: Theme;
}

export function ThemePreview({ theme }: ThemePreviewProps) {
  const { terminal, ui } = theme;
  const { ansi } = terminal;

  return (
    <div className="mt-theme-preview">
      <div
        className="mt-theme-preview__titlebar"
        style={{
          backgroundColor: ui.titlebarBg,
          color: ui.titlebarFg,
          borderBottomColor: ui.borderDefault,
        }}
      >
        <div className="mt-theme-preview__title">{theme.name} preview</div>
        <div className="mt-theme-preview__traffic">
          <span style={{ backgroundColor: ui.danger }} />
          <span style={{ backgroundColor: ui.warning }} />
          <span style={{ backgroundColor: ui.success }} />
        </div>
      </div>

      <div
        className="mt-theme-preview__tabs"
        style={{
          backgroundColor: ui.tabInactiveBg,
          borderBottomColor: ui.tabBorder,
        }}
      >
        <div
          className="mt-theme-preview__tab is-active"
          style={{
            backgroundColor: ui.tabActiveBg,
            color: ui.textPrimary,
            borderColor: ui.tabBorder,
          }}
        >
          zsh
        </div>
        <div
          className="mt-theme-preview__tab"
          style={{
            color: ui.textMuted,
            backgroundColor: ui.tabInactiveBg,
          }}
        >
          node
        </div>
        <div
          className="mt-theme-preview__tab"
          style={{
            color: ui.textMuted,
            backgroundColor: ui.tabInactiveBg,
          }}
        >
          build
        </div>
      </div>

      <div
        className="mt-theme-preview__terminal"
        style={{
          backgroundColor: terminal.background,
          color: terminal.foreground,
        }}
      >
        <div className="mt-theme-preview__line">
          <span style={{ color: ansi.green }}>user@multiterm</span>
          <span style={{ color: terminal.foreground }}>:</span>
          <span style={{ color: ansi.blue }}>~/projects/multiterminal</span>
          <span style={{ color: ansi.magenta }}> (main)</span>
          <span style={{ color: terminal.foreground }}> $ </span>
          <span style={{ color: terminal.foreground }}>ls --color</span>
        </div>

        <div className="mt-theme-preview__line">
          <span style={{ color: ansi.blue }}>src</span>
          <span style={{ color: terminal.foreground }}> </span>
          <span style={{ color: ansi.blue }}>dist</span>
          <span style={{ color: terminal.foreground }}> </span>
          <span style={{ color: ansi.green }}>build.sh</span>
          <span style={{ color: terminal.foreground }}> </span>
          <span style={{ color: terminal.foreground }}>README.md</span>
        </div>

        <div className="mt-theme-preview__line">
          <span style={{ color: ansi.green }}>user@multiterm</span>
          <span style={{ color: terminal.foreground }}>:</span>
          <span style={{ color: ansi.blue }}>~/projects/multiterminal</span>
          <span style={{ color: terminal.foreground }}> $ </span>
          <span style={{ color: ansi.magenta }}>npm</span>
          <span style={{ color: terminal.foreground }}> </span>
          <span style={{ color: ansi.cyan }}>run</span>
          <span style={{ color: terminal.foreground }}> build</span>
        </div>

        <div className="mt-theme-preview__line">
          <span style={{ color: ansi.yellow }}>warning</span>
          <span style={{ color: terminal.foreground }}>: 2 unused variables</span>
        </div>

        <div className="mt-theme-preview__line">
          <span style={{ color: ansi.red }}>error</span>
          <span style={{ color: terminal.foreground }}>: failed to resolve </span>
          <span style={{ color: ansi.cyan }}>./missing</span>
        </div>

        <div className="mt-theme-preview__line">
          <span style={{ color: ansi.green }}>success</span>
          <span style={{ color: terminal.foreground }}>: build completed in </span>
          <span style={{ color: ansi.brightMagenta }}>1.24s</span>
        </div>

        <div className="mt-theme-preview__palette-label">ANSI palette</div>

        <div className="mt-theme-preview__palette">
          {[
            ["black", ansi.black],
            ["red", ansi.red],
            ["green", ansi.green],
            ["yellow", ansi.yellow],
            ["blue", ansi.blue],
            ["magenta", ansi.magenta],
            ["cyan", ansi.cyan],
            ["white", ansi.white],
          ].map(([name, color]) => (
            <span
              key={name}
              className="mt-theme-preview__swatch"
              style={{ backgroundColor: color, color: terminal.background }}
              title={`${name}: ${color}`}
            >
              ●
            </span>
          ))}
        </div>

        <div className="mt-theme-preview__palette">
          {[
            ["brightBlack", ansi.brightBlack],
            ["brightRed", ansi.brightRed],
            ["brightGreen", ansi.brightGreen],
            ["brightYellow", ansi.brightYellow],
            ["brightBlue", ansi.brightBlue],
            ["brightMagenta", ansi.brightMagenta],
            ["brightCyan", ansi.brightCyan],
            ["brightWhite", ansi.brightWhite],
          ].map(([name, color]) => (
            <span
              key={name}
              className="mt-theme-preview__swatch"
              style={{ backgroundColor: color, color: terminal.background }}
              title={`${name}: ${color}`}
            >
              ●
            </span>
          ))}
        </div>

        <div className="mt-theme-preview__line mt-theme-preview__cursor-row">
          <span style={{ color: ansi.green }}>user@multiterm</span>
          <span style={{ color: terminal.foreground }}>:</span>
          <span style={{ color: ansi.blue }}>~</span>
          <span style={{ color: terminal.foreground }}> $ </span>
          <span
            className="mt-theme-preview__cursor"
            style={{
              backgroundColor: terminal.cursor,
              color: terminal.cursorAccent,
            }}
          >
            _
          </span>
        </div>

        <div className="mt-theme-preview__selection-line">
          <span
            style={{
              backgroundColor: terminal.selectionBackground,
              color:
                terminal.selectionForeground ?? terminal.foreground,
            }}
          >
            selected text sample
          </span>
        </div>
      </div>
    </div>
  );
}
