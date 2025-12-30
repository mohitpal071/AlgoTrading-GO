import { useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useWebSocket } from './hooks/useWebSocket';
import { WebSocketProvider } from './contexts/WebSocketContext';
import Header from './components/layout/Header';
import WatchlistPage from './pages/WatchlistPage';
import OptionChainPage from './pages/OptionChainPage';
import PositionsPage from './pages/PositionsPage';
import OrdersPage from './pages/OrdersPage';
import StraddleStranglePage from './pages/StraddleStranglePage';
import { buildZerodhaWebSocketUrl } from './utils/zerodhaWs';

function App() {
  const wsUrl = useMemo(() => {
    try {
      return buildZerodhaWebSocketUrl();
    } catch (error) {
      console.error('[App] Failed to build WebSocket URL:', error);
      if (error instanceof Error) {
        console.error('[App] Error:', error.message);
      }
      // Return a placeholder URL that will fail gracefully
      return 'wss://ws.zerodha.com/';
    }
  }, []);
  
  const { status, connect, disconnect, subscribe, unsubscribe } = useWebSocket(wsUrl);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return (
    <WebSocketProvider subscribe={subscribe} unsubscribe={unsubscribe} status={status}>
      <BrowserRouter>
        <div className="h-screen w-screen flex flex-col overflow-hidden bg-terminal-bg">
          <Header
            status={status}
            onConnect={connect}
            onDisconnect={disconnect}
          />
          <div className="flex-1 overflow-hidden">
            <Routes>
              <Route path="/" element={<Navigate to="/watchlist" replace />} />
              <Route path="/watchlist" element={<WatchlistPage />} />
              <Route path="/option-chain" element={<OptionChainPage />} />
              <Route path="/straddle-strangle" element={<StraddleStranglePage />} />
              <Route path="/positions" element={<PositionsPage />} />
              <Route path="/orders" element={<OrdersPage />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </WebSocketProvider>
  );
}

export default App;

