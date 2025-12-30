import { createContext, useContext, ReactNode } from 'react';

interface WebSocketContextType {
  subscribe: (tokens: number[]) => void;
  unsubscribe: (tokens: number[]) => void;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider');
  }
  return context;
}

interface WebSocketProviderProps {
  children: ReactNode;
  subscribe: (tokens: number[]) => void;
  unsubscribe: (tokens: number[]) => void;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
}

export function WebSocketProvider({ 
  children, 
  subscribe, 
  unsubscribe, 
  status 
}: WebSocketProviderProps) {
  return (
    <WebSocketContext.Provider value={{ subscribe, unsubscribe, status }}>
      {children}
    </WebSocketContext.Provider>
  );
}

