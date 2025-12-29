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
    });
  }
  
  return instruments;
}

