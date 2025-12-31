import { useEffect, useRef, useMemo } from 'react';
import WatchlistPanel from '../components/panels/WatchlistPanel';
import { useWatchlistStore } from '../store/watchlistStore';
import { useWebSocketContext } from '../contexts/WebSocketContext';

export default function WatchlistPage() {
  const { getWatchlist, selectedGroupId } = useWatchlistStore();
  const { subscribe, unsubscribe, status: wsStatus } = useWebSocketContext();
  const currentSubscribedTokensRef = useRef<number[]>([]);
  const watchlist = getWatchlist(selectedGroupId);

  // Extract and memoize tokens to avoid unnecessary re-renders
  // The key insight: even though watchlist is a new array, we compare the actual token values
  const tokensToSubscribe = useMemo(() => {
    return watchlist
      .map((item) => item.instrument.instrumentToken)
      .filter((token): token is number => token !== undefined && token !== null)
      .sort((a, b) => a - b); // Sort for consistent comparison
  }, [
    // Use a stable string key based on token values, not array reference
    watchlist.map(item => item.instrument.instrumentToken).filter(t => t != null).sort((a, b) => a - b).join(',')
  ]);

  // Helper function to compare token arrays
  const areTokenArraysEqual = (arr1: number[], arr2: number[]): boolean => {
    if (arr1.length !== arr2.length) return false;
    return arr1.every((token, index) => token === arr2[index]);
  };

  // Subscribe to all watchlist instruments when page is mounted or watchlist changes
  useEffect(() => {
    if (wsStatus !== 'connected') {
      // Unsubscribe if not connected
      if (currentSubscribedTokensRef.current.length > 0) {
        unsubscribe(currentSubscribedTokensRef.current);
        currentSubscribedTokensRef.current = [];
      }
      return;
    }

    if (tokensToSubscribe.length === 0) {
      // Unsubscribe if no valid tokens
      if (currentSubscribedTokensRef.current.length > 0) {
        unsubscribe(currentSubscribedTokensRef.current);
        currentSubscribedTokensRef.current = [];
      }
      return;
    }

    // Only subscribe/unsubscribe if tokens actually changed
    if (!areTokenArraysEqual(currentSubscribedTokensRef.current, tokensToSubscribe)) {
      // Unsubscribe from previous tokens
      if (currentSubscribedTokensRef.current.length > 0) {
        unsubscribe(currentSubscribedTokensRef.current);
      }

      // Subscribe to new tokens
      subscribe(tokensToSubscribe);
      currentSubscribedTokensRef.current = [...tokensToSubscribe];
    }
  }, [wsStatus, tokensToSubscribe, subscribe, unsubscribe]);

  // Cleanup: Unsubscribe when component unmounts
  useEffect(() => {
    return () => {
      if (currentSubscribedTokensRef.current.length > 0 && wsStatus === 'connected') {
        unsubscribe(currentSubscribedTokensRef.current);
        currentSubscribedTokensRef.current = [];
      }
    };
  }, [unsubscribe, wsStatus]);

  return (
    <div className="h-full w-full bg-terminal-bg">
      <WatchlistPanel />
    </div>
  );
}

