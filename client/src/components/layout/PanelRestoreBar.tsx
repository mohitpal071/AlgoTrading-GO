import { useLayoutStore } from '../../store/layoutStore';

export default function PanelRestoreBar() {
  const { panels, restorePanel, resetLayout, maximizePanel, maximizedPanel } = useLayoutStore();
  
  const hiddenPanels = Array.from(panels.values()).filter(p => !p.visible || p.minimized);
  const visiblePanels = Array.from(panels.values()).filter(p => p.visible && !p.minimized);

  if (hiddenPanels.length === 0 && !maximizedPanel) {
    return null;
  }

  return (
    <div className="absolute bottom-8 left-0 right-0 bg-terminal-border/95 backdrop-blur-sm border-t-2 border-terminal-accent px-3 py-1.5 flex items-center justify-between z-50 shadow-lg">
      <div className="flex items-center gap-3">
        {maximizedPanel && (
          <>
            <span className="text-xs text-terminal-text font-bold">MAXIMIZED:</span>
            <span className="text-xs text-terminal-accent font-semibold">
              {panels.get(maximizedPanel)?.title}
            </span>
            <span className="text-terminal-text opacity-50">|</span>
          </>
        )}
        {hiddenPanels.length > 0 && (
          <>
            <span className="text-xs text-terminal-text font-bold">RESTORE:</span>
            <div className="flex gap-1.5 flex-wrap">
              {hiddenPanels.map((panel) => (
                <button
                  key={panel.id}
                  onClick={() => restorePanel(panel.id)}
                  className="px-2.5 py-1 bg-terminal-panel border border-terminal-border rounded text-xs text-terminal-accent hover:bg-terminal-accent hover:text-terminal-bg transition-all font-semibold"
                >
                  {panel.title}
                </button>
              ))}
            </div>
          </>
        )}
        {!maximizedPanel && visiblePanels.length > 1 && (
          <>
            <span className="text-terminal-text opacity-50">|</span>
            <span className="text-xs text-terminal-text font-bold">MAXIMIZE:</span>
            <div className="flex gap-1.5 flex-wrap">
              {visiblePanels.map((panel) => (
                <button
                  key={panel.id}
                  onClick={() => maximizePanel(panel.id)}
                  className="px-2.5 py-1 bg-terminal-panel border border-terminal-border rounded text-xs text-terminal-accent hover:bg-terminal-accent hover:text-terminal-bg transition-all font-semibold"
                >
                  {panel.title}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <button
        onClick={resetLayout}
        className="px-3 py-1 bg-terminal-accent text-terminal-bg rounded text-xs font-bold hover:opacity-90 hover:shadow-lg transition-all"
      >
        RESET LAYOUT
      </button>
    </div>
  );
}

