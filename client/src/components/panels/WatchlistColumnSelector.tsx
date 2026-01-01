import { useState, useEffect } from 'react';

export type WatchlistColumnKey = 
  | 'symbol'
  | 'ltp'
  | 'change'
  | 'changePercent'
  | 'open'
  | 'high'
  | 'low'
  | 'close'
  | 'volume'
  | 'bid'
  | 'ask'
  | 'oi'
  | 'favorite';

export interface WatchlistColumnConfig {
  key: WatchlistColumnKey;
  label: string;
  group: 'price' | 'ohlc' | 'market' | 'other';
}

const ALL_COLUMNS: WatchlistColumnConfig[] = [
  { key: 'symbol', label: 'Symbol', group: 'other' },
  { key: 'ltp', label: 'LTP', group: 'price' },
  { key: 'change', label: 'Change', group: 'price' },
  { key: 'changePercent', label: 'Change %', group: 'price' },
  { key: 'open', label: 'Open', group: 'ohlc' },
  { key: 'high', label: 'High', group: 'ohlc' },
  { key: 'low', label: 'Low', group: 'ohlc' },
  { key: 'close', label: 'Close', group: 'ohlc' },
  { key: 'volume', label: 'Volume', group: 'market' },
  { key: 'bid', label: 'Bid', group: 'market' },
  { key: 'ask', label: 'Ask', group: 'market' },
  { key: 'oi', label: 'OI', group: 'market' },
  { key: 'favorite', label: 'Favorite', group: 'other' },
];

const STORAGE_KEY = 'watchlistColumnVisibility';

interface WatchlistColumnSelectorProps {
  visibleColumns: Set<WatchlistColumnKey>;
  onColumnsChange: (columns: Set<WatchlistColumnKey>) => void;
  onClose: () => void;
}

export default function WatchlistColumnSelector({ 
  visibleColumns, 
  onColumnsChange, 
  onClose 
}: WatchlistColumnSelectorProps) {
  const [localVisible, setLocalVisible] = useState<Set<WatchlistColumnKey>>(visibleColumns);

  useEffect(() => {
    setLocalVisible(visibleColumns);
  }, [visibleColumns]);

  const toggleColumn = (key: WatchlistColumnKey) => {
    const newVisible = new Set(localVisible);
    if (newVisible.has(key)) {
      newVisible.delete(key);
    } else {
      newVisible.add(key);
    }
    setLocalVisible(newVisible);
  };

  const handleApply = () => {
    onColumnsChange(localVisible);
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(localVisible)));
    onClose();
  };

  const handleReset = () => {
    const allColumns = new Set(ALL_COLUMNS.map(col => col.key));
    setLocalVisible(allColumns);
  };

  const priceColumns = ALL_COLUMNS.filter(col => col.group === 'price');
  const ohlcColumns = ALL_COLUMNS.filter(col => col.group === 'ohlc');
  const marketColumns = ALL_COLUMNS.filter(col => col.group === 'market');
  const otherColumns = ALL_COLUMNS.filter(col => col.group === 'other');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div 
        className="bg-terminal-panel border border-terminal-border rounded shadow-lg w-[500px] max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-terminal-border border-b border-terminal-border px-4 py-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-terminal-text">Select Columns</h3>
          <button
            onClick={onClose}
            className="text-terminal-text/60 hover:text-terminal-text text-lg leading-none"
          >
            ×
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-6">
            {/* Price Columns */}
            <div>
              <h4 className="text-xs font-semibold text-terminal-accent mb-2 uppercase">Price</h4>
              <div className="space-y-2">
                {priceColumns.map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center gap-2 cursor-pointer hover:bg-terminal-border/30 px-2 py-1 rounded text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={localVisible.has(col.key)}
                      onChange={() => toggleColumn(col.key)}
                      className="w-3 h-3 accent-terminal-accent cursor-pointer"
                    />
                    <span className="text-terminal-text">{col.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* OHLC Columns */}
            <div>
              <h4 className="text-xs font-semibold text-terminal-accent mb-2 uppercase">OHLC</h4>
              <div className="space-y-2">
                {ohlcColumns.map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center gap-2 cursor-pointer hover:bg-terminal-border/30 px-2 py-1 rounded text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={localVisible.has(col.key)}
                      onChange={() => toggleColumn(col.key)}
                      className="w-3 h-3 accent-terminal-accent cursor-pointer"
                    />
                    <span className="text-terminal-text">{col.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Market Data Columns */}
            <div>
              <h4 className="text-xs font-semibold text-terminal-accent mb-2 uppercase">Market Data</h4>
              <div className="space-y-2">
                {marketColumns.map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center gap-2 cursor-pointer hover:bg-terminal-border/30 px-2 py-1 rounded text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={localVisible.has(col.key)}
                      onChange={() => toggleColumn(col.key)}
                      className="w-3 h-3 accent-terminal-accent cursor-pointer"
                    />
                    <span className="text-terminal-text">{col.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Other Columns */}
            <div>
              <h4 className="text-xs font-semibold text-terminal-accent mb-2 uppercase">Other</h4>
              <div className="space-y-2">
                {otherColumns.map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center gap-2 cursor-pointer hover:bg-terminal-border/30 px-2 py-1 rounded text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={localVisible.has(col.key)}
                      onChange={() => toggleColumn(col.key)}
                      className="w-3 h-3 accent-terminal-accent cursor-pointer"
                    />
                    <span className="text-terminal-text">{col.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-terminal-border border-t border-terminal-border px-4 py-2 flex items-center justify-end gap-2">
          <button
            onClick={handleReset}
            className="px-3 py-1 text-xs bg-terminal-bg border border-terminal-border text-terminal-text hover:border-terminal-accent transition-colors rounded"
          >
            Reset
          </button>
          <button
            onClick={handleApply}
            className="px-3 py-1 text-xs bg-terminal-accent text-terminal-bg hover:opacity-90 transition-opacity rounded"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

export function loadWatchlistColumnVisibility(): Set<WatchlistColumnKey> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const array = JSON.parse(stored) as WatchlistColumnKey[];
      return new Set(array);
    }
  } catch (error) {
    console.error('Failed to load watchlist column visibility:', error);
  }
  // Default: all columns visible
  return new Set(ALL_COLUMNS.map(col => col.key));
}

