import { useWatchlistStore } from '../../store/watchlistStore';

export default function WatchlistGroupSelector() {
  const { 
    groups, 
    selectedGroupId, 
    selectGroup,
    getSelectedGroup 
  } = useWatchlistStore();
  
  const groupList = Array.from(groups.values());
  const selectedGroup = getSelectedGroup();

  return (
    <div className="border-b border-terminal-border/50 bg-terminal-border/30 px-2 py-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-terminal-text font-semibold">GROUPS:</span>
        <button
          onClick={() => selectGroup(null)}
          className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
            selectedGroupId === null
              ? 'bg-terminal-accent text-terminal-bg'
              : 'bg-terminal-panel border border-terminal-border text-terminal-text hover:bg-terminal-border'
          }`}
        >
          ALL
        </button>
        {groupList.map((group) => (
          <button
            key={group.id}
            onClick={() => selectGroup(group.id)}
            className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
              selectedGroupId === group.id
                ? 'bg-terminal-accent text-terminal-bg'
                : 'bg-terminal-panel border border-terminal-border text-terminal-text hover:bg-terminal-border'
            }`}
            style={selectedGroupId === group.id ? {} : { borderColor: group.color }}
          >
            {group.name}
            <span className="ml-1 text-[10px] opacity-70">
              ({group.symbols.length})
            </span>
          </button>
        ))}
      </div>
      {selectedGroup && (
        <div className="mt-1 text-[10px] text-terminal-text/70">
          Showing {selectedGroup.symbols.length} instruments from {selectedGroup.name}
        </div>
      )}
    </div>
  );
}

