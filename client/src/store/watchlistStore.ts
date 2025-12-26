import { create } from 'zustand';
import { Instrument, WatchlistItem } from '../types/instrument';

interface WatchlistStore {
  instruments: Map<string, Instrument>;
  favorites: Set<string>;
  
  // Actions
  addInstrument: (instrument: Instrument) => void;
  updateInstrument: (symbol: string, updates: Partial<Instrument>) => void;
  removeInstrument: (symbol: string) => void;
  toggleFavorite: (symbol: string) => void;
  getWatchlist: () => WatchlistItem[];
  getInstrument: (symbol: string) => Instrument | undefined;
}

// Generate dummy data
function generateDummyInstruments(): Instrument[] {
  const symbols = [
    { symbol: 'NIFTY', name: 'NIFTY 50', exchange: 'NSE' },
    { symbol: 'BANKNIFTY', name: 'NIFTY Bank', exchange: 'NSE' },
    { symbol: 'FINNIFTY', name: 'NIFTY Fin Service', exchange: 'NSE' },
    { symbol: 'RELIANCE', name: 'Reliance Industries', exchange: 'NSE' },
    { symbol: 'TCS', name: 'Tata Consultancy', exchange: 'NSE' },
    { symbol: 'INFY', name: 'Infosys Limited', exchange: 'NSE' },
    { symbol: 'HDFCBANK', name: 'HDFC Bank', exchange: 'NSE' },
    { symbol: 'ICICIBANK', name: 'ICICI Bank', exchange: 'NSE' },
    { symbol: 'SBIN', name: 'State Bank of India', exchange: 'NSE' },
    { symbol: 'BHARTIARTL', name: 'Bharti Airtel', exchange: 'NSE' },
    { symbol: 'DIXON', name: 'Dixon Technologies', exchange: 'NSE' },
    { symbol: 'WIPRO', name: 'Wipro Limited', exchange: 'NSE' },
  ];

  const basePrices: Record<string, number> = {
    'NIFTY': 26000,
    'BANKNIFTY': 52000,
    'FINNIFTY': 22000,
    'RELIANCE': 2500,
    'TCS': 3800,
    'INFY': 1500,
    'HDFCBANK': 1650,
    'ICICIBANK': 1100,
    'SBIN': 650,
    'BHARTIARTL': 1200,
    'DIXON': 12500,
    'WIPRO': 450,
  };

  return symbols.map(({ symbol, name, exchange }) => {
    const basePrice = basePrices[symbol] || 1000;
    const changePercent = (Math.random() - 0.5) * 4; // -2% to +2%
    const change = (basePrice * changePercent) / 100;
    const lastPrice = basePrice + change;
    const volume = Math.floor(Math.random() * 10000000) + 1000000;
    const high = lastPrice * (1 + Math.random() * 0.02);
    const low = lastPrice * (1 - Math.random() * 0.02);
    const open = basePrice * (1 + (Math.random() - 0.5) * 0.01);
    const spread = lastPrice * 0.001;
    const bid = lastPrice - spread / 2;
    const ask = lastPrice + spread / 2;

    return {
      symbol,
      name,
      exchange,
      lastPrice: Math.round(lastPrice * 100) / 100,
      previousClose: basePrice,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      volume,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      open: Math.round(open * 100) / 100,
      bid: Math.round(bid * 100) / 100,
      ask: Math.round(ask * 100) / 100,
      bidSize: Math.floor(Math.random() * 1000) + 100,
      askSize: Math.floor(Math.random() * 1000) + 100,
      timestamp: Date.now(),
    };
  });
}

export const useWatchlistStore = create<WatchlistStore>((set, get) => {
  // Initialize with dummy data
  const dummyInstruments = generateDummyInstruments();
  const instrumentsMap = new Map<string, Instrument>();
  dummyInstruments.forEach(inst => {
    instrumentsMap.set(inst.symbol, inst);
  });

  return {
    instruments: instrumentsMap,
    favorites: new Set(['NIFTY', 'BANKNIFTY', 'RELIANCE']),

    addInstrument: (instrument: Instrument) => {
      const { instruments } = get();
      set({
        instruments: new Map(instruments).set(instrument.symbol, instrument),
      });
    },

    updateInstrument: (symbol: string, updates: Partial<Instrument>) => {
      const { instruments } = get();
      const existing = instruments.get(symbol);
      if (existing) {
        set({
          instruments: new Map(instruments).set(symbol, {
            ...existing,
            ...updates,
            timestamp: Date.now(),
          }),
        });
      }
    },

    removeInstrument: (symbol: string) => {
      const { instruments, favorites } = get();
      const newInstruments = new Map(instruments);
      newInstruments.delete(symbol);
      const newFavorites = new Set(favorites);
      newFavorites.delete(symbol);
      set({
        instruments: newInstruments,
        favorites: newFavorites,
      });
    },

    toggleFavorite: (symbol: string) => {
      const { favorites } = get();
      const newFavorites = new Set(favorites);
      if (newFavorites.has(symbol)) {
        newFavorites.delete(symbol);
      } else {
        newFavorites.add(symbol);
      }
      set({ favorites: newFavorites });
    },

    getWatchlist: () => {
      const { instruments, favorites } = get();
      const items: WatchlistItem[] = [];
      
      // Sort: favorites first, then alphabetically
      const sortedSymbols = Array.from(instruments.keys()).sort((a, b) => {
        const aFav = favorites.has(a);
        const bFav = favorites.has(b);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return a.localeCompare(b);
      });

      sortedSymbols.forEach(symbol => {
        const instrument = instruments.get(symbol);
        if (instrument) {
          items.push({
            instrument,
            isFavorite: favorites.has(symbol),
          });
        }
      });

      return items;
    },

    getInstrument: (symbol: string) => {
      return get().instruments.get(symbol);
    },
  };
});

