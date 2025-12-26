interface SidebarProps {
  underlyings: string[];
  selectedUnderlying: string | null;
  onSelectUnderlying: (underlying: string) => void;
}

export default function Sidebar({ underlyings, selectedUnderlying, onSelectUnderlying }: SidebarProps) {
  return (
    <aside className="w-64 bg-terminal-panel border-r border-terminal-border p-4 overflow-y-auto">
      <h2 className="text-sm font-semibold text-terminal-accent mb-4">Watchlist</h2>
      <div className="space-y-1">
        {underlyings.map((underlying) => (
          <button
            key={underlying}
            onClick={() => onSelectUnderlying(underlying)}
            className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
              selectedUnderlying === underlying
                ? 'bg-terminal-accent text-terminal-bg'
                : 'hover:bg-terminal-border'
            }`}
          >
            {underlying}
          </button>
        ))}
      </div>
    </aside>
  );
}

