import { useState, useEffect, useRef, useMemo } from 'react';
import { ParsedInstrument } from '../services/api';
import { useInstrumentStore } from '../store/instrumentStore';
import { useArbitrageStore } from '../store/arbitrageStore';
import { useWebSocketContext } from '../contexts/WebSocketContext';
import ArbitrageTable from '../components/tables/ArbitrageTable';
import ArbitrageColumnSelector, { ArbitrageColumnKey, loadArbitrageColumnVisibility } from '../components/panels/ArbitrageColumnSelector';

export default function ArbitragePage() {
  const { instruments, fetchInstruments } = useInstrumentStore();
  const { subscribe, unsubscribe, status: wsStatus } = useWebSocketContext();
  const {
    stocks,
    addStock,
    removeStock,
    getStocks,
    getTokensToSubscribe,
  } = useArbitrageStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filteredInstruments, setFilteredInstruments] = useState<ParsedInstrument[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<ArbitrageColumnKey>>(() => loadArbitrageColumnVisibility());
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const currentSubscribedTokensRef = useRef<number[]>([]);

  // Fetch instruments on mount
  useEffect(() => {
    fetchInstruments();
  }, [fetchInstruments]);

  // Filter instruments for search (only equity instruments from NSE and BSE)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredInstruments([]);
      setShowResults(false);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = instruments
      .filter(
        (inst) =>
          inst.instrumentType === 'EQ' &&
          (inst.exchange === 'NSE' || inst.exchange === 'BSE') &&
          (inst.tradingsymbol.toLowerCase().includes(query) ||
            inst.name.toLowerCase().includes(query))
      )
      .slice(0, 50);

    // Group by symbol to show unique stocks
    const symbolMap = new Map<string, ParsedInstrument>();
    filtered.forEach((inst) => {
      const symbol = inst.tradingsymbol.toUpperCase();
      if (!symbolMap.has(symbol)) {
        symbolMap.set(symbol, inst);
      }
    });

    setFilteredInstruments(Array.from(symbolMap.values()));
    setShowResults(filtered.length > 0);
  }, [searchQuery, instruments]);

  // Subscribe to tokens when stocks change
  const tokensToSubscribe = useMemo(() => {
    return getTokensToSubscribe();
  }, [stocks, getTokensToSubscribe]);

  useEffect(() => {
    if (wsStatus !== 'connected') {
      if (currentSubscribedTokensRef.current.length > 0) {
        unsubscribe(currentSubscribedTokensRef.current);
        currentSubscribedTokensRef.current = [];
      }
      return;
    }

    if (tokensToSubscribe.length === 0) {
      if (currentSubscribedTokensRef.current.length > 0) {
        unsubscribe(currentSubscribedTokensRef.current);
        currentSubscribedTokensRef.current = [];
      }
      return;
    }

    // Only subscribe/unsubscribe if tokens actually changed
    const currentTokens = currentSubscribedTokensRef.current.sort((a, b) => a - b);
    const newTokens = [...tokensToSubscribe].sort((a, b) => a - b);
    const tokensChanged =
      currentTokens.length !== newTokens.length ||
      currentTokens.some((token, index) => token !== newTokens[index]);

    if (tokensChanged) {
      // Unsubscribe from previous tokens
      if (currentSubscribedTokensRef.current.length > 0) {
        unsubscribe(currentSubscribedTokensRef.current);
      }

      // Subscribe to new tokens
      subscribe(tokensToSubscribe);
      currentSubscribedTokensRef.current = [...tokensToSubscribe];
    }
  }, [wsStatus, tokensToSubscribe, subscribe, unsubscribe]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentSubscribedTokensRef.current.length > 0 && wsStatus === 'connected') {
        unsubscribe(currentSubscribedTokensRef.current);
        currentSubscribedTokensRef.current = [];
      }
    };
  }, [unsubscribe, wsStatus]);

  const handleSelectStock = (symbol: string) => {
    const upperSymbol = symbol.toUpperCase();
    
    // Find NSE and BSE instruments for this symbol
    const nseInst = instruments.find(
      (inst) =>
        inst.tradingsymbol.toUpperCase() === upperSymbol &&
        inst.exchange === 'NSE' &&
        inst.instrumentType === 'EQ'
    );
    
    const bseInst = instruments.find(
      (inst) =>
        inst.tradingsymbol.toUpperCase() === upperSymbol &&
        inst.exchange === 'BSE' &&
        inst.instrumentType === 'EQ'
    );

    if (!nseInst && !bseInst) {
      console.warn(`No NSE or BSE instrument found for ${upperSymbol}`);
      return;
    }

    const name = nseInst?.name || bseInst?.name || upperSymbol;
    addStock(
      upperSymbol,
      name,
      nseInst?.instrumentToken,
      bseInst?.instrumentToken,
      nseInst?.tradingsymbol,
      bseInst?.tradingsymbol
    );

    setSearchQuery('');
    setShowResults(false);
  };

  const handleRemoveStock = (symbol: string) => {
    removeStock(symbol);
  };

  const arbitrageStocks = getStocks();

  return (
    <div className="h-full w-full bg-terminal-bg flex flex-col overflow-hidden">
      {/* Header Section */}
      <div className="border-b border-terminal-border p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-terminal-accent">ARBITRAGE OPPORTUNITIES</h1>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${wsStatus === 'connected' ? 'bg-terminal-green' : 'bg-terminal-red'}`} />
            <span className="text-xs text-terminal-text/70 capitalize">{wsStatus}</span>
          </div>
        </div>

        {/* Stock Search with Column Button */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (filteredInstruments.length > 0) {
                  setShowResults(true);
                }
              }}
              placeholder="Search stocks (e.g., RELIANCE, TCS, INFY)..."
              className="w-full px-3 py-2 bg-terminal-bg border border-terminal-border rounded text-sm text-terminal-text placeholder-terminal-text/50 focus:outline-none focus:ring-2 focus:ring-terminal-accent"
            />
            {showResults && filteredInstruments.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-terminal-bg border border-terminal-border rounded shadow-lg max-h-64 overflow-y-auto">
                {filteredInstruments.map((inst) => (
                  <div
                    key={inst.instrumentToken}
                    onClick={() => handleSelectStock(inst.tradingsymbol)}
                    className="px-3 py-2 cursor-pointer hover:bg-terminal-border/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-sm text-terminal-accent">
                          {inst.tradingsymbol}
                        </div>
                        <div className="text-xs text-terminal-text/60">{inst.name}</div>
                      </div>
                      <span className="text-xs text-terminal-text/50 px-2 py-0.5 bg-terminal-border/50 rounded">
                        {inst.exchange}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setShowColumnSelector(true)}
            className="px-3 py-2 text-xs bg-terminal-border border border-terminal-border text-terminal-text hover:border-terminal-accent transition-colors rounded whitespace-nowrap"
            title="Select Columns"
          >
            Columns
          </button>
        </div>
        
        {showColumnSelector && (
          <ArbitrageColumnSelector
            visibleColumns={visibleColumns}
            onColumnsChange={setVisibleColumns}
            onClose={() => setShowColumnSelector(false)}
          />
        )}

        {/* Selected Stocks */}
        {arbitrageStocks.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {arbitrageStocks.map((stock) => (
              <div
                key={stock.symbol}
                className="flex items-center gap-2 px-2 py-1 bg-terminal-border/50 rounded text-sm text-terminal-text"
              >
                <span>{stock.symbol}</span>
                <button
                  onClick={() => handleRemoveStock(stock.symbol)}
                  className="text-terminal-red hover:text-terminal-red/80"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Arbitrage Table */}
      <div className="flex-1 overflow-hidden">
        {arbitrageStocks.length === 0 ? (
          <div className="flex items-center justify-center h-full text-terminal-text/50">
            <div className="text-center">
              <p className="text-lg mb-2">No stocks selected</p>
              <p className="text-sm">Search and select stocks to view arbitrage opportunities</p>
            </div>
          </div>
        ) : (
          <ArbitrageTable
            stocks={arbitrageStocks}
            visibleColumns={visibleColumns}
          />
        )}
      </div>
    </div>
  );
}

