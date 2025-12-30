import { useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { WebSocketProvider } from './contexts/WebSocketContext';
import Header from './components/layout/Header';
import BloombergLayout from './components/layout/BloombergLayout';

const WS_URL = 'ws://localhost:8080/ws';

function App() {
  const { status, connect, disconnect, subscribe, unsubscribe } = useWebSocket(WS_URL);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return (
    <WebSocketProvider subscribe={subscribe} unsubscribe={unsubscribe} status={status}>
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
    </WebSocketProvider>
  );
}

export default App;

