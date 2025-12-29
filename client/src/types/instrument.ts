export interface Instrument {
  symbol: string;
  name: string;
  exchange: string;
  instrumentToken?: number; // Zerodha instrument token
  
  // Price data
  lastPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  
  // OHLC
  open: number;
  high: number;
  low: number;
  close: number;
  
  // Volume and trade data
  volume: number;
  volumeTraded?: number; // Zerodha specific
  averageTradePrice?: number;
  lastTradedQuantity?: number;
  
  // Buy/Sell data
  bid: number; // Best bid price
  ask: number; // Best ask price
  bidSize: number; // Best bid quantity
  askSize: number; // Best ask quantity
  totalBuyQuantity?: number;
  totalSellQuantity?: number;
  
  // Open Interest (for F&O)
  oi?: number;
  oiDayHigh?: number;
  oiDayLow?: number;
  
  // Timestamps
  timestamp: number;
  lastTradeTime?: number;
  
  // Additional Zerodha fields
  netChange?: number;
  isTradable?: boolean;
  isIndex?: boolean;
}

export interface WatchlistItem {
  instrument: Instrument;
  isFavorite?: boolean;
  alertPrice?: number;
}

