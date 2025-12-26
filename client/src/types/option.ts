export type OptionType = 'CE' | 'PE';

export interface OptionData {
  instrumentToken: number;
  tradingSymbol: string;
  type: OptionType;
  strike: number;
  expiry: string;
  
  // Market Data
  lastPrice: number;
  bidPrice: number;
  askPrice: number;
  bidQty: number;
  askQty: number;
  volume: number;
  oi: number;
  lastUpdated: number;
  
  // Calculated Fields
  iv: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  intrinsicValue: number;
  timeValue: number;
  
  // Underlying
  underlying: string;
  underlyingPrice: number;
}

export interface OptionChainRow {
  strike: number;
  call?: OptionData;
  put?: OptionData;
}

