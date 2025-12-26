import { useMemo, useState, useEffect } from 'react';
import GridLayout, { Layout } from 'react-grid-layout';
import { useLayoutStore, PanelId } from '../../store/layoutStore';
import WatchlistPanel from '../panels/WatchlistPanel';
import OptionChainTable from '../tables/OptionChainTable';
import PositionsPanel from '../panels/PositionsPanel';
import OrdersPanel from '../panels/OrdersPanel';
import { useOptionStore } from '../../store/optionStore';
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
}

function PanelContent({
  panelId,
  selectedToken,
  selectedUnderlying,
  selectedExpiry,
  chainData,
  onRowClick,
  onExpiryChange,
  expiries,
}: PanelContentProps) {
  switch (panelId) {
    case 'watchlist':
      return <WatchlistPanel />;
    case 'optionChain':
      return (
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-terminal-border/50 bg-terminal-border/30">
            {selectedUnderlying && (
              <div className="flex items-center gap-3 text-xs">
                <span className="font-bold text-terminal-accent">{selectedUnderlying}</span>
                {selectedExpiry && (
                  <>
                    <span className="text-terminal-text opacity-50">|</span>
                    <span className="text-terminal-text">
                      {new Date(selectedExpiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </>
                )}
              </div>
            )}
            {expiries.length > 0 && (
              <select
                value={selectedExpiry || ''}
                onChange={(e) => onExpiryChange(e.target.value)}
                className="bg-terminal-bg border border-terminal-border px-2 py-0.5 text-xs text-terminal-text h-6 rounded hover:border-terminal-accent transition-colors"
              >
                {expiries.map((expiry) => (
                  <option key={expiry} value={expiry}>
                    {new Date(expiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </option>
                ))}
              </select>
            )}
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

  const { chains, getChain } = useOptionStore();
  const [selectedUnderlying, setSelectedUnderlying] = useState<string | null>(null);
  const [selectedExpiry, setSelectedExpiry] = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState<number | undefined>();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const underlyings = Array.from(chains.keys());

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

  const expiries = selectedUnderlying
    ? Array.from(chains.get(selectedUnderlying)?.keys() || [])
    : [];

  useEffect(() => {
    if (expiries.length > 0 && !selectedExpiry) {
      setSelectedExpiry(expiries[0]);
    }
  }, [expiries, selectedExpiry]);

  const chainData = selectedUnderlying && selectedExpiry
    ? getChain(selectedUnderlying, selectedExpiry)
    : [];

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
                expiries={expiries}
              />
            </PanelWrapper>
          </div>
        ))}
      </GridLayout>
    </div>
  );
}

