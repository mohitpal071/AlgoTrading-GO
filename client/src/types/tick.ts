// DepthItem represents a single market depth entry (Zerodha format)
export interface DepthItem {
  price: number;
  quantity: number;
  orders: number;
}

// OHLC represents OHLC data (Zerodha format)
export interface OHLC {
  open: number;
  high: number;
  low: number;
  close: number;
}

// Tick represents a single packet in the Zerodha market feed
export interface Tick {
  mode: string; // 'ltp' | 'quote' | 'full'
  instrumentToken: number;
  isTradable: boolean;
  isIndex: boolean;
  
  // Timestamps
  timestamp: number; // Exchange timestamp (Unix timestamp in seconds)
  lastTradeTime: number; // Last trade time (Unix timestamp in seconds)
  
  // Price and volume data
  lastPrice: number;
  lastTradedQuantity: number;
  averageTradePrice: number;
  volumeTraded: number;
  
  // Buy/Sell quantities
  totalBuyQuantity: number;
  totalSellQuantity: number;
  totalBuy: number;
  totalSell: number;
  
  // Open Interest (for F&O)
  oi: number;
  oiDayHigh: number;
  oiDayLow: number;
  
  // Price change
  netChange: number;
  
  // OHLC data
  ohlc: OHLC;
  
  // Market depth (5 levels each for buy and sell)
  depth: {
    buy: DepthItem[];
    sell: DepthItem[];
  };
  
  // Legacy fields for backward compatibility
  bidPrice?: number; // First buy depth price
  askPrice?: number; // First sell depth price
  bidQty?: number; // First buy depth quantity
  askQty?: number; // First sell depth quantity
  volume?: number; // Alias for volumeTraded
}

export interface BinaryTickMessage {
  type: number;
  data: ArrayBuffer;
}

