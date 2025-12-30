import { useMemo, useState, useEffect, useRef } from 'react';
import GridLayout, { Layout } from 'react-grid-layout';
import { useLayoutStore, PanelId } from '../../store/layoutStore';
import WatchlistPanel from '../panels/WatchlistPanel';
import OptionChainTable from '../tables/OptionChainTable';
import PositionsPanel from '../panels/PositionsPanel';
import OrdersPanel from '../panels/OrdersPanel';
import { useOptionStore } from '../../store/optionStore';
import { useInstrumentStore } from '../../store/instrumentStore';
import { useWebSocketContext } from '../../contexts/WebSocketContext';
import OptionChainSearch from '../panels/OptionChainSearch';
import { ParsedInstrument } from '../../services/api';
import { OptionData } from '../../types/option';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

interface PanelContentProps {
  panelId: PanelId;
  selectedToken?: number;
  selectedUnderlying: string | null;
  selectedExpiry: string | null;
  chainData: any[];
  onRowClick: (token: number) => void;
  onExpiryChange: (expiry: string) => void;
  expiries: string[];
  onUnderlyingChange: (underlying: string) => void;
}

function PanelContent({
  panelId,
  selectedToken,
  selectedUnderlying,
  selectedExpiry,
  chainData,
  onRowClick,
                onExpiryChange,
                expiries: availableExpiries,
                onUnderlyingChange,
}: PanelContentProps) {
  switch (panelId) {
    case 'watchlist':
      return <WatchlistPanel />;
    case 'optionChain':
      return (
        <div className="h-full flex flex-col">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-terminal-border/50 bg-terminal-border/30 gap-3">
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
                onUnderlyingChange(name);
              }}
            />
            {availableExpiries.length > 0 && (
              <select
                value={selectedExpiry || ''}
                onChange={(e) => onExpiryChange(e.target.value)}
                className="bg-terminal-bg border border-terminal-border px-2 py-0.5 text-xs text-terminal-text h-6 rounded hover:border-terminal-accent transition-colors"
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
          <div className="flex-1 overflow-hidden">
            {chainData.length > 0 ? (
              <OptionChainTable
                chain={chainData}
                underlying={selectedUnderlying || ''}
                onRowClick={onRowClick}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-terminal-text">
                <p className="text-xs">No option chain data available</p>
              </div>
            )}
        </div>
      </div>
      );
    case 'positions':
      return <PositionsPanel />;
    case 'orders':
      return <OrdersPanel />;
    default:
      return null;
  }
}

interface PanelWrapperProps {
  panelId: PanelId;
  title: string;
  children: React.ReactNode;
  isMaximized: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
}

function PanelWrapper({ panelId, title, children, isMaximized, onMinimize, onMaximize, onClose }: PanelWrapperProps) {
  return (
    <div className="panel h-full w-full flex flex-col overflow-hidden relative group">
      <div className="panel-header flex items-center justify-between px-2 cursor-move select-none">
        <span className="text-xs font-bold text-terminal-accent tracking-wider">{title}</span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMaximize();
            }}
            className="w-5 h-5 flex items-center justify-center text-terminal-text hover:bg-terminal-accent hover:text-terminal-bg rounded transition-colors text-xs font-bold"
            title={isMaximized ? "Restore" : "Maximize"}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {isMaximized ? '⤓' : '⤢'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMinimize();
            }}
            className="w-5 h-5 flex items-center justify-center text-terminal-text hover:bg-terminal-border rounded transition-colors text-xs font-bold"
            title="Minimize"
            onMouseDown={(e) => e.stopPropagation()}
          >
            −
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-5 h-5 flex items-center justify-center text-terminal-text hover:bg-terminal-red hover:text-white rounded transition-colors text-xs font-bold"
            title="Close"
            onMouseDown={(e) => e.stopPropagation()}
          >
            ×
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

