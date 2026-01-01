import { useState } from 'react';
import { useWatchlistStore } from '../../store/watchlistStore';
import WatchlistGroupSelector from './WatchlistGroupSelector';
import InstrumentSearch from './InstrumentSearch';
import WatchlistTable from '../tables/WatchlistTable';
import WatchlistColumnSelector, { WatchlistColumnKey, loadWatchlistColumnVisibility } from './WatchlistColumnSelector';

export default function WatchlistPanel() {
  const { getWatchlist, selectedGroupId } = useWatchlistStore();
  const watchlist = getWatchlist(selectedGroupId);
  const [visibleColumns, setVisibleColumns] = useState<Set<WatchlistColumnKey>>(() => loadWatchlistColumnVisibility());
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  return (
    <div className="h-full flex flex-col">
      {/* Group Selector */}
      <WatchlistGroupSelector />
      
      {/* Instrument Search with Column Button */}
      <div className="px-2 py-2 border-b border-terminal-border">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <InstrumentSearch />
          </div>
          <button
            onClick={() => setShowColumnSelector(true)}
            className="px-3 py-2 text-xs bg-terminal-border border border-terminal-border text-terminal-text hover:border-terminal-accent transition-colors rounded whitespace-nowrap"
            title="Select Columns"
          >
            Columns
          </button>
        </div>
      </div>
      
      {showColumnSelector && (
        <WatchlistColumnSelector
          visibleColumns={visibleColumns}
          onColumnsChange={setVisibleColumns}
          onClose={() => setShowColumnSelector(false)}
        />
      )}
      
      {/* Watchlist Table */}
      <div className="flex-1 min-h-0">
        {watchlist.length > 0 ? (
          <WatchlistTable watchlist={watchlist} visibleColumns={visibleColumns} />
        ) : (
          <div className="p-4 text-center text-terminal-text/50 text-xs h-full flex items-center justify-center">
            No instruments in watchlist
          </div>
        )}
      </div>
    </div>
  );
}
