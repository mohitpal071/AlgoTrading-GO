import { useEffect, useState, useRef } from 'react';
import { WebSocketService, WebSocketStatus } from '../services/websocket';
import { Tick } from '../types/tick';
import { useOptionStore } from '../store/optionStore';

export function useWebSocket(url: string) {
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const wsServiceRef = useRef<WebSocketService | null>(null);
  const { updateFromTick } = useOptionStore();

  useEffect(() => {
    const wsService = new WebSocketService(url);
    wsServiceRef.current = wsService;

    wsService.onTick((tick: Tick) => {
      updateFromTick(tick);
    });

    wsService.onStatusChange((newStatus: WebSocketStatus) => {
      setStatus(newStatus);
    });

    return () => {
      wsService.disconnect();
    };
  }, [url, updateFromTick]);

  const connect = () => {
    wsServiceRef.current?.connect();
  };

  const disconnect = () => {
    wsServiceRef.current?.disconnect();
  };

  const subscribe = (tokens: number[]) => {
    wsServiceRef.current?.subscribe(tokens);
  };

  const unsubscribe = (tokens: number[]) => {
    wsServiceRef.current?.unsubscribe(tokens);
  };

  return {
    status,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
  };
}

