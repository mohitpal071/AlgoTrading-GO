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
    
    console.log('[WebSocketService] Attempting to connect to:', this.url.replace(/enctoken=[^&]+/, 'enctoken=***'));
    
    try {
      this.ws = new WebSocket(this.url);
      // Set binaryType to 'arraybuffer' to receive binary data as ArrayBuffer
      // Reference implementation: this.ws.binaryType = "arraybuffer"
      this.ws.binaryType = 'arraybuffer';
      
      // Set up event handlers BEFORE the connection might close
      let connectionEstablished = false;
      
      this.ws.onopen = () => {
        connectionEstablished = true;
        console.log('[WebSocketService] ✓ WebSocket connected successfully');
        console.log('[WebSocketService] Ready state:', this.ws?.readyState);
        console.log('[WebSocketService] onTickCallback is set:', !!this.onTickCallback);
        this.setStatus('connected');
        this.reconnectAttempts = 0;
        this.manuallyDisconnected = false;
        
        // Resubscribe to tokens if we have any
        if (this.subscribedTokens.length > 0 && this.ws) {
          console.log('[WebSocketService] Resubscribing to tokens on reconnect:', this.subscribedTokens);
          // Send subscription message directly since we're already connected
          this.ws.send(JSON.stringify({
            a: 'subscribe',
            v: this.subscribedTokens,
          }));
          // Set mode to "full" for resubscribed tokens
          this.ws.send(JSON.stringify({
            a: 'mode',
            v: ['full', this.subscribedTokens],
          }));
        }
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event);
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocketService] ✗ WebSocket error occurred:', error);
        console.error('[WebSocketService] Error details:', {
          readyState: this.ws?.readyState,
          url: this.url.replace(/enctoken=[^&]+/, 'enctoken=***'),
        });
        this.setStatus('error');
      };

      this.ws.onclose = (event) => {
        const wasClean = event.wasClean;
        const code = event.code;
        const reason = event.reason;
        
        console.log('[WebSocketService] WebSocket closed', { 
          wasClean, 
          code, 
          reason,
          connectionEstablished,
          readyState: this.ws?.readyState 
        });
        
        // Log specific error codes
        if (code === 1006) {
          console.error('[WebSocketService] Connection closed abnormally (1006). Possible causes:');
          console.error('  - Invalid or expired ENCTOKEN');
          console.error('  - Network connectivity issues');
          console.error('  - Server rejected the connection');
        } else if (code === 1002) {
          console.error('[WebSocketService] Protocol error (1002). Check URL format and parameters.');
        } else if (code === 1003) {
          console.error('[WebSocketService] Unsupported data (1003). Check message format.');
        } else if (code === 1008) {
          console.error('[WebSocketService] Policy violation (1008). Check authentication parameters.');
        }
        
        this.setStatus('disconnected');
        
        // Only attempt reconnect if not manually disconnected and connection was established
        if (!this.manuallyDisconnected && connectionEstablished) {
          this.attemptReconnect();
        } else if (!connectionEstablished) {
          console.error('[WebSocketService] Connection closed before it was established. Check:');
          console.error('  1. VITE_ENCTOKEN is set correctly in .env file');
          console.error('  2. ENCTOKEN is valid and not expired');
          console.error('  3. Network connectivity to wss://ws.zerodha.com');
        }
      };
    } catch (error) {
      console.error('[WebSocketService] ✗ Failed to create WebSocket:', error);
      if (error instanceof Error) {
        console.error('[WebSocketService] Error message:', error.message);
        console.error('[WebSocketService] Error stack:', error.stack);
      }
      this.setStatus('error');
      
      // Only attempt reconnect if not manually disconnected
      if (!this.manuallyDisconnected) {
        this.attemptReconnect();
      }
    }
  }

  private async handleMessage(event: MessageEvent): Promise<void> {
    
    
    let arrayBuffer: ArrayBuffer | null = null;
    
    // Handle binary data - could be ArrayBuffer or Blob
    if (event.data instanceof ArrayBuffer) {
      arrayBuffer = event.data;
    } else {
      // Try to handle as string (text messages)
      if (typeof event.data === 'string') {
        try {
          const message = JSON.parse(event.data);
          console.log('Received text message:', message);
          this.processTextMessage(message);
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      } else {
        console.warn('Unknown data type:', typeof event.data, event.data);
      }
      return;
    }
    
    // Handle binary tick data - only parse if we have enough data
    // Reference implementation checks: e.data.byteLength > 2
    if (arrayBuffer && arrayBuffer.byteLength > 2) {
      console.debug('Received binary tick data, size:', arrayBuffer.byteLength);
      this.parseBinaryTick(arrayBuffer);
    } else if (arrayBuffer) {
      console.warn('Binary data too small to parse:', arrayBuffer.byteLength);
    }
  }

  private processTextMessage(message: any): void {
    // Handle text-based WebSocket messages (errors, alerts, etc.)
    if (message.type === 'error' || message.t === 'error') {
      console.error('WebSocket error message:', message);
    }
    // Add other message type handlers as needed
  }

  private parseBinaryTick(data: ArrayBuffer): void {
    // Parse binary tick format from Go backend
    // Format: [packet_count (2 bytes)][packet1_len (2 bytes)][packet1_data][packet2_len (2 bytes)][packet2_data]...
    const view = new DataView(data);
    let offset = 0;

    if (data.byteLength < 2) {
      console.warn('Binary data too short:', data.byteLength);
      return;
    }

    const packetCount = view.getUint16(offset, false); // Big-endian
    offset += 2;
    
    //console.log(`Parsing ${packetCount} tick packet(s) from binary data (${data.byteLength} bytes)`);

    for (let i = 0; i < packetCount; i++) {
      if (offset + 2 > data.byteLength) {
        console.warn(`Packet ${i + 1}: Not enough data for packet length`);
        break;
      }

      const packetLen = view.getUint16(offset, false);
      offset += 2;

      if (offset + packetLen > data.byteLength) {
        console.warn(`Packet ${i + 1}: Packet length ${packetLen} exceeds remaining data`);
        break;
      }

      const packetData = data.slice(offset, offset + packetLen);
      console.debug(`Parsing packet ${i + 1}/${packetCount}, length: ${packetLen}`);
      this.parseTickPacket(packetData);
      offset += packetLen;
    }
  }

  /**
   * Get decimal divisor based on segment (matches reference implementation getDecimals)
   * Segment is determined from the last byte of instrument token
   */
  private getDecimals(token: number): number {
    const segment = token & 0xFF;
    // Segment constants: NseCD = 3, BseCD = 5, NseCOM = 12, others = default
    if (segment === 3) {
      return 10000000; // NseCD
    } else if (segment === 5 || segment === 12) {
      return 10000; // BseCD or NseCOM
    } else {
      return 100; // Default (stocks, indices, etc.)
    }
  }


  private parseTickPacket(packet: ArrayBuffer): void {
    // Parse individual tick packet according to Zerodha binary format
    // Based on reference implementation from Kite Connect
    if (packet.byteLength < 8) {
      console.warn('Packet too short to parse:', packet.byteLength);
      return;
    }

    const view = new DataView(packet);
    const token = view.getUint32(0, false); // Big-endian
    const segment = token & 0xFF; // Last byte determines segment
    const decimals = this.getDecimals(token); // Get price divisor based on segment
    const isIndex = segment === 9; // Indices segment = 9
    const isTradable = segment !== 9; // All segments except indices are tradable

    // Determine mode based on packet length - matches backend constants
    const MODE_LTP_LENGTH = 8;
    const MODE_QUOTE_INDEX_LENGTH = 28; // modeQuoteIndexPacketLength
    const MODE_FULL_INDEX_LENGTH = 32;  // modeFullIndexLength
    // const MODE_QUOTE_LENGTH = 44;     // modeQuoteLength (used implicitly in else clause)
    const MODE_FULL_LENGTH = 184;       // modeFullLength

    let tick: Tick | undefined;

    // Mode LTP (8 bytes) - only last price
    // Reference: if (8 === e.byteLength)
    if (packet.byteLength === MODE_LTP_LENGTH) {
      const lastPrice = view.getUint32(4, false) / decimals;
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
        volume: 0,
      };
    }
    // Mode LTPC (12 bytes) - LTP + Close price (reference: else if (12 === e.byteLength))
    else if (packet.byteLength === 12) {
      const lastPrice = view.getUint32(4, false) / decimals;
      const closePrice = view.getUint32(8, false) / decimals;
      const netChange = lastPrice - closePrice;
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
        netChange,
        ohlc: { open: 0, high: 0, low: 0, close: closePrice },
        depth: { buy: [], sell: [] },
        volume: 0,
      };
    }
    // Mode LTPCOI (16 bytes) - LTP + Close + OI (reference: else if (16 === e.byteLength))
    else if (packet.byteLength === 16) {
      const lastPrice = view.getUint32(4, false) / decimals;
      const closePrice = view.getUint32(8, false) / decimals;
      const oi = view.getUint32(12, false);
      const netChange = lastPrice - closePrice;
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
        oi,
        oiDayHigh: 0,
        oiDayLow: 0,
        netChange,
        ohlc: { open: 0, high: 0, low: 0, close: closePrice },
        depth: { buy: [], sell: [] },
        volume: 0,
      };
    }
    // Mode Quote Index (28 bytes) or Full Index (32 bytes)
    // Reference: else if (28 === e.byteLength || 32 === e.byteLength)
    else if (packet.byteLength === MODE_QUOTE_INDEX_LENGTH || packet.byteLength === MODE_FULL_INDEX_LENGTH) {
      const lastPrice = view.getUint32(4, false) / decimals;
      const high = view.getUint32(8, false) / decimals;
      const low = view.getUint32(12, false) / decimals;
      const open = view.getUint32(16, false) / decimals;
      const close = view.getUint32(20, false) / decimals;
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
    // Mode Quote (44 bytes) or Full (164/184 bytes) for stocks
    // Reference: else block handles 44, 164, 184 byte packets
    else {
      // Read lastPrice and closePrice first
      const lastPrice = view.getUint32(4, false) / decimals;
      const closePrice = view.getUint32(40, false) / decimals;
      
      // Read other fields
      const lastTradedQuantity = view.getUint32(8, false);
      const averageTradePrice = view.getUint32(12, false) / decimals;
      const volumeTraded = view.getUint32(16, false);
      const totalBuyQuantity = view.getUint32(20, false);
      const totalSellQuantity = view.getUint32(24, false);
      const open = view.getUint32(28, false) / decimals;
      const high = view.getUint32(32, false) / decimals;
      const low = view.getUint32(36, false) / decimals;

      // Initialize tick with quote mode data (matching backend line 711-728)
      // Note: Backend doesn't set netChange for quote mode, but we calculate it for UI
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
        netChange: lastPrice - closePrice, // Calculate for UI (backend sets this only in full mode)
        ohlc: { open, high, low, close: closePrice },
        depth: { buy: [], sell: [] },
        volume: volumeTraded,
      };

      // Parse full mode (164 or 184 bytes) - includes OI, depth, timestamps
      // Reference: if (164 === e.byteLength || 184 === e.byteLength)
      if (packet.byteLength === 164 || packet.byteLength === MODE_FULL_LENGTH) {
        tick.mode = 'full';
        // Read full mode fields
        // For 184 bytes: lastTradeTime at 44, for 164 bytes: depth starts at 44
        const depthStartOffset = packet.byteLength === MODE_FULL_LENGTH ? 64 : 44;
        
        if (packet.byteLength === MODE_FULL_LENGTH) {
          tick.lastTradeTime = view.getUint32(44, false);
          tick.oi = view.getUint32(48, false);
          tick.oiDayHigh = view.getUint32(52, false);
          tick.oiDayLow = view.getUint32(56, false);
          tick.timestamp = view.getUint32(60, false);
        }
        tick.netChange = lastPrice - closePrice;

        // Parse market depth (5 levels each for buy and sell)
        // Reference: depth parsing loop for 10 items (5 buy + 5 sell)
        // Buy depth starts at depthStartOffset, Sell depth at depthStartOffset + 60
        const buyDepth: typeof tick.depth.buy = [];
        const sellDepth: typeof tick.depth.sell = [];
        
        let buyPos = depthStartOffset;
        let sellPos = depthStartOffset + 60; // 5 levels * 12 bytes = 60
        
        // Parse 10 depth levels (5 buy + 5 sell)
        for (let i = 0; i < 10; i++) {
          const pos = i < 5 ? buyPos + (i * 12) : sellPos + ((i - 5) * 12);
          
          const qty = view.getUint32(pos, false);
          const price = view.getUint32(pos + 4, false) / decimals;
          const orders = view.getUint16(pos + 8, false);
          
          if (i < 5) {
            buyDepth.push({ price, quantity: qty, orders });
          } else {
            sellDepth.push({ price, quantity: qty, orders });
          }
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

    // Call onTick callback after parsing to update prices and other fields
    // This will trigger updateInstrumentFromTick in the watchlist store
    if (!tick) {
      console.warn('Failed to parse tick packet, tick is undefined');
      return;
    }

    // Verify callback is set before trying to call it
    if (!this.onTickCallback) {
      console.error('✗ CRITICAL: onTickCallback is NOT set! Cannot update prices.');
      console.error('✗ This means the callback was never registered or was cleared.');
      return;
    }

    // console.log(`✓ Parsed tick for token ${tick.instrumentToken}:`, {
    //   lastPrice: tick.lastPrice,
    //   volume: tick.volumeTraded || tick.volume,
    //   mode: tick.mode,
    //   netChange: tick.netChange,
    //   hasDepth: tick.depth.buy.length > 0 || tick.depth.sell.length > 0,
    //   ohlc: tick.ohlc,
    // });
    
  
    this.onTickCallback(tick);
    // console.log('onTickCallback called', tick);
  
  }

  subscribe(tokens: number[]): void {
    this.subscribedTokens = [...new Set([...this.subscribedTokens, ...tokens])];
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      // Backend expects: { "a": "subscribe", "v": [tokens] }
      const subscribeMessage = {
        a: 'subscribe',
        v: tokens,
      };
      console.log('Subscribing to tokens:', tokens, 'Message:', subscribeMessage);
      this.ws.send(JSON.stringify(subscribeMessage));
      
      // Set mode to "full" for subscribed tokens
      // Format: { "a": "mode", "v": ["full", tokens] }
      const modeMessage = {
        a: 'mode',
        v: ['full', tokens],
      };
      console.log('Setting mode to full for tokens:', tokens, 'Message:', modeMessage);
      this.ws.send(JSON.stringify(modeMessage));
    } else {
      console.warn('WebSocket not open, cannot subscribe. State:', this.ws?.readyState);
      // Store tokens for later subscription when connection is established
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
    if (!callback) {
      console.error('[WebSocketService] ✗ Cannot set null/undefined callback!');
      return;
    }
    this.onTickCallback = callback;
  }
  
  // Getter to verify callback is set (for debugging)
  getOnTickCallback(): boolean {
    return !!this.onTickCallback;
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

