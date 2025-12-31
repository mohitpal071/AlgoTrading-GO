import { useEffect, useState, useRef, useCallback } from 'react';
import { WebSocketService, WebSocketStatus } from '../services/websocket';
import { Tick } from '../types/tick';
import { useOptionStore } from '../store/optionStore';
import { useWatchlistStore } from '../store/watchlistStore';
import { useArbitrageStore } from '../store/arbitrageStore';

export function useWebSocket(url: string) {
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const wsServiceRef = useRef<WebSocketService | null>(null);
  const updateOptionFromTick = useOptionStore((state) => state.updateFromTick);
  const updateInstrumentFromTick = useWatchlistStore((state) => state.updateInstrumentFromTick);
  const updateArbitrageFromTick = useArbitrageStore((state) => state.updateFromTick);

  // Create WebSocket service when URL changes
  useEffect(() => {
    // Disconnect existing service if URL changed
    if (wsServiceRef.current) {
      wsServiceRef.current.disconnect();
      wsServiceRef.current = null;
    }

    const wsService = new WebSocketService(url);
    wsServiceRef.current = wsService;

    console.log('[useWebSocket] WebSocketService created, setting up callbacks...');
    console.log('[useWebSocket] updateOptionFromTick available:', !!updateOptionFromTick);
    console.log('[useWebSocket] updateInstrumentFromTick available:', !!updateInstrumentFromTick);

    // Set up callbacks - these closures will capture the latest store functions
    wsService.onTick((tick: Tick) => {
      // console.log(`[useWebSocket] onTick callback received for token ${tick.instrumentToken}`);
      try {
        // Update options, watchlist instruments, and arbitrage stocks
        // console.log(`[useWebSocket] Calling updateOptionFromTick and updateInstrumentFromTick`);
        console.log(tick)
        if (updateOptionFromTick) {
          updateOptionFromTick(tick);
        } else {
          console.warn('[useWebSocket] updateOptionFromTick is not available');
        }
        if (updateInstrumentFromTick) {
          updateInstrumentFromTick(tick);
        } else {
          console.warn('[useWebSocket] updateInstrumentFromTick is not available');
        }
        if (updateArbitrageFromTick) {
          updateArbitrageFromTick(tick);
        }
        //console.log(`[useWebSocket] ✓ Successfully called update functions for token ${tick.instrumentToken}`);
      } catch (error) {
        console.error(`[useWebSocket] ✗ Error calling update functions:`, error);
      }
    });

    // Verify callback was set
    console.log('[useWebSocket] Callback registration complete. Verifying...');
    // Access private property for verification (we'll add a getter method)
    
    wsService.onStatusChange((newStatus: WebSocketStatus) => {
      setStatus(newStatus);
    });
    
    console.log('[useWebSocket] ✓ All callbacks registered');

    return () => {
      if (wsServiceRef.current) {
        wsServiceRef.current.disconnect();
        wsServiceRef.current = null;
      }
    };
  }, [url, updateOptionFromTick, updateInstrumentFromTick, updateArbitrageFromTick]); // Include store functions in dependencies

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

