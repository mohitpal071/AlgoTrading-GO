const API_BASE = 'http://localhost:8080';

export interface QuoteResponse {
  instrument_token: number;
  last_price: number;
  // Add more fields as needed
}

export async function getQuote(token: number): Promise<QuoteResponse> {
  const response = await fetch(`${API_BASE}/quote/${token}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch quote: ${response.statusText}`);
  }
  return response.json();
}

export async function getLTP(token: number): Promise<{ ltp: number }> {
  const response = await fetch(`${API_BASE}/ltp/${token}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch LTP: ${response.statusText}`);
  }
  return response.json();
}

export interface InstrumentResponse {
  enums: {
    Exchange: Record<string, number>;
    Segment: Record<string, number>;
    InstrumentType: Record<string, number>;
  };
  schema: string[];
  data: (string | number)[][];
  count: number;
}

export interface ParsedInstrument {
  instrumentToken: number;
  tradingsymbol: string;
  name: string;
  exchange: string;
  segment: string;
  instrumentType: string;
  tickSize: number;
  lotSize: number;
  strikePrice?: number;
  expiry?: string;
}

// ----- Option Chain API -----

export interface ServerOptionData {
  InstrumentToken: number;
  Tradingsymbol: string;
  Type: string;
  Strike: number;
  Expiry: string;
  LastPrice: number;
  BidPrice: number;
  AskPrice: number;
  BidQty: number;
  AskQty: number;
  Volume: number;
  OI: number;
  LastUpdated: string;
  IV: number;
  Delta: number;
  Gamma: number;
  Theta: number;
  Vega: number;
  IntrinsicValue: number;
  TimeValue: number;
}

export interface OptionChainStrikeResponse {
  strike: number;
  call?: ServerOptionData;
  put?: ServerOptionData;
}

export interface OptionChainResponse {
  underlying: string;
  underlying_token: number;
  underlying_price: number;
  expiry: string;
  strikes: OptionChainStrikeResponse[];
}

export async function getOptionChain(
  underlying: string,
  expiry?: string
): Promise<OptionChainResponse> {
  const params = new URLSearchParams({ underlying });
  if (expiry) {
    params.set('expiry', expiry);
  }
  const response = await fetch(`${API_BASE}/options/chain?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch option chain: ${response.statusText}`);
  }
  return response.json();
}

export async function getInstruments(): Promise<ParsedInstrument[]> {
  const response = await fetch(`${API_BASE}/instruments`);
  if (!response.ok) {
    throw new Error(`Failed to fetch instruments: ${response.statusText}`);
  }
  const data: InstrumentResponse = await response.json();
  
  // Create reverse enum maps for decoding
  const exchangeMap = new Map<number, string>();
  const segmentMap = new Map<number, string>();
  const instrumentTypeMap = new Map<number, string>();
  
  Object.entries(data.enums.Exchange).forEach(([key, value]) => {
    exchangeMap.set(value, key);
  });
  Object.entries(data.enums.Segment).forEach(([key, value]) => {
    segmentMap.set(value, key);
  });
  Object.entries(data.enums.InstrumentType).forEach(([key, value]) => {
    instrumentTypeMap.set(value, key);
  });
  
  // Parse the columnar data
  const instruments: ParsedInstrument[] = [];
  for (const row of data.data) {
    instruments.push({
      instrumentToken: row[0] as number,
      tradingsymbol: row[1] as string,
      name: row[2] as string,
      exchange: exchangeMap.get(row[3] as number) || '',
      segment: segmentMap.get(row[4] as number) || '',
      instrumentType: instrumentTypeMap.get(row[5] as number) || '',
      tickSize: row[6] as number,
      lotSize: row[7] as number,
      strikePrice: row[8] !== undefined && row[8] !== null ? (row[8] as number) : undefined,
      expiry: row[9] !== undefined && row[9] !== null ? (row[9] as string) : undefined,
    });
  }
  
  return instruments;
}

// ----- Historical Candle Data API -----

export type HistoricalInterval = 
  | 'minute' 
  | '3minute' 
  | '5minute' 
  | '10minute' 
  | '15minute' 
  | '30minute' 
  | '60minute' 
  | 'day';

export interface HistoricalCandle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  
  volume: number;
  oi?: number; // Open Interest (optional)
}

export interface HistoricalDataResponse {
  status: string;
  data: {
    candles: Array<[string, number, number, number, number, number, number?]>;
  };
}

/**
 * Fetches historical candle data from backend API (which proxies to Zerodha)
 * @param instrumentToken The instrument token
 * @param interval The candle interval (minute, 5minute, day, etc.)
 * @param from Start date in yyyy-mm-dd or yyyy-mm-dd hh:mm:ss format
 * @param to End date in yyyy-mm-dd or yyyy-mm-dd hh:mm:ss format
 * @param options Optional parameters (continuous, oi)
 */
export async function getHistoricalData(
  instrumentToken: number,
  interval: HistoricalInterval,
  from: string,
  to: string,
  options?: {
    continuous?: boolean;
    oi?: boolean;
  }
): Promise<HistoricalCandle[]> {
  const url = new URL(`${API_BASE}/historical/${instrumentToken}/${interval}`);
  
  url.searchParams.set('from', from);
  url.searchParams.set('to', to);
  
  if (options?.continuous) {
    url.searchParams.set('continuous', '1');
  }
  if (options?.oi) {
    url.searchParams.set('oi', '1');
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch historical data: ${response.statusText}`);
  }

  const data: HistoricalDataResponse = await response.json();

  if (data.status !== 'success') {
    throw new Error('Historical data API returned error status');
  }

  // Parse candles: [timestamp, open, high, low, close, volume, oi?]
  return data.data.candles.map((candle) => ({
    timestamp: candle[0] as string,
    open: candle[1] as number,
    high: candle[2] as number,
    low: candle[3] as number,
    close: candle[4] as number,
    volume: candle[5] as number,
    oi: candle[6] as number | undefined,
  }));
}

