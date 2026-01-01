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
    const { options, chains } = get();
    const existing = options.get(tick.instrumentToken);
    
    if (existing) {
      // Use depth data for bid/ask if available, otherwise use legacy fields
      const bidPrice = tick.depth.buy.length > 0 ? tick.depth.buy[0].price : (tick.bidPrice || 0);
      const askPrice = tick.depth.sell.length > 0 ? tick.depth.sell[0].price : (tick.askPrice || 0);
      const bidQty = tick.depth.buy.length > 0 ? tick.depth.buy[0].quantity : (tick.bidQty || 0);
      const askQty = tick.depth.sell.length > 0 ? tick.depth.sell[0].quantity : (tick.askQty || 0);
      
      const updated: OptionData = {
        ...existing,
        lastPrice: tick.lastPrice,
        openPrice: existing.openPrice || tick.ohlc?.open || tick.lastPrice, // Track first open price or use ohlc.open
        bidPrice,
        askPrice,
        bidQty,
        askQty,
        volume: tick.volumeTraded || tick.volume || 0,
        oi: tick.oi,
        previousOI: existing.oi || 0, // Store previous OI before updating
        lastUpdated: tick.timestamp * 1000, // Convert to milliseconds
      };
      
      // Update the options map
      const newOptions = new Map(options);
      newOptions.set(tick.instrumentToken, updated);
      
      // Also update the chain structure so the table reflects the changes
      const newChains = new Map(chains);
      
      if (newChains.has(updated.underlying)) {
        const underlyingChains = newChains.get(updated.underlying)!;
        if (underlyingChains.has(updated.expiry)) {
          const chainRows = underlyingChains.get(updated.expiry)!;
          const strikeIndex = chainRows.findIndex(row => row.strike === updated.strike);
          
          if (strikeIndex >= 0) {
            const row = chainRows[strikeIndex];
            if (updated.type === 'CE') {
              row.call = updated;
            } else {
              row.put = updated;
            }
            chainRows[strikeIndex] = row;
          }
        }
      }
      
      set({
        options: newOptions,
        chains: newChains,
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

