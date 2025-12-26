import { create } from 'zustand';
import { Instrument, WatchlistItem } from '../types/instrument';

export interface WatchlistGroup {
  id: string;
  name: string;
  symbols: string[];
  color?: string;
}

interface WatchlistStore {
  instruments: Map<string, Instrument>;
  favorites: Set<string>;
  groups: Map<string, WatchlistGroup>;
  selectedGroupId: string | null;
  
  // Actions
  addInstrument: (instrument: Instrument) => void;
  updateInstrument: (symbol: string, updates: Partial<Instrument>) => void;
  removeInstrument: (symbol: string) => void;
  toggleFavorite: (symbol: string) => void;
  getWatchlist: (groupId?: string | null) => WatchlistItem[];
  getInstrument: (symbol: string) => Instrument | undefined;
  
  // Group actions
  createGroup: (name: string, symbols?: string[]) => string;
  updateGroup: (groupId: string, updates: Partial<WatchlistGroup>) => void;
  deleteGroup: (groupId: string) => void;
  addSymbolToGroup: (groupId: string, symbol: string) => void;
  removeSymbolFromGroup: (groupId: string, symbol: string) => void;
  selectGroup: (groupId: string | null) => void;
  getGroups: () => WatchlistGroup[];
  getSelectedGroup: () => WatchlistGroup | null;
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

// Generate default groups
function generateDefaultGroups(instruments: Instrument[]): Map<string, WatchlistGroup> {
  const groups = new Map<string, WatchlistGroup>();
  
  // Indices group
  groups.set('indices', {
    id: 'indices',
    name: 'Indices',
    symbols: ['NIFTY', 'BANKNIFTY', 'FINNIFTY'],
    color: '#58a6ff',
  });
  
  // Banking group
  groups.set('banking', {
    id: 'banking',
    name: 'Banking',
    symbols: ['HDFCBANK', 'ICICIBANK', 'SBIN'],
    color: '#3fb950',
  });
  
  // IT group
  groups.set('it', {
    id: 'it',
    name: 'IT',
    symbols: ['TCS', 'INFY', 'WIPRO'],
    color: '#d29922',
  });
  
  // Others group
  groups.set('others', {
    id: 'others',
    name: 'Others',
    symbols: ['RELIANCE', 'BHARTIARTL', 'DIXON'],
    color: '#f85149',
  });
  
  return groups;
}

export const useWatchlistStore = create<WatchlistStore>((set, get) => {
  // Initialize with dummy data
  const dummyInstruments = generateDummyInstruments();
  const instrumentsMap = new Map<string, Instrument>();
  dummyInstruments.forEach(inst => {
    instrumentsMap.set(inst.symbol, inst);
  });

  const defaultGroups = generateDefaultGroups(dummyInstruments);

  return {
    instruments: instrumentsMap,
    favorites: new Set(['NIFTY', 'BANKNIFTY', 'RELIANCE']),
    groups: defaultGroups,
    selectedGroupId: 'indices', // Default to indices group

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

    getWatchlist: (groupId?: string | null) => {
      const { instruments, favorites, groups, selectedGroupId } = get();
      const targetGroupId = groupId !== undefined ? groupId : selectedGroupId;
      const items: WatchlistItem[] = [];
      
      let symbolsToShow: string[];
      
      if (targetGroupId) {
        // Show only symbols from selected group
        const group = groups.get(targetGroupId);
        if (group) {
          symbolsToShow = group.symbols.filter(symbol => instruments.has(symbol));
        } else {
          symbolsToShow = [];
        }
      } else {
        // Show all symbols
        symbolsToShow = Array.from(instruments.keys());
      }
      
      // Sort: favorites first, then alphabetically
      const sortedSymbols = symbolsToShow.sort((a, b) => {
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

    // Group actions
    createGroup: (name: string, symbols: string[] = []) => {
      const { groups } = get();
      const id = `group_${Date.now()}`;
      const newGroup: WatchlistGroup = {
        id,
        name,
        symbols,
        color: '#58a6ff',
      };
      const updated = new Map(groups);
      updated.set(id, newGroup);
      set({ groups: updated });
      return id;
    },

    updateGroup: (groupId: string, updates: Partial<WatchlistGroup>) => {
      const { groups } = get();
      const group = groups.get(groupId);
      if (group) {
        const updated = new Map(groups);
        updated.set(groupId, { ...group, ...updates });
        set({ groups: updated });
      }
    },

    deleteGroup: (groupId: string) => {
      const { groups, selectedGroupId } = get();
      const updated = new Map(groups);
      updated.delete(groupId);
      const newSelected = selectedGroupId === groupId ? null : selectedGroupId;
      set({ 
        groups: updated,
        selectedGroupId: newSelected,
      });
    },

    addSymbolToGroup: (groupId: string, symbol: string) => {
      const { groups } = get();
      const group = groups.get(groupId);
      if (group && !group.symbols.includes(symbol)) {
        const updated = new Map(groups);
        updated.set(groupId, {
          ...group,
          symbols: [...group.symbols, symbol],
        });
        set({ groups: updated });
      }
    },

    removeSymbolFromGroup: (groupId: string, symbol: string) => {
      const { groups } = get();
      const group = groups.get(groupId);
      if (group) {
        const updated = new Map(groups);
        updated.set(groupId, {
          ...group,
          symbols: group.symbols.filter(s => s !== symbol),
        });
        set({ groups: updated });
      }
    },

    selectGroup: (groupId: string | null) => {
      set({ selectedGroupId: groupId });
    },

    getGroups: () => {
      return Array.from(get().groups.values());
    },

    getSelectedGroup: () => {
      const { groups, selectedGroupId } = get();
      return selectedGroupId ? groups.get(selectedGroupId) || null : null;
    },
  };
});

