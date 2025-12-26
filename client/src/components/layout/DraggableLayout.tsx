import { useMemo, useState, useEffect } from 'react';
import GridLayout, { Layout } from 'react-grid-layout';
import { useLayoutStore, PanelId } from '../../store/layoutStore';
import WatchlistPanel from '../panels/WatchlistPanel';
import GreeksPanel from '../panels/GreeksPanel';
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
    case 'greeks':
      return <GreeksPanel selectedToken={selectedToken} />;
    case 'optionChain':
      return (
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between px-2 mb-1">
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
  onMinimize: () => void;
  onClose: () => void;
}

function PanelWrapper({ panelId, title, children, onMinimize, onClose }: PanelWrapperProps) {
  return (
    <div className="panel h-full w-full flex flex-col overflow-hidden">
      <div className="panel-header flex items-center justify-between px-2">
        <span className="text-xs font-bold text-terminal-accent tracking-wider">{title}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={onMinimize}
            className="w-4 h-4 flex items-center justify-center text-terminal-text hover:text-terminal-accent transition-colors text-[10px]"
            title="Minimize"
          >
            −
          </button>
          <button
            onClick={onClose}
            className="w-4 h-4 flex items-center justify-center text-terminal-text hover:text-terminal-red transition-colors text-[10px]"
            title="Close"
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
    togglePanel,
    minimizePanel,
    updateLayout,
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
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    return Array.from(panels.values()).filter(p => p.visible && !p.minimized);
  }, [panels]);

  const handleLayoutChange = (layout: Layout[]) => {
    updateLayout(layout);
  };

  return (
    <div className="h-full w-full relative" style={{ paddingBottom: '80px' }}>
      <GridLayout
        className="layout"
        layout={layouts.lg}
        cols={12}
        rowHeight={30}
        width={windowWidth}
        onLayoutChange={handleLayoutChange}
        isDraggable={true}
        isResizable={true}
        draggableHandle=".panel-header"
        resizeHandles={['se', 'sw', 'ne', 'nw', 's', 'n', 'e', 'w']}
        margin={[4, 4]}
        containerPadding={[4, 4]}
        compactType={null}
        preventCollision={true}
        useCSSTransforms={true}
      >
        {visiblePanels.map((panel) => (
          <div key={panel.id}>
            <PanelWrapper
              panelId={panel.id}
              title={panel.title}
              onMinimize={() => minimizePanel(panel.id)}
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

