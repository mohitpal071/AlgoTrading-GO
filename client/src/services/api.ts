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

