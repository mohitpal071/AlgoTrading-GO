import { useLayoutStore } from '../../store/layoutStore';

export default function PanelRestoreBar() {
  const { panels, restorePanel, resetLayout } = useLayoutStore();
  
  const hiddenPanels = Array.from(panels.values()).filter(p => !p.visible || p.minimized);

  if (hiddenPanels.length === 0) {
    return null;
  }

  return (
    <div className="absolute bottom-8 left-0 right-0 bg-terminal-border border-t-2 border-terminal-accent px-3 py-1 flex items-center justify-between z-50">
      <div className="flex items-center gap-2">
        <span className="text-xs text-terminal-text font-semibold">RESTORE:</span>
        <div className="flex gap-1">
          {hiddenPanels.map((panel) => (
            <button
              key={panel.id}
              onClick={() => restorePanel(panel.id)}
              className="px-2 py-1 bg-terminal-panel border border-terminal-border rounded text-xs text-terminal-accent hover:bg-terminal-border transition-colors"
            >
              {panel.title}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={resetLayout}
        className="px-2 py-1 bg-terminal-accent text-terminal-bg rounded text-xs font-semibold hover:opacity-80 transition-opacity"
      >
        RESET LAYOUT
      </button>
    </div>
  );
}

