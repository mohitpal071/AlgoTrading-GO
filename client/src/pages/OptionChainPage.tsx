import { useEffect, useState, useRef } from 'react';
import OptionChainTable from '../components/tables/OptionChainTable';
import OptionChainSearch from '../components/panels/OptionChainSearch';
import { useOptionStore } from '../store/optionStore';
import { useInstrumentStore } from '../store/instrumentStore';
import { useWebSocketContext } from '../contexts/WebSocketContext';
import { ParsedInstrument } from '../services/api';
import { OptionData } from '../types/option';
import ColumnSelector, { ColumnKey, loadColumnVisibility } from '../components/panels/ColumnSelector';

export default function OptionChainPage() {
  const { chains, getChain, setOptionData } = useOptionStore();
  const { instruments: allInstruments } = useInstrumentStore();
  const { subscribe, unsubscribe, status: wsStatus } = useWebSocketContext();
  const [selectedUnderlying, setSelectedUnderlying] = useState<string | null>(null);
  const [selectedExpiry, setSelectedExpiry] = useState<string | null>(null);
  const [availableExpiries, setAvailableExpiries] = useState<string[]>([]);
  const [selectedToken, setSelectedToken] = useState<number | undefined>();
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(() => loadColumnVisibility());
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const currentSubscribedTokensRef = useRef<number[]>([]);

  const underlyings = Array.from(chains.keys());

  // Helper function to get the search name for options
  const getOptionSearchName = (underlying: string): string => {
    if (underlying === 'NIFTY 50') {
      return 'NIFTY';
    }
    return underlying;
  };

  useEffect(() => {
    if (underlyings.length > 0 && !selectedUnderlying) {
      setSelectedUnderlying(underlyings[0]);
    }
  }, [underlyings, selectedUnderlying]);

  useEffect(() => {
    if (availableExpiries.length > 0 && !selectedExpiry) {
      setSelectedExpiry(availableExpiries[0]);
    }
  }, [availableExpiries, selectedExpiry]);

  const chainData = selectedUnderlying && selectedExpiry
    ? getChain(selectedUnderlying, selectedExpiry)
    : [];

  // When an EQ underlying is selected, find available expiries
  useEffect(() => {
    if (!selectedUnderlying || allInstruments.length === 0) return;

    const optionSearchName = getOptionSearchName(selectedUnderlying);

    const optionInstruments = allInstruments.filter(
      (inst) =>
        (inst.instrumentType === 'CE' || inst.instrumentType === 'PE') &&
        inst.exchange === 'NFO' &&
        inst.name === optionSearchName &&
        inst.strikePrice !== undefined &&
        inst.expiry !== undefined
    );

    if (optionInstruments.length === 0) {
      return;
    }

    const expirySet = new Set<string>();
    optionInstruments.forEach((inst) => {
      if (inst.expiry) {
        expirySet.add(inst.expiry);
      }
    });

    const availableExpiriesList = Array.from(expirySet).sort();
    setAvailableExpiries(availableExpiriesList);

    if (!selectedExpiry && availableExpiriesList.length > 0) {
      setSelectedExpiry(availableExpiriesList[0]);
    }
  }, [selectedUnderlying, allInstruments, selectedExpiry]);

  // Subscribe to options for the selected expiry
  useEffect(() => {
    if (wsStatus !== 'connected' || !selectedUnderlying || !selectedExpiry || allInstruments.length === 0) {
      return;
    }

    const optionSearchName = getOptionSearchName(selectedUnderlying);

    const optionInstruments = allInstruments.filter(
      (inst) =>
        (inst.instrumentType === 'CE' || inst.instrumentType === 'PE') &&
        inst.exchange === 'NFO' &&
        inst.name === optionSearchName &&
        inst.expiry === selectedExpiry &&
        inst.strikePrice !== undefined
    );

    if (optionInstruments.length === 0) {
      if (currentSubscribedTokensRef.current.length > 0) {
        unsubscribe(currentSubscribedTokensRef.current);
        currentSubscribedTokensRef.current = [];
      }
      return;
    }

    const optionTokens = optionInstruments
      .map((inst) => inst.instrumentToken)
      .filter((token): token is number => token !== undefined && token !== null);

    if (optionTokens.length === 0) return;

    if (currentSubscribedTokensRef.current.length > 0) {
      unsubscribe(currentSubscribedTokensRef.current);
    }

    subscribe(optionTokens);
    currentSubscribedTokensRef.current = optionTokens;
  }, [wsStatus, selectedUnderlying, selectedExpiry, allInstruments, subscribe, unsubscribe]);

  // Cleanup: Unsubscribe when component unmounts
  useEffect(() => {
    return () => {
      if (currentSubscribedTokensRef.current.length > 0 && wsStatus === 'connected') {
        unsubscribe(currentSubscribedTokensRef.current);
        currentSubscribedTokensRef.current = [];
      }
    };
  }, [unsubscribe, wsStatus]);

  // Populate option store when underlying and expiry are selected
  useEffect(() => {
    if (!selectedUnderlying || !selectedExpiry || allInstruments.length === 0) return;

    const optionSearchName = getOptionSearchName(selectedUnderlying);

    const optionInstruments = allInstruments.filter(
      (inst) =>
        (inst.instrumentType === 'CE' || inst.instrumentType === 'PE') &&
        inst.exchange === 'NFO' &&
        inst.name === optionSearchName &&
        inst.expiry === selectedExpiry &&
        inst.strikePrice !== undefined
    );

    if (optionInstruments.length === 0) {
      return;
    }

    const optionsByStrike = new Map<number, { call?: ParsedInstrument; put?: ParsedInstrument }>();
    
    optionInstruments.forEach((inst) => {
      const strike = inst.strikePrice!;
      if (!optionsByStrike.has(strike)) {
        optionsByStrike.set(strike, {});
      }
      const strikeData = optionsByStrike.get(strike)!;
      if (inst.instrumentType === 'CE') {
        strikeData.call = inst;
      } else if (inst.instrumentType === 'PE') {
        strikeData.put = inst;
      }
    });

    optionsByStrike.forEach((strikeData, strike) => {
      if (strikeData.call) {
        const ce: OptionData = {
          instrumentToken: strikeData.call.instrumentToken,
          tradingSymbol: strikeData.call.tradingsymbol,
          type: 'CE',
          strike,
          expiry: selectedExpiry,
          lastPrice: 0,
          openPrice: 0,
          bidPrice: 0,
          askPrice: 0,
          bidQty: 0,
          askQty: 0,
          volume: 0,
          oi: 0,
          previousOI: 0,
          lastUpdated: Date.now(),
          iv: 0,
          delta: 0,
          gamma: 0,
          theta: 0,
          vega: 0,
          intrinsicValue: 0,
          timeValue: 0,
          underlying: selectedUnderlying,
          underlyingPrice: 0,
        };
        setOptionData(ce.instrumentToken, ce);
      }

      if (strikeData.put) {
        const pe: OptionData = {
          instrumentToken: strikeData.put.instrumentToken,
          tradingSymbol: strikeData.put.tradingsymbol,
          type: 'PE',
          strike,
          expiry: selectedExpiry,
          lastPrice: 0,
          openPrice: 0,
          bidPrice: 0,
          askPrice: 0,
          bidQty: 0,
          askQty: 0,
          volume: 0,
          oi: 0,
          previousOI: 0,
          lastUpdated: Date.now(),
          iv: 0,
          delta: 0,
          gamma: 0,
          theta: 0,
          vega: 0,
          intrinsicValue: 0,
          timeValue: 0,
          underlying: selectedUnderlying,
          underlyingPrice: 0,
        };
        setOptionData(pe.instrumentToken, pe);
      }
    });
  }, [selectedUnderlying, selectedExpiry, allInstruments, setOptionData]);

  const handleUnderlyingChange = (underlying: string) => {
    if (currentSubscribedTokensRef.current.length > 0 && wsStatus === 'connected') {
      unsubscribe(currentSubscribedTokensRef.current);
      currentSubscribedTokensRef.current = [];
    }
    setSelectedUnderlying(underlying);
    setSelectedExpiry(null);
    setAvailableExpiries([]);
  };

  return (
    <div className="h-full w-full bg-terminal-bg flex flex-col">
      {/* Header Controls */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-terminal-border/50 bg-terminal-border/30 gap-3">
        <div className="flex items-center gap-3 text-xs min-w-0">
          {selectedUnderlying ? (
            <>
              <span className="font-bold text-terminal-accent truncate max-w-[160px]">
                {selectedUnderlying}
              </span>
              {selectedExpiry && (
                <>
                  <span className="text-terminal-text opacity-50">|</span>
                  <span className="text-terminal-text">
                    {new Date(selectedExpiry).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </>
              )}
            </>
          ) : (
            <span className="text-terminal-text/60 text-[11px]">
              Select an EQ underlying to view option chain
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <OptionChainSearch
            onSelectUnderlying={({ name }) => {
              handleUnderlyingChange(name);
            }}
          />
          <button
            onClick={() => setShowColumnSelector(true)}
            className="px-3 py-1 text-xs bg-terminal-border border border-terminal-border text-terminal-text hover:border-terminal-accent transition-colors rounded whitespace-nowrap h-7"
            title="Select Columns"
          >
            Columns
          </button>
          {availableExpiries.length > 0 && (
            <select
              value={selectedExpiry || ''}
              onChange={(e) => setSelectedExpiry(e.target.value)}
              className="bg-terminal-bg border border-terminal-border px-2 py-1 text-xs text-terminal-text h-7 rounded hover:border-terminal-accent transition-colors"
            >
              {availableExpiries.map((expiry: string) => (
                <option key={expiry} value={expiry}>
                  {new Date(expiry).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Column Selector Modal */}
      {showColumnSelector && (
        <ColumnSelector
          visibleColumns={visibleColumns}
          onColumnsChange={setVisibleColumns}
          onClose={() => setShowColumnSelector(false)}
        />
      )}

      {/* Option Chain Table */}
      <div className="flex-1 overflow-hidden">
        {chainData.length > 0 ? (
          <OptionChainTable
            chain={chainData}
            underlying={selectedUnderlying || ''}
            visibleColumns={visibleColumns}
            onRowClick={(token) => setSelectedToken(token)}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-terminal-text">
            <p className="text-xs">No option chain data available</p>
          </div>
        )}
      </div>
    </div>
  );
}

