import { useState, useEffect } from 'react';
import { useOptionStore } from '../../store/optionStore';
import { useWatchlistStore } from '../../store/watchlistStore';
import OptionChainTable from '../tables/OptionChainTable';
import WatchlistPanel from '../panels/WatchlistPanel';
import GreeksPanel from '../panels/GreeksPanel';
import PositionsPanel from '../panels/PositionsPanel';
import OrdersPanel from '../panels/OrdersPanel';

export default function BloombergLayout() {
  const { chains, getChain } = useOptionStore();
  const watchlistStore = useWatchlistStore();
  const [selectedUnderlying, setSelectedUnderlying] = useState<string | null>(null);
  const [selectedExpiry, setSelectedExpiry] = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState<number | undefined>();
  
  const underlyings = Array.from(chains.keys());
  
  // Auto-select first underlying
  useEffect(() => {
    if (underlyings.length > 0 && !selectedUnderlying) {
      setSelectedUnderlying(underlyings[0]);
    }
  }, [underlyings, selectedUnderlying]);

  const expiries = selectedUnderlying
    ? Array.from(chains.get(selectedUnderlying)?.keys() || [])
    : [];

  // Auto-select first expiry
  useEffect(() => {
    if (expiries.length > 0 && !selectedExpiry) {
      setSelectedExpiry(expiries[0]);
    }
  }, [expiries, selectedExpiry]);

  const chainData = selectedUnderlying && selectedExpiry
    ? getChain(selectedUnderlying, selectedExpiry)
    : [];

  return (
    <div className="h-full w-full grid grid-cols-12 grid-rows-6 gap-1 p-1 bg-terminal-bg">
      {/* Top Bar - Watchlist */}
      <div className="col-span-12 row-span-2 panel overflow-hidden flex flex-col">
        <div className="panel-header flex items-center justify-between px-2">
          <span className="text-xs font-bold text-terminal-accent tracking-wider">WATCHLIST</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-terminal-text">
              {watchlistStore.getWatchlist().length} instruments
            </span>
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-terminal-green rounded-full"></div>
              <div className="w-2 h-2 bg-terminal-red rounded-full"></div>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <WatchlistPanel />
        </div>
      </div>

      {/* Left Sidebar - Greeks & Info */}
      <div className="col-span-2 row-span-4 panel overflow-hidden flex flex-col">
        <div className="panel-header flex items-center justify-between px-2">
          <span className="text-xs font-bold text-terminal-accent tracking-wider">GREEKS</span>
        </div>
        <div className="flex-1 overflow-auto">
          <GreeksPanel selectedToken={selectedToken} />
        </div>
      </div>

      {/* Main Area - Option Chain */}
      <div className="col-span-8 row-span-4 panel overflow-hidden flex flex-col">
        <div className="panel-header flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-terminal-accent tracking-wider">OPTION CHAIN</span>
            {selectedUnderlying && (
              <>
                <span className="text-xs text-terminal-text opacity-50">|</span>
                <span className="text-xs font-semibold text-terminal-text">{selectedUnderlying}</span>
                {selectedExpiry && (
                  <>
                    <span className="text-xs text-terminal-text opacity-50">|</span>
                    <span className="text-xs text-terminal-text">
                      {new Date(selectedExpiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </>
                )}
              </>
            )}
          </div>
          <div className="flex gap-2">
            {expiries.length > 0 && (
              <select
                value={selectedExpiry || ''}
                onChange={(e) => setSelectedExpiry(e.target.value)}
                className="bg-terminal-bg border border-terminal-border px-2 py-0.5 text-xs text-terminal-text h-5"
              >
                {expiries.map((expiry) => (
                  <option key={expiry} value={expiry}>
                    {new Date(expiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          {chainData.length > 0 ? (
            <OptionChainTable
              chain={chainData}
              underlying={selectedUnderlying || ''}
              onRowClick={(token) => setSelectedToken(token)}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-terminal-text">
              <p className="text-xs">No option chain data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar - Positions & Orders */}
      <div className="col-span-2 row-span-4 panel overflow-hidden flex flex-col">
        <div className="panel-header flex items-center justify-between px-2 border-b border-terminal-border">
          <span className="text-xs font-bold text-terminal-accent tracking-wider">POSITIONS</span>
        </div>
        <div className="flex-1 overflow-auto border-b border-terminal-border">
          <PositionsPanel />
        </div>
        <div className="panel-header flex items-center justify-between px-2 border-b border-terminal-border">
          <span className="text-xs font-bold text-terminal-accent tracking-wider">ORDERS</span>
        </div>
        <div className="flex-1 overflow-auto">
          <OrdersPanel />
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="col-span-12 row-span-1 bg-terminal-border border-t-2 border-terminal-accent px-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="text-terminal-text font-semibold">STATUS:</span>
          <span className="text-terminal-green">CONNECTED</span>
          <span className="text-terminal-text opacity-50">|</span>
          <span className="text-terminal-text">LAST UPDATE:</span>
          <span className="text-terminal-accent">{new Date().toLocaleTimeString()}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-terminal-text opacity-70">HFT OPTION TERMINAL v1.0</span>
        </div>
      </div>
    </div>
  );
}

