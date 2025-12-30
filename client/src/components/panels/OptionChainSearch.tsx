import { useEffect, useRef, useState, useMemo } from 'react';
import { ParsedInstrument } from '../../services/api';
import { useInstrumentStore } from '../../store/instrumentStore';

interface OptionChainSearchProps {
  onSelectUnderlying: (params: { name: string; token: number; symbol: string }) => void;
}

export default function OptionChainSearch({ onSelectUnderlying }: OptionChainSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredInstruments, setFilteredInstruments] = useState<ParsedInstrument[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { instruments, isLoading, fetchInstruments } = useInstrumentStore();

  // Fetch instruments on mount if not already loaded
  useEffect(() => {
    fetchInstruments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // fetchInstruments is stable from Zustand, no need to include in deps

  // Filter EQ instruments for search dropdown - memoize to prevent infinite loops
  const eqInstruments = useMemo(
    () => instruments.filter((inst) => inst.instrumentType === 'EQ'),
    [instruments]
  );

  // Filter instruments on query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredInstruments([]);
      setShowResults(false);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = eqInstruments
      .filter((inst) =>
        inst.tradingsymbol.toLowerCase().includes(query) ||
        inst.name.toLowerCase().includes(query) ||
        inst.exchange.toLowerCase().includes(query)
      )
      .slice(0, 50);

    setFilteredInstruments(filtered);
    setShowResults(filtered.length > 0);
    setSelectedIndex(-1);
  }, [searchQuery, eqInstruments]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectInstrument = (inst: ParsedInstrument) => {
    if (!inst) return;

    onSelectUnderlying({
      // Use tradingsymbol as the underlying identifier
      // Option chain instruments have name matching the EQ instrument's tradingsymbol
      name: inst.tradingsymbol,
      token: inst.instrumentToken,
      symbol: inst.tradingsymbol,
    });

    setSearchQuery('');
    setShowResults(false);
  };

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

  return (
    <div ref={containerRef} className="relative w-56">
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
          placeholder="Search EQ underlyings..."
          className="w-full px-2 py-1 bg-terminal-bg border border-terminal-border rounded text-[11px] text-terminal-text placeholder-terminal-text/50 focus:outline-none focus:ring-1 focus:ring-terminal-accent focus:border-terminal-accent"
        />
        {isLoading && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-terminal-text/50 text-[10px]">
            Loading...
          </div>
        )}
      </div>

      {showResults && filteredInstruments.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-terminal-bg border border-terminal-border rounded shadow-lg max-h-72 overflow-y-auto text-xs">
          {filteredInstruments.map((inst, index) => (
            <div
              key={`${inst.instrumentToken}-${index}`}
              onClick={() => handleSelectInstrument(inst)}
              className={`px-2 py-1 cursor-pointer hover:bg-terminal-border/50 transition-colors ${
                index === selectedIndex ? 'bg-terminal-border/70' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col">
                  <span className="font-semibold text-terminal-accent truncate">
                    {inst.tradingsymbol}
                  </span>
                  <span className="text-[10px] text-terminal-text/60 truncate">
                    {inst.name}
                  </span>
                </div>
                <span className="text-[10px] text-terminal-text/50">
                  {inst.exchange}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showResults && filteredInstruments.length === 0 && searchQuery.trim() && (
        <div className="absolute z-50 w-full mt-1 bg-terminal-bg border border-terminal-border rounded shadow-lg px-2 py-1 text-[11px] text-terminal-text/50">
          No EQ underlyings found
        </div>
      )}
    </div>
  );
}


