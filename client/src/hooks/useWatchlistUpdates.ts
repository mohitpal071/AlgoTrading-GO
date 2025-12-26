import { useEffect } from 'react';
import { useWatchlistStore } from '../store/watchlistStore';

// Simulate real-time price updates for watchlist
export function useWatchlistUpdates() {
  const getWatchlist = useWatchlistStore((state) => state.getWatchlist);
  const updateInstrument = useWatchlistStore((state) => state.updateInstrument);

  useEffect(() => {
    const interval = setInterval(() => {
      const watchlist = getWatchlist();
      
      watchlist.forEach((item) => {
        const inst = item.instrument;
        // Simulate small price movements
        const volatility = 0.002; // 0.2% max change per update
        const change = (Math.random() - 0.5) * 2 * volatility * inst.lastPrice;
        const newPrice = inst.lastPrice + change;
        const newChange = newPrice - inst.previousClose;
        const newChangePercent = (newChange / inst.previousClose) * 100;
        
        // Update volume (simulate trading)
        const volumeChange = Math.floor(Math.random() * 10000);
        const newVolume = inst.volume + volumeChange;
        
        // Update high/low
        const newHigh = Math.max(inst.high, newPrice);
        const newLow = Math.min(inst.low, newPrice);
        
        // Update bid/ask (spread around new price)
        const spread = newPrice * 0.001;
        const newBid = newPrice - spread / 2;
        const newAsk = newPrice + spread / 2;

        updateInstrument(inst.symbol, {
          lastPrice: Math.round(newPrice * 100) / 100,
          change: Math.round(newChange * 100) / 100,
          changePercent: Math.round(newChangePercent * 100) / 100,
          volume: newVolume,
          high: Math.round(newHigh * 100) / 100,
          low: Math.round(newLow * 100) / 100,
          bid: Math.round(newBid * 100) / 100,
          ask: Math.round(newAsk * 100) / 100,
          bidSize: Math.floor(Math.random() * 1000) + 100,
          askSize: Math.floor(Math.random() * 1000) + 100,
        });
      });
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [getWatchlist, updateInstrument]);
}

