import { useLayoutStore } from '../../store/layoutStore';

export default function MaximizeControls() {
  const { panels, maximizePanel, maximizedPanel } = useLayoutStore();
  
  const allPanels = Array.from(panels.values()).filter(p => p.visible);

  if (!maximizedPanel) {
    return null;
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-terminal-border/95 backdrop-blur-sm border-t-2 border-terminal-accent px-4 py-2 flex items-center justify-between z-50 shadow-lg">
      <div className="flex items-center gap-3">
        <span className="text-xs text-terminal-text font-bold">MAXIMIZED:</span>
        <span className="text-xs text-terminal-accent font-semibold">
          {panels.get(maximizedPanel)?.title}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-terminal-text font-bold">SWITCH TO:</span>
        {allPanels
          .filter(p => p.id !== maximizedPanel)
          .map((panel) => (
            <button
              key={panel.id}
              onClick={() => maximizePanel(panel.id)}
              className="px-3 py-1.5 bg-terminal-panel border border-terminal-border rounded text-xs text-terminal-accent hover:bg-terminal-accent hover:text-terminal-bg transition-all font-semibold"
            >
              {panel.title}
            </button>
          ))}
        <button
          onClick={() => maximizePanel(maximizedPanel)}
          className="px-3 py-1.5 bg-terminal-accent text-terminal-bg rounded text-xs font-bold hover:opacity-90 hover:shadow-lg transition-all"
        >
          RESTORE
        </button>
      </div>
    </div>
  );
}

