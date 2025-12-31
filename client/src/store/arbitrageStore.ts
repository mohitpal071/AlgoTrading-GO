import { create } from 'zustand';
import { Tick } from '../types/tick';

export interface ArbitragePrice {
  instrumentToken: number;
  tradingsymbol: string;
  exchange: string;
  lastPrice: number;
  bidPrice: number;
  askPrice: number;
  volume: number;
  timestamp: number;
}

export interface ArbitrageStock {
  symbol: string;
  name: string;
  nse?: ArbitragePrice;
  bse?: ArbitragePrice;
  priceDiff: number;
  priceDiffPercent: number;
  arbitrageOpportunity: string;
}

interface ArbitrageStore {
  stocks: Map<string, ArbitrageStock>;
  symbolToTokens: Map<string, { nse?: number; bse?: number; nseSymbol?: string; bseSymbol?: string }>;
  
  // Actions
  addStock: (symbol: string, name: string, nseToken?: number, bseToken?: number, nseSymbol?: string, bseSymbol?: string) => void;
  removeStock: (symbol: string) => void;
  updateFromTick: (tick: Tick) => void;
  getStocks: () => ArbitrageStock[];
  getTokensToSubscribe: () => number[];
}

export const useArbitrageStore = create<ArbitrageStore>((set, get) => ({
  stocks: new Map(),
  symbolToTokens: new Map(),

  addStock: (symbol: string, name: string, nseToken?: number, bseToken?: number, nseSymbol?: string, bseSymbol?: string) => {
    const { stocks, symbolToTokens } = get();
    const upperSymbol = symbol.toUpperCase();
    
    const newStock: ArbitrageStock = {
      symbol: upperSymbol,
      name,
      priceDiff: 0,
      priceDiffPercent: 0,
      arbitrageOpportunity: 'NO_DATA',
    };

    stocks.set(upperSymbol, newStock);
    symbolToTokens.set(upperSymbol, { nse: nseToken, bse: bseToken, nseSymbol, bseSymbol });

    set({ stocks: new Map(stocks), symbolToTokens: new Map(symbolToTokens) });
  },

  removeStock: (symbol: string) => {
    const { stocks, symbolToTokens } = get();
    const upperSymbol = symbol.toUpperCase();
    
    stocks.delete(upperSymbol);
    symbolToTokens.delete(upperSymbol);

    set({ stocks: new Map(stocks), symbolToTokens: new Map(symbolToTokens) });
  },

  updateFromTick: (tick: Tick) => {
    const { stocks, symbolToTokens } = get();
    
    // Find which stock this tick belongs to
    let foundSymbol: string | null = null;
    let isNSE = false;
    let isBSE = false;

    for (const [symbol, tokens] of symbolToTokens.entries()) {
      if (tokens.nse === tick.instrumentToken) {
        foundSymbol = symbol;
        isNSE = true;
        break;
      }
      if (tokens.bse === tick.instrumentToken) {
        foundSymbol = symbol;
        isBSE = true;
        break;
      }
    }

    if (!foundSymbol) {
      return; // This tick doesn't belong to any tracked stock
    }

    const stock = stocks.get(foundSymbol);
    if (!stock) {
      return;
    }

    // Get tradingsymbol from stored data
    const tokens = symbolToTokens.get(foundSymbol);
    const tradingsymbol = isNSE ? (tokens?.nseSymbol || '') : (tokens?.bseSymbol || '');
    
    // Extract price data from tick
    const bidPrice = tick.depth.buy.length > 0 ? tick.depth.buy[0].price : (tick.bidPrice || 0);
    const askPrice = tick.depth.sell.length > 0 ? tick.depth.sell[0].price : (tick.askPrice || 0);
    
    const priceData: ArbitragePrice = {
      instrumentToken: tick.instrumentToken,
      tradingsymbol,
      exchange: isNSE ? 'NSE' : 'BSE',
      lastPrice: tick.lastPrice,
      bidPrice,
      askPrice,
      volume: tick.volumeTraded || tick.volume || 0,
      timestamp: tick.timestamp * 1000, // Convert to milliseconds
    };

    // Update stock with new price data
    const updatedStock: ArbitrageStock = {
      ...stock,
      ...(isNSE ? { nse: priceData } : { bse: priceData }),
    };

    // Calculate arbitrage if both NSE and BSE prices are available
    if (updatedStock.nse && updatedStock.bse) {
      updatedStock.priceDiff = updatedStock.nse.lastPrice - updatedStock.bse.lastPrice;
      const avgPrice = (updatedStock.nse.lastPrice + updatedStock.bse.lastPrice) / 2;
      updatedStock.priceDiffPercent = avgPrice > 0 ? (updatedStock.priceDiff / avgPrice) * 100 : 0;

      // Determine arbitrage opportunity
      if (updatedStock.priceDiff > 0) {
        // NSE is higher, buy BSE and sell NSE
        updatedStock.arbitrageOpportunity = 'BUY_BSE_SELL_NSE';
      } else if (updatedStock.priceDiff < 0) {
        // BSE is higher, buy NSE and sell BSE
        updatedStock.arbitrageOpportunity = 'BUY_NSE_SELL_BSE';
      } else {
        updatedStock.arbitrageOpportunity = 'NO_ARBITRAGE';
      }
    } else if (updatedStock.nse && !updatedStock.bse) {
      updatedStock.arbitrageOpportunity = 'BSE_NOT_AVAILABLE';
    } else if (!updatedStock.nse && updatedStock.bse) {
      updatedStock.arbitrageOpportunity = 'NSE_NOT_AVAILABLE';
    } else {
      updatedStock.arbitrageOpportunity = 'NO_DATA';
    }

    const newStocks = new Map(stocks);
    newStocks.set(foundSymbol, updatedStock);

    set({ stocks: newStocks });
  },

  getStocks: () => {
    return Array.from(get().stocks.values());
  },

  getTokensToSubscribe: () => {
    const { symbolToTokens } = get();
    const tokens: number[] = [];
    
    for (const tokensMap of symbolToTokens.values()) {
      if (tokensMap.nse !== undefined) {
        tokens.push(tokensMap.nse);
      }
      if (tokensMap.bse !== undefined) {
        tokens.push(tokensMap.bse);
      }
    }

    return tokens;
  },
}));