export default function DraggableLayout() {
  const {
    panels,
    layouts,
    maximizedPanel,
    togglePanel,
    minimizePanel,
    maximizePanel,
    updateLayout,
    setAvailableHeight,
  } = useLayoutStore();

  const { chains, getChain, setOptionData } = useOptionStore();
  const { instruments: allInstruments } = useInstrumentStore();
  const { subscribe, unsubscribe, status: wsStatus } = useWebSocketContext();
  const [selectedUnderlying, setSelectedUnderlying] = useState<string | null>(null);
  const [selectedExpiry, setSelectedExpiry] = useState<string | null>(null);
  const [availableExpiries, setAvailableExpiries] = useState<string[]>([]);
  const [selectedToken, setSelectedToken] = useState<number | undefined>();
  const [selectedUnderlyingToken, setSelectedUnderlyingToken] = useState<number | undefined>();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const currentSubscribedTokensRef = useRef<number[]>([]);

  const underlyings = Array.from(chains.keys());

  // Helper function to get the search name for options
  // Special case: "NIFTY 50" should search for "NIFTY" in options
  const getOptionSearchName = (underlying: string): string => {
    if (underlying === 'NIFTY 50') {
      return 'NIFTY';
    }
    return underlying;
  };

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      const availableHeight = maximizedPanel 
        ? window.innerHeight - 40 - 40 // Header + StatusBar + MaximizeControls
        : window.innerHeight - 40 - 80; // Header + StatusBar + RestoreBar
      setAvailableHeight(availableHeight);
    };
    handleResize(); // Initial calculation
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [maximizedPanel, setAvailableHeight]);

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

  // When an EQ underlying is selected, find available expiries and set the first expiry
  useEffect(() => {
    if (!selectedUnderlying || allInstruments.length === 0) return;

    // Get the search name for options (special case for NIFTY 50)
    const optionSearchName = getOptionSearchName(selectedUnderlying);

    // Filter for options where name matches the search name, exchange is NFO, and type is CE or PE
    const optionInstruments = allInstruments.filter(
      (inst) =>
        (inst.instrumentType === 'CE' || inst.instrumentType === 'PE') &&
        inst.exchange === 'NFO' &&
        inst.name === optionSearchName &&
        inst.strikePrice !== undefined &&
        inst.expiry !== undefined
    );

    if (optionInstruments.length === 0) {
      console.log(`[DraggableLayout] No options found for ${selectedUnderlying}`);
      return;
    }

    console.log(`[DraggableLayout] Found ${optionInstruments.length} options for ${selectedUnderlying}`);

    // Group by expiry to find available expiries
    const expirySet = new Set<string>();
    optionInstruments.forEach((inst) => {
      if (inst.expiry) {
        expirySet.add(inst.expiry);
      }
    });

    const availableExpiriesList = Array.from(expirySet).sort();
    
    // Store available expiries in state for the dropdown
    setAvailableExpiries(availableExpiriesList);
    
    // Only set expiry if none is selected and we have expiries
    if (!selectedExpiry && availableExpiriesList.length > 0) {
      setSelectedExpiry(availableExpiriesList[0]);
    }
  }, [selectedUnderlying, allInstruments, selectedExpiry]);

  // Subscribe to options for the selected expiry only, unsubscribe from previous expiry
  useEffect(() => {
    if (wsStatus !== 'connected' || !selectedUnderlying || !selectedExpiry || allInstruments.length === 0) {
      return;
    }

    // Get the search name for options (special case for NIFTY 50)
    const optionSearchName = getOptionSearchName(selectedUnderlying);

    // Filter for options where name matches the search name, exchange is NFO, and expiry matches
    const optionInstruments = allInstruments.filter(
      (inst) =>
        (inst.instrumentType === 'CE' || inst.instrumentType === 'PE') &&
        inst.exchange === 'NFO' &&
        inst.name === optionSearchName &&
        inst.expiry === selectedExpiry &&
        inst.strikePrice !== undefined
    );

    if (optionInstruments.length === 0) {
      // Unsubscribe from previous tokens if no options found for this expiry
      if (currentSubscribedTokensRef.current.length > 0) {
        console.log(`[DraggableLayout] Unsubscribing from ${currentSubscribedTokensRef.current.length} previous option tokens`);
        unsubscribe(currentSubscribedTokensRef.current);
        currentSubscribedTokensRef.current = [];
      }
      return;
    }

    // Collect option tokens for the selected expiry
    const optionTokens = optionInstruments
      .map((inst) => inst.instrumentToken)
      .filter((token): token is number => token !== undefined && token !== null);

    if (optionTokens.length === 0) return;

    // Unsubscribe from previous expiry's tokens if they exist
    if (currentSubscribedTokensRef.current.length > 0) {
      console.log(`[DraggableLayout] Unsubscribing from ${currentSubscribedTokensRef.current.length} previous expiry option tokens`);
      unsubscribe(currentSubscribedTokensRef.current);
    }

    // Subscribe to new expiry's tokens
    console.log(`[DraggableLayout] Subscribing to ${optionTokens.length} option tokens for ${selectedUnderlying} expiry ${selectedExpiry}`);
    subscribe(optionTokens);
    currentSubscribedTokensRef.current = optionTokens;
  }, [wsStatus, selectedUnderlying, selectedExpiry, allInstruments, subscribe, unsubscribe]);

  // When both underlying and expiry are selected, populate the option store
  useEffect(() => {
    if (!selectedUnderlying || !selectedExpiry || allInstruments.length === 0) return;

    // Get the search name for options (special case for NIFTY 50)
    const optionSearchName = getOptionSearchName(selectedUnderlying);

    // Filter for options where name matches the search name, exchange is NFO, and expiry matches
    const optionInstruments = allInstruments.filter(
      (inst) =>
        (inst.instrumentType === 'CE' || inst.instrumentType === 'PE') &&
        inst.exchange === 'NFO' &&
        inst.name === optionSearchName &&
        inst.expiry === selectedExpiry &&
        inst.strikePrice !== undefined
    );

    if (optionInstruments.length === 0) {
      console.log(`[DraggableLayout] No options found for ${selectedUnderlying} expiry ${selectedExpiry}`);
      return;
    }

    // Group by strike
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

    // Create OptionData and populate store
    optionsByStrike.forEach((strikeData, strike) => {
        if (strikeData.call) {
          const ce: OptionData = {
            instrumentToken: strikeData.call.instrumentToken,
            tradingSymbol: strikeData.call.tradingsymbol,
            type: 'CE',
            strike,
            expiry: selectedExpiry,
            lastPrice: 0,
            bidPrice: 0,
            askPrice: 0,
            bidQty: 0,
            askQty: 0,
            volume: 0,
            oi: 0,
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
            bidPrice: 0,
            askPrice: 0,
            bidQty: 0,
            askQty: 0,
            volume: 0,
            oi: 0,
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

  const visiblePanels = useMemo(() => {
    if (maximizedPanel) {
      // When maximized, only show the maximized panel
      return Array.from(panels.values()).filter(p => p.id === maximizedPanel && p.visible);
    }
    // Normal mode: show all visible, non-minimized panels
    return Array.from(panels.values()).filter(p => p.visible && !p.minimized);
  }, [panels, maximizedPanel]);

  const isMaximized = (panelId: PanelId) => maximizedPanel === panelId;

  const handleLayoutChange = (layout: Layout[]) => {
    updateLayout(layout);
  };

  // Calculate available height for grid
  const availableHeight = maximizedPanel 
    ? window.innerHeight - 40 - 32 // Header + StatusBar + MaximizeControls
    : window.innerHeight - 40 - 80; // Header + StatusBar + RestoreBar

  return (
    <div className="h-full w-full relative" style={{ paddingBottom: maximizedPanel ? '40px' : '80px' }}>
      <GridLayout
        className="layout"
        layout={layouts.lg}
        cols={12}
        rowHeight={Math.floor(availableHeight / 20)}
        width={windowWidth}
        height={availableHeight}
        onLayoutChange={handleLayoutChange}
        isDraggable={false}
        isResizable={false}
        draggableHandle=".panel-header"
        resizeHandles={['se', 'sw', 'ne', 'nw', 's', 'n', 'e', 'w']}
        margin={maximizedPanel ? [0, 0] : [6, 6]}
        containerPadding={maximizedPanel ? [0, 0] : [6, 6]}
        compactType={null}
        preventCollision={true}
        useCSSTransforms={true}
        isBounded={false}
      >
        {visiblePanels.map((panel) => (
          <div key={panel.id}>
            <PanelWrapper
              panelId={panel.id}
              title={panel.title}
              isMaximized={isMaximized(panel.id)}
              onMinimize={() => minimizePanel(panel.id)}
              onMaximize={() => maximizePanel(panel.id)}
              onClose={() => togglePanel(panel.id)}
            >
              <PanelContent
                panelId={panel.id}
                selectedToken={selectedToken}
                selectedUnderlying={selectedUnderlying}
                selectedExpiry={selectedExpiry}
                chainData={chainData}
                onRowClick={(token) => setSelectedToken(token)}
                onExpiryChange={(expiry) => setSelectedExpiry(expiry)}
                expiries={availableExpiries}
                onUnderlyingChange={(underlying) => {
                  // Unsubscribe from current tokens when underlying changes
                  if (currentSubscribedTokensRef.current.length > 0 && wsStatus === 'connected') {
                    console.log(`[DraggableLayout] Unsubscribing from ${currentSubscribedTokensRef.current.length} tokens due to underlying change`);
                    unsubscribe(currentSubscribedTokensRef.current);
                    currentSubscribedTokensRef.current = [];
                  }
                  setSelectedUnderlying(underlying);
                  setSelectedUnderlyingToken(undefined);
                  setSelectedExpiry(null);
                  setAvailableExpiries([]); // Clear expiries when underlying changes
                }}
              />
            </PanelWrapper>
          </div>
        ))}
      </GridLayout>
    </div>
  );
}

