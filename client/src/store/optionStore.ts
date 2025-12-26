import { create } from 'zustand';
import { OptionData, OptionChainRow } from '../types/option';
import { Tick } from '../types/tick';

interface OptionStore {
  // Option data by token
  options: Map<number, OptionData>;
  
  // Option chains by underlying and expiry
  chains: Map<string, Map<string, OptionChainRow[]>>;
  
  // Actions
  updateFromTick: (tick: Tick) => void;
  setOptionData: (token: number, data: OptionData) => void;
  getOptionData: (token: number) => OptionData | undefined;
  getChain: (underlying: string, expiry: string) => OptionChainRow[];
  clear: () => void;
}

export const useOptionStore = create<OptionStore>((set, get) => ({
  options: new Map(),
  chains: new Map(),

  updateFromTick: (tick: Tick) => {
    const { options } = get();
    const existing = options.get(tick.instrumentToken);
    
    if (existing) {
      const updated: OptionData = {
        ...existing,
        lastPrice: tick.lastPrice,
        bidPrice: tick.bidPrice,
        askPrice: tick.askPrice,
        bidQty: tick.bidQty,
        askQty: tick.askQty,
        volume: tick.volume,
        oi: tick.oi,
        lastUpdated: tick.timestamp,
      };
      
      set({
        options: new Map(options).set(tick.instrumentToken, updated),
      });
    }
  },

  setOptionData: (token: number, data: OptionData) => {
    const { options, chains } = get();
    const newOptions = new Map(options);
    newOptions.set(token, data);
    
    // Update chain structure
    const chainKey = `${data.underlying}_${data.expiry}`;
    const newChains = new Map(chains);
    
    if (!newChains.has(data.underlying)) {
      newChains.set(data.underlying, new Map());
    }
    
    const underlyingChains = newChains.get(data.underlying)!;
    if (!underlyingChains.has(data.expiry)) {
      underlyingChains.set(data.expiry, []);
    }
    
    const chainRows = underlyingChains.get(data.expiry)!;
    const strikeIndex = chainRows.findIndex(row => row.strike === data.strike);
    
    if (strikeIndex >= 0) {
      const row = chainRows[strikeIndex];
      if (data.type === 'CE') {
        row.call = data;
      } else {
        row.put = data;
      }
      chainRows[strikeIndex] = row;
    } else {
      const newRow: OptionChainRow = {
        strike: data.strike,
      };
      if (data.type === 'CE') {
        newRow.call = data;
      } else {
        newRow.put = data;
      }
      chainRows.push(newRow);
      chainRows.sort((a, b) => a.strike - b.strike);
    }
    
    set({ options: newOptions, chains: newChains });
  },

  getOptionData: (token: number) => {
    return get().options.get(token);
  },

  getChain: (underlying: string, expiry: string) => {
    const { chains } = get();
    return chains.get(underlying)?.get(expiry) || [];
  },

  clear: () => {
    set({
      options: new Map(),
      chains: new Map(),
    });
  },
}));

