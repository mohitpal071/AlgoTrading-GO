import { useEffect, useRef } from 'react';
import WatchlistPanel from '../components/panels/WatchlistPanel';
import { useWatchlistStore } from '../store/watchlistStore';
import { useWebSocketContext } from '../contexts/WebSocketContext';

export default function WatchlistPage() {
  const { getWatchlist, selectedGroupId } = useWatchlistStore();
  const { subscribe, unsubscribe, status: wsStatus } = useWebSocketContext();
  const currentSubscribedTokensRef = useRef<number[]>([]);
  const watchlist = getWatchlist(selectedGroupId);

  // Subscribe to all watchlist instruments when page is mounted or watchlist changes
  useEffect(() => {
    if (wsStatus !== 'connected' || watchlist.length === 0) {
      // Unsubscribe if no instruments or not connected
      if (currentSubscribedTokensRef.current.length > 0) {
        unsubscribe(currentSubscribedTokensRef.current);
        currentSubscribedTokensRef.current = [];
      }
      return;
    }

    // Get all instrument tokens from watchlist
    const tokensToSubscribe = watchlist
      .map((item) => item.instrument.instrumentToken)
      .filter((token): token is number => token !== undefined && token !== null);

    if (tokensToSubscribe.length === 0) {
      // Unsubscribe if no valid tokens
      if (currentSubscribedTokensRef.current.length > 0) {
        unsubscribe(currentSubscribedTokensRef.current);
        currentSubscribedTokensRef.current = [];
      }
      return;
    }

    // Unsubscribe from previous tokens
    if (currentSubscribedTokensRef.current.length > 0) {
      unsubscribe(currentSubscribedTokensRef.current);
    }

    // Subscribe to new tokens
    subscribe(tokensToSubscribe);
    currentSubscribedTokensRef.current = tokensToSubscribe;
  }, [wsStatus, watchlist, subscribe, unsubscribe]);

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

