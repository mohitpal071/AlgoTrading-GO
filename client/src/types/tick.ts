export interface Tick {
  instrumentToken: number;
  lastPrice: number;
  bidPrice: number;
  askPrice: number;
  bidQty: number;
  askQty: number;
  volume: number;
  oi: number;
  timestamp: number;
}

export interface BinaryTickMessage {
  type: number;
  data: ArrayBuffer;
}

