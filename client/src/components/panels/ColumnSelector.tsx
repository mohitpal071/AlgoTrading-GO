import { useState, useEffect } from 'react';

export type ColumnKey = 
  | 'call.gamma' 
  | 'call.theta' 
  | 'call.vega' 
  | 'call.iv' 
  | 'call.ltp' 
  | 'call.volume' 
  | 'call.oi'
  | 'put.ltp' 
  | 'put.volume' 
  | 'put.oi' 
  | 'put.theta' 
  | 'put.iv' 
  | 'put.vega' 
  | 'put.gamma';

export interface ColumnConfig {
  key: ColumnKey;
  label: string;
  group: 'call' | 'put';
}

const ALL_COLUMNS: ColumnConfig[] = [
  { key: 'call.gamma', label: 'Gamma', group: 'call' },
  { key: 'call.theta', label: 'Theta', group: 'call' },
  { key: 'call.vega', label: 'Vega', group: 'call' },
  { key: 'call.iv', label: 'IV', group: 'call' },
  { key: 'call.ltp', label: 'LTP', group: 'call' },
  { key: 'call.volume', label: 'Volume', group: 'call' },
  { key: 'call.oi', label: 'OI', group: 'call' },
  { key: 'put.ltp', label: 'LTP', group: 'put' },
  { key: 'put.volume', label: 'Volume', group: 'put' },
  { key: 'put.oi', label: 'OI', group: 'put' },
  { key: 'put.theta', label: 'Theta', group: 'put' },
  { key: 'put.iv', label: 'IV', group: 'put' },
  { key: 'put.vega', label: 'Vega', group: 'put' },
  { key: 'put.gamma', label: 'Gamma', group: 'put' },
];

const STORAGE_KEY = 'optionChainColumnVisibility';

interface ColumnSelectorProps {
  visibleColumns: Set<ColumnKey>;
  onColumnsChange: (columns: Set<ColumnKey>) => void;
  onClose: () => void;
}

export default function ColumnSelector({ 
  visibleColumns, 
  onColumnsChange, 
  onClose 
}: ColumnSelectorProps) {
  const [localVisible, setLocalVisible] = useState<Set<ColumnKey>>(visibleColumns);

  useEffect(() => {
    setLocalVisible(visibleColumns);
  }, [visibleColumns]);

  const toggleColumn = (key: ColumnKey) => {
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

  const callColumns = ALL_COLUMNS.filter(col => col.group === 'call');
  const putColumns = ALL_COLUMNS.filter(col => col.group === 'put');

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
            {/* Call Columns */}
            <div>
              <h4 className="text-xs font-semibold text-terminal-accent mb-2 uppercase">Call Columns</h4>
              <div className="space-y-2">
                {callColumns.map((col) => (
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

            {/* Put Columns */}
            <div>
              <h4 className="text-xs font-semibold text-terminal-accent mb-2 uppercase">Put Columns</h4>
              <div className="space-y-2">
                {putColumns.map((col) => (
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

export function loadColumnVisibility(): Set<ColumnKey> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const array = JSON.parse(stored) as ColumnKey[];
      return new Set(array);
    }
  } catch (error) {
    console.error('Failed to load column visibility:', error);
  }
  // Default: all columns visible
  return new Set(ALL_COLUMNS.map(col => col.key));
}

