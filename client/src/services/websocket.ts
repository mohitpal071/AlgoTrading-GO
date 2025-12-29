import { Tick } from '../types/tick';

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private subscribedTokens: number[] = [];
  private onTickCallback: ((tick: Tick) => void) | null = null;
  private onStatusChangeCallback: ((status: WebSocketStatus) => void) | null = null;
  private status: WebSocketStatus = 'disconnected';
  private manuallyDisconnected: boolean = false;
  private reconnectTimeoutId: number | null = null;

  constructor(url: string) {
    this.url = url;
  }

  connect(): void {
    // Don't connect if already connected
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    // Don't connect if manually disconnected
    if (this.manuallyDisconnected) {
      return;
    }

    // Clear any pending reconnect
    if (this.reconnectTimeoutId !== null) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    // Close existing connection if in connecting/connected state
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      this.ws.close();
    }

    this.manuallyDisconnected = false;
    this.setStatus('connecting');
    
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.setStatus('connected');
        this.reconnectAttempts = 0;
        this.manuallyDisconnected = false;
        
        // Resubscribe to tokens if we have any
        if (this.subscribedTokens.length > 0) {
          this.subscribe(this.subscribedTokens);
        }
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.setStatus('error');
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected', { code: event.code, reason: event.reason });
        this.setStatus('disconnected');
        
        // Only attempt reconnect if not manually disconnected
        if (!this.manuallyDisconnected) {
          this.attemptReconnect();
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.setStatus('error');
      
      // Only attempt reconnect if not manually disconnected
      if (!this.manuallyDisconnected) {
        this.attemptReconnect();
      }
    }
  }

  private handleMessage(event: MessageEvent): void {
    if (event.data instanceof ArrayBuffer) {
      // Handle binary tick data
      this.parseBinaryTick(event.data);
    } else if (typeof event.data === 'string') {
      // Handle text messages (JSON)
      try {
        const message = JSON.parse(event.data);
        console.log('Received message:', message);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    }
  }

  private parseBinaryTick(data: ArrayBuffer): void {
    // Parse binary tick format from Go backend
    // Format: [packet_count (2 bytes)][packet1_len (2 bytes)][packet1_data][packet2_len (2 bytes)][packet2_data]...
    const view = new DataView(data);
    let offset = 0;

    if (data.byteLength < 2) return;

    const packetCount = view.getUint16(offset, false); // Big-endian
    offset += 2;

    for (let i = 0; i < packetCount; i++) {
      if (offset + 2 > data.byteLength) break;

      const packetLen = view.getUint16(offset, false);
      offset += 2;

      if (offset + packetLen > data.byteLength) break;

      const packetData = data.slice(offset, offset + packetLen);
      this.parseTickPacket(packetData);
      offset += packetLen;
    }
  }

  /**
   * Convert price from paise to rupees based on segment
   * Segment is determined from the last byte of instrument token
   */
  private convertPrice(segment: number, val: number): number {
    // NseCD = 3, BseCD = 5 use different conversion
    if (segment === 3) {
      return val / 10000000.0; // NseCD
    } else if (segment === 5) {
      return val / 10000.0; // BseCD
    } else {
      return val / 100.0; // Default (stocks, indices, etc.)
    }
  }

  private parseTickPacket(packet: ArrayBuffer): void {
    // Parse individual tick packet according to Zerodha binary format
    if (packet.byteLength < 8) return;

    const view = new DataView(packet);
    const token = view.getUint32(0, false); // Big-endian
    const segment = token & 0xFF; // Last byte determines segment
    const isIndex = segment === 9; // Indices segment = 9
    const isTradable = !isIndex;

    // Determine mode based on packet length
    const MODE_LTP_LENGTH = 8;
    const MODE_QUOTE_INDEX_LENGTH = 28;
    const MODE_FULL_INDEX_LENGTH = 32;
    const MODE_QUOTE_LENGTH = 44;
    const MODE_FULL_LENGTH = 184;

    let tick: Tick;

    // Mode LTP (8 bytes) - only last price
    if (packet.byteLength === MODE_LTP_LENGTH) {
      const lastPrice = this.convertPrice(segment, view.getUint32(4, false));
      tick = {
        mode: 'ltp',
        instrumentToken: token,
        isTradable,
        isIndex,
        timestamp: Math.floor(Date.now() / 1000),
        lastTradeTime: 0,
        lastPrice,
        lastTradedQuantity: 0,
        averageTradePrice: 0,
        volumeTraded: 0,
        totalBuyQuantity: 0,
        totalSellQuantity: 0,
        totalBuy: 0,
        totalSell: 0,
        oi: 0,
        oiDayHigh: 0,
        oiDayLow: 0,
        netChange: 0,
        ohlc: { open: 0, high: 0, low: 0, close: 0 },
        depth: { buy: [], sell: [] },
        // Legacy fields
        volume: 0,
      };
    }
    // Mode Quote Index (28 bytes) or Full Index (32 bytes)
    else if (packet.byteLength === MODE_QUOTE_INDEX_LENGTH || packet.byteLength === MODE_FULL_INDEX_LENGTH) {
      const lastPrice = this.convertPrice(segment, view.getUint32(4, false));
      const high = this.convertPrice(segment, view.getUint32(8, false));
      const low = this.convertPrice(segment, view.getUint32(12, false));
      const open = this.convertPrice(segment, view.getUint32(16, false));
      const close = this.convertPrice(segment, view.getUint32(20, false));
      const netChange = lastPrice - close;
      
      tick = {
        mode: packet.byteLength === MODE_FULL_INDEX_LENGTH ? 'full' : 'quote',
        instrumentToken: token,
        isTradable,
        isIndex,
        timestamp: packet.byteLength === MODE_FULL_INDEX_LENGTH 
          ? view.getUint32(28, false) 
          : Math.floor(Date.now() / 1000),
        lastTradeTime: 0,
        lastPrice,
        lastTradedQuantity: 0,
        averageTradePrice: 0,
        volumeTraded: 0,
        totalBuyQuantity: 0,
        totalSellQuantity: 0,
        totalBuy: 0,
        totalSell: 0,
        oi: 0,
        oiDayHigh: 0,
        oiDayLow: 0,
        netChange,
        ohlc: { open, high, low, close },
        depth: { buy: [], sell: [] },
        volume: 0,
      };
    }
    // Mode Quote (44 bytes) or Full (184 bytes) for stocks
    else {
      const lastPrice = this.convertPrice(segment, view.getUint32(4, false));
      const lastTradedQuantity = view.getUint32(8, false);
      const averageTradePrice = this.convertPrice(segment, view.getUint32(12, false));
      const volumeTraded = view.getUint32(16, false);
      const totalBuyQuantity = view.getUint32(20, false);
      const totalSellQuantity = view.getUint32(24, false);
      const open = this.convertPrice(segment, view.getUint32(28, false));
      const high = this.convertPrice(segment, view.getUint32(32, false));
      const low = this.convertPrice(segment, view.getUint32(36, false));
      const close = this.convertPrice(segment, view.getUint32(40, false));
      const netChange = lastPrice - close;

      // Initialize tick with quote mode data
      tick = {
        mode: 'quote',
        instrumentToken: token,
        isTradable,
        isIndex,
        timestamp: Math.floor(Date.now() / 1000),
        lastTradeTime: 0,
        lastPrice,
        lastTradedQuantity,
        averageTradePrice,
        volumeTraded,
        totalBuyQuantity,
        totalSellQuantity,
        totalBuy: 0,
        totalSell: 0,
        oi: 0,
        oiDayHigh: 0,
        oiDayLow: 0,
        netChange,
        ohlc: { open, high, low, close },
        depth: { buy: [], sell: [] },
        volume: volumeTraded,
      };

      // Parse full mode (184 bytes) - includes OI, depth, timestamps
      if (packet.byteLength === MODE_FULL_LENGTH) {
        tick.mode = 'full';
        tick.lastTradeTime = view.getUint32(44, false);
        tick.oi = view.getUint32(48, false);
        tick.oiDayHigh = view.getUint32(52, false);
        tick.oiDayLow = view.getUint32(56, false);
        tick.timestamp = view.getUint32(60, false);

        // Parse market depth (5 levels each for buy and sell)
        // Buy depth starts at offset 64, Sell depth at 124
        // Each level is 12 bytes: quantity(4), price(4), orders(2)
        const buyDepth: typeof tick.depth.buy = [];
        const sellDepth: typeof tick.depth.sell = [];
        
        let buyPos = 64;
        let sellPos = 124;
        
        for (let i = 0; i < 5; i++) {
          // Buy depth
          const buyQty = view.getUint32(buyPos, false);
          const buyPrice = this.convertPrice(segment, view.getUint32(buyPos + 4, false));
          const buyOrders = view.getUint16(buyPos + 8, false);
          buyDepth.push({ price: buyPrice, quantity: buyQty, orders: buyOrders });
          
          // Sell depth
          const sellQty = view.getUint32(sellPos, false);
          const sellPrice = this.convertPrice(segment, view.getUint32(sellPos + 4, false));
          const sellOrders = view.getUint16(sellPos + 8, false);
          sellDepth.push({ price: sellPrice, quantity: sellQty, orders: sellOrders });
          
          buyPos += 12;
          sellPos += 12;
        }
        
        tick.depth = { buy: buyDepth, sell: sellDepth };
        
        // Set legacy bid/ask fields from first depth level
        if (buyDepth.length > 0) {
          tick.bidPrice = buyDepth[0].price;
          tick.bidQty = buyDepth[0].quantity;
        }
        if (sellDepth.length > 0) {
          tick.askPrice = sellDepth[0].price;
          tick.askQty = sellDepth[0].quantity;
        }
      }
    }

    if (this.onTickCallback && tick) {
      this.onTickCallback(tick);
    }
  }

  subscribe(tokens: number[]): void {
    this.subscribedTokens = [...new Set([...this.subscribedTokens, ...tokens])];
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      // Backend expects: { "a": "subscribe", "v": [tokens] }
      this.ws.send(JSON.stringify({
        a: 'subscribe',
        v: tokens,
      }));
    }
  }

  unsubscribe(tokens: number[]): void {
    this.subscribedTokens = this.subscribedTokens.filter(
      token => !tokens.includes(token)
    );
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      // Backend expects: { "a": "unsubscribe", "v": [tokens] }
      this.ws.send(JSON.stringify({
        a: 'unsubscribe',
        v: tokens,
      }));
    }
  }

  onTick(callback: (tick: Tick) => void): void {
    this.onTickCallback = callback;
  }

  onStatusChange(callback: (status: WebSocketStatus) => void): void {
    this.onStatusChangeCallback = callback;
  }

  private setStatus(status: WebSocketStatus): void {
    this.status = status;
    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback(status);
    }
  }

  getStatus(): WebSocketStatus {
    return this.status;
  }

  private attemptReconnect(): void {
    // Don't reconnect if manually disconnected
    if (this.manuallyDisconnected) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimeoutId = window.setTimeout(() => {
      if (!this.manuallyDisconnected) {
        this.connect();
      }
      this.reconnectTimeoutId = null;
    }, delay);
  }

  disconnect(): void {
    this.manuallyDisconnected = true;
    
    // Clear any pending reconnect
    if (this.reconnectTimeoutId !== null) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    
    if (this.ws) {
      // Remove event handlers to prevent reconnect attempt
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    
    this.setStatus('disconnected');
    this.reconnectAttempts = 0;
  }
}

