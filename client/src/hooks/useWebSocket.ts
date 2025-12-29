import { useEffect, useState, useRef, useCallback } from 'react';
import { WebSocketService, WebSocketStatus } from '../services/websocket';
import { Tick } from '../types/tick';
import { useOptionStore } from '../store/optionStore';
import { useWatchlistStore } from '../store/watchlistStore';

export function useWebSocket(url: string) {
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const wsServiceRef = useRef<WebSocketService | null>(null);
  const { updateFromTick: updateOptionFromTick } = useOptionStore();
  const { updateInstrumentFromTick } = useWatchlistStore();

  // Create WebSocket service when URL changes
  useEffect(() => {
    // Disconnect existing service if URL changed
    if (wsServiceRef.current) {
      wsServiceRef.current.disconnect();
      wsServiceRef.current = null;
    }

    const wsService = new WebSocketService(url);
    wsServiceRef.current = wsService;

    // Set up callbacks - these closures will capture the latest store functions
    wsService.onTick((tick: Tick) => {
      // Update both options and watchlist instruments
      updateOptionFromTick(tick);
      updateInstrumentFromTick(tick);
    });

    wsService.onStatusChange((newStatus: WebSocketStatus) => {
      setStatus(newStatus);
    });

    return () => {
      if (wsServiceRef.current) {
        wsServiceRef.current.disconnect();
        wsServiceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]); // Only depend on url - store functions are stable in Zustand

  const connect = useCallback(() => {
    wsServiceRef.current?.connect();
  }, []);

  const disconnect = useCallback(() => {
    wsServiceRef.current?.disconnect();
  }, []);

  const subscribe = useCallback((tokens: number[]) => {
    wsServiceRef.current?.subscribe(tokens);
  }, []);

  const unsubscribe = useCallback((tokens: number[]) => {
    wsServiceRef.current?.unsubscribe(tokens);
  }, []);

  return {
    status,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
  };
}

