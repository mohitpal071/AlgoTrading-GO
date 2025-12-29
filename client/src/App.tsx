import { useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useWatchlistUpdates } from './hooks/useWatchlistUpdates';
import Header from './components/layout/Header';
import BloombergLayout from './components/layout/BloombergLayout';

const WS_URL = 'ws://localhost:8080/ws';

function App() {
  const { status, connect, disconnect } = useWebSocket(WS_URL);
  
  // Simulate real-time updates for watchlist
  useWatchlistUpdates();

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-terminal-bg">
      <Header
        status={status}
        onConnect={connect}
        onDisconnect={disconnect}
      />
      <div className="flex-1 overflow-hidden">
        <BloombergLayout wsStatus={status} />
      </div>
    </div>
  );
}

export default App;

