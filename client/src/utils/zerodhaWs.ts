/**
 * Builds the Zerodha WebSocket URL with required query parameters
 * Based on the Go implementation in kiteticker.go
 */
export function buildZerodhaWebSocketUrl(): string {
  const enctoken = import.meta.env.VITE_ENCTOKEN;
  const userId = import.meta.env.VITE_USER_ID || 'VM2107';
  
  // Validate enctoken
  if (!enctoken) {
    throw new Error(
      'VITE_ENCTOKEN environment variable is not set.\n' +
      'Please create a .env file in the client directory with:\n' +
      'VITE_ENCTOKEN=your_enctoken_here\n' +
      'VITE_USER_ID=your_user_id (optional)'
    );
  }

  const trimmedEnctoken = enctoken.trim();
  if (!trimmedEnctoken) {
    throw new Error('VITE_ENCTOKEN is set but appears to be empty. Please check your .env file.');
  }

  if (trimmedEnctoken.length < 10) {
    console.warn('[ZerodhaWS] Warning: ENCTOKEN seems unusually short. Please verify it is correct.');
  }

  // Generate a unique UID (timestamp-based, similar to Go implementation)
  const uid = Date.now().toString();

  const url = new URL('wss://ws.zerodha.com/');
  url.searchParams.set('api_key', 'kitefront');
  url.searchParams.set('user_id', userId);
  // Note: searchParams.set automatically URL-encodes the value
  // If your enctoken already has == at the end, it will be properly encoded
  url.searchParams.set('enctoken', trimmedEnctoken);
  url.searchParams.set('uid', uid);
  url.searchParams.set('user-agent', 'kite3-web');
  url.searchParams.set('version', '3.0.0');

  const wsUrl = url.toString();
  console.log('[ZerodhaWS] WebSocket URL constructed');
  console.log('[ZerodhaWS] User ID:', userId);
  console.log('[ZerodhaWS] UID:', uid);
  console.log('[ZerodhaWS] ENCTOKEN length:', trimmedEnctoken.length);
  console.log('[ZerodhaWS] Full URL (enctoken hidden):', 
    wsUrl.replace(/enctoken=[^&]+/, 'enctoken=***'));

  return wsUrl;
}

