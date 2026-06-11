/**
 * WebSocket service for real-time updates
 */

import { getAuthToken, getServerUrl } from "./client";

type AlertUpdateCallback = (unreadCount: number) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private callbacks: Set<AlertUpdateCallback> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect() {
    const token = getAuthToken();
    const baseUrl = getServerUrl();
    
    if (!token) {
      console.log('[WebSocket] No auth token, skipping connection');
      return;
    }

    // Convert http(s) to ws(s)
    const wsUrl = baseUrl
      .replace('http://', 'ws://')
      .replace('https://', 'wss://');
    
    const url = `${wsUrl}/ws/alerts?token=${token}`;
    
    console.log('[WebSocket] Connecting to:', wsUrl);
    
    try {
      this.ws = new WebSocket(url);
      
      this.ws.onopen = () => {
        console.log('[WebSocket] Connected');
        this.reconnectAttempts = 0;
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WebSocket] Message received:', data);
          
          if (data.type === 'alert_count_update') {
            // Notify all subscribers
            this.callbacks.forEach(callback => callback(data.unread_count));
          }
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
      };
      
      this.ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[WebSocket] Max reconnect attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.reconnectAttempts = 0;
    console.log('[WebSocket] Disconnected and cleaned up');
  }

  subscribe(callback: AlertUpdateCallback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const wsService = new WebSocketService();
