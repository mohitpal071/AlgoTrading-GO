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

  constructor(url: string) {
    this.url = url;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.setStatus('connecting');
    
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.setStatus('connected');
        this.reconnectAttempts = 0;
        
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

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.setStatus('disconnected');
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.setStatus('error');
      this.attemptReconnect();
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

  private parseTickPacket(packet: ArrayBuffer): void {
    // Parse individual tick packet (184 bytes for full mode)
    // Format: [token (4 bytes)][last_price (4 bytes)][...]
    if (packet.byteLength < 8) return;

    const view = new DataView(packet);
    const token = view.getUint32(0, false); // Big-endian
    const lastPrice = view.getUint32(4, false) / 100.0; // Convert from paise

    // Parse more fields if available (full mode has 184 bytes)
    let bidPrice = 0;
    let askPrice = 0;
    let bidQty = 0;
    let askQty = 0;
    let volume = 0;
    let oi = 0;

    if (packet.byteLength >= 184) {
      // Full mode parsing
      volume = view.getUint32(16, false);
      oi = view.getUint32(48, false);
      
      // Depth data starts at offset 64
      if (packet.byteLength >= 76) {
        bidQty = view.getUint32(64, false);
        bidPrice = view.getUint32(68, false) / 100.0;
      }
      if (packet.byteLength >= 88) {
        askQty = view.getUint32(124, false);
        askPrice = view.getUint32(128, false) / 100.0;
      }
    }

    const tick: Tick = {
      instrumentToken: token,
      lastPrice,
      bidPrice,
      askPrice,
      bidQty,
      askQty,
      volume,
      oi,
      timestamp: Date.now(),
    };

    if (this.onTickCallback) {
      this.onTickCallback(tick);
    }
  }

  subscribe(tokens: number[]): void {
    this.subscribedTokens = [...new Set([...this.subscribedTokens, ...tokens])];
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        val: tokens,
      }));
    }
  }

  unsubscribe(tokens: number[]): void {
    this.subscribedTokens = this.subscribedTokens.filter(
      token => !tokens.includes(token)
    );
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'unsubscribe',
        val: tokens,
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
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }
}

