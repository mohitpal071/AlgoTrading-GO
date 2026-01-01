import { useState, useEffect } from 'react';

export type ArbitrageColumnKey = 
  | 'symbol'
  | 'name'
  | 'nsePrice'
  | 'bsePrice'
  | 'difference'
  | 'diffPercent'
  | 'opportunity'
  | 'nseVolume'
  | 'bseVolume';

export interface ArbitrageColumnConfig {
  key: ArbitrageColumnKey;
  label: string;
  group: 'basic' | 'prices' | 'arbitrage' | 'volume';
}

const ALL_COLUMNS: ArbitrageColumnConfig[] = [
  { key: 'symbol', label: 'Symbol', group: 'basic' },
  { key: 'name', label: 'Name', group: 'basic' },
  { key: 'nsePrice', label: 'NSE Price', group: 'prices' },
  { key: 'bsePrice', label: 'BSE Price', group: 'prices' },
  { key: 'difference', label: 'Difference', group: 'arbitrage' },
  { key: 'diffPercent', label: 'Diff %', group: 'arbitrage' },
  { key: 'opportunity', label: 'Opportunity', group: 'arbitrage' },
  { key: 'nseVolume', label: 'NSE Volume', group: 'volume' },
  { key: 'bseVolume', label: 'BSE Volume', group: 'volume' },
];

const STORAGE_KEY = 'arbitrageColumnVisibility';

interface ArbitrageColumnSelectorProps {
  visibleColumns: Set<ArbitrageColumnKey>;
  onColumnsChange: (columns: Set<ArbitrageColumnKey>) => void;
  onClose: () => void;
}

export default function ArbitrageColumnSelector({ 
  visibleColumns, 
  onColumnsChange, 
  onClose 
}: ArbitrageColumnSelectorProps) {
  const [localVisible, setLocalVisible] = useState<Set<ArbitrageColumnKey>>(visibleColumns);

  useEffect(() => {
    setLocalVisible(visibleColumns);
  }, [visibleColumns]);

  const toggleColumn = (key: ArbitrageColumnKey) => {
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

  const basicColumns = ALL_COLUMNS.filter(col => col.group === 'basic');
  const priceColumns = ALL_COLUMNS.filter(col => col.group === 'prices');
  const arbitrageColumns = ALL_COLUMNS.filter(col => col.group === 'arbitrage');
  const volumeColumns = ALL_COLUMNS.filter(col => col.group === 'volume');

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
            {/* Basic Columns */}
            <div>
              <h4 className="text-xs font-semibold text-terminal-accent mb-2 uppercase">Basic</h4>
              <div className="space-y-2">
                {basicColumns.map((col) => (
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

            {/* Price Columns */}
            <div>
              <h4 className="text-xs font-semibold text-terminal-accent mb-2 uppercase">Prices</h4>
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

            {/* Arbitrage Columns */}
            <div>
              <h4 className="text-xs font-semibold text-terminal-accent mb-2 uppercase">Arbitrage</h4>
              <div className="space-y-2">
                {arbitrageColumns.map((col) => (
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

            {/* Volume Columns */}
            <div>
              <h4 className="text-xs font-semibold text-terminal-accent mb-2 uppercase">Volume</h4>
              <div className="space-y-2">
                {volumeColumns.map((col) => (
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

export function loadArbitrageColumnVisibility(): Set<ArbitrageColumnKey> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const array = JSON.parse(stored) as ArbitrageColumnKey[];
      return new Set(array);
    }
  } catch (error) {
    console.error('Failed to load arbitrage column visibility:', error);
  }
  // Default: all columns visible
  return new Set(ALL_COLUMNS.map(col => col.key));
}

