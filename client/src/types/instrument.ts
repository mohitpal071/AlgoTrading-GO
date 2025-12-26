export interface Instrument {
  symbol: string;
  name: string;
  exchange: string;
  lastPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  timestamp: number;
}

export interface WatchlistItem {
  instrument: Instrument;
  isFavorite?: boolean;
  alertPrice?: number;
}

