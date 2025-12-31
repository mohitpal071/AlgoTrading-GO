import { useState, useEffect, useRef } from 'react';
import { ParsedInstrument } from '../../services/api';
import { useWatchlistStore } from '../../store/watchlistStore';
import { useWebSocketContext } from '../../contexts/WebSocketContext';
import { useInstrumentStore } from '../../store/instrumentStore';
import { Instrument } from '../../types/instrument';

export default function InstrumentSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredInstruments, setFilteredInstruments] = useState<ParsedInstrument[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { addInstrument, addSymbolToGroup, selectedGroupId, getInstrument } = useWatchlistStore();
  const { instruments, isLoading, fetchInstruments } = useInstrumentStore();

  // Fetch instruments on mount if not already loaded
  useEffect(() => {
    fetchInstruments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // fetchInstruments is stable from Zustand, no need to include in deps

  // Filter instruments based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredInstruments([]);
      setShowResults(false);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = instruments.filter(
      (inst) =>
        inst.tradingsymbol.toLowerCase().includes(query) ||
        inst.name.toLowerCase().includes(query) ||
        inst.exchange.toLowerCase().includes(query)
    ).slice(0, 50); // Limit to 50 results for performance

    setFilteredInstruments(filtered);
    setShowResults(filtered.length > 0);
    setSelectedIndex(-1);
  }, [searchQuery, instruments]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || filteredInstruments.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredInstruments.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredInstruments.length) {
          handleSelectInstrument(filteredInstruments[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowResults(false);
        setSearchQuery('');
        break;
    }
  };

  const handleSelectInstrument = (inst: ParsedInstrument) => {
    // Check if instrument already exists
    const existing = getInstrument(inst.tradingsymbol);
    if (existing) {
      // If it exists, just add to current group if not already there
      if (selectedGroupId) {
        addSymbolToGroup(selectedGroupId, inst.tradingsymbol);
      }
      // Don't subscribe here - WatchlistPage will handle all subscriptions
      setSearchQuery('');
      setShowResults(false);
      return;
    }

    // Create new Instrument object
    const newInstrument: Instrument = {
      symbol: inst.tradingsymbol,
      name: inst.name,
      exchange: inst.exchange,
      instrumentToken: inst.instrumentToken,
      lastPrice: 0,
      previousClose: 0,
      change: 0,
      changePercent: 0,
      open: 0,
      high: 0,
      low: 0,
      close: 0,
      volume: 0,
      bid: 0,
      ask: 0,
      bidSize: 0,
      askSize: 0,
      timestamp: Date.now(),
    };

    // Add to watchlist store
    addInstrument(newInstrument);
    console.log(`Added instrument to watchlist:`, {
      symbol: inst.tradingsymbol,
      token: inst.instrumentToken,
      name: inst.name,
    });

    // Add to current group if one is selected
    if (selectedGroupId) {
      addSymbolToGroup(selectedGroupId, inst.tradingsymbol);
    }

    // Don't subscribe here - WatchlistPage will handle all subscriptions
    // This prevents double subscriptions and the subscribe/unsubscribe loop

    setSearchQuery('');
    setShowResults(false);
  };

  return (
    <div ref={searchRef} className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (filteredInstruments.length > 0) {
              setShowResults(true);
            }
          }}
          placeholder="Search instruments (symbol, name, exchange)..."
          className="w-full px-3 py-2 bg-terminal-bg border border-terminal-border rounded text-sm text-terminal-text placeholder-terminal-text/50 focus:outline-none focus:ring-2 focus:ring-terminal-accent focus:border-terminal-accent"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-terminal-text/50 text-xs">
            Loading...
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && filteredInstruments.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-terminal-bg border border-terminal-border rounded shadow-lg max-h-96 overflow-y-auto">
          {filteredInstruments.map((inst, index) => (
            <div
              key={`${inst.instrumentToken}-${index}`}
              onClick={() => handleSelectInstrument(inst)}
              className={`px-3 py-2 cursor-pointer hover:bg-terminal-border/50 transition-colors ${
                index === selectedIndex ? 'bg-terminal-border/70' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-terminal-accent truncate">
                      {inst.tradingsymbol}
                    </span>
                    <span className="text-xs text-terminal-text/70 px-1.5 py-0.5 bg-terminal-border/50 rounded">
                      {inst.instrumentType}
                    </span>
                  </div>
                  <div className="text-xs text-terminal-text/60 truncate mt-0.5">
                    {inst.name}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-terminal-text/50">
                    <span>{inst.exchange}</span>
                    <span>•</span>
                    <span>{inst.segment}</span>
                    {inst.lotSize > 0 && (
                      <>
                        <span>•</span>
                        <span>Lot: {inst.lotSize}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showResults && filteredInstruments.length === 0 && searchQuery.trim() && (
        <div className="absolute z-50 w-full mt-1 bg-terminal-bg border border-terminal-border rounded shadow-lg px-3 py-2 text-sm text-terminal-text/50">
          No instruments found
        </div>
      )}
    </div>
  );
}

