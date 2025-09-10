import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface WebSocketMessage {
  type: string;
  resource?: string;
  action?: 'create' | 'update' | 'delete';
  data?: any;
  id?: string;
  timestamp?: string;
}

class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000;
  private isConnecting = false;
  private queryClient: any = null;
  private toast: any = null;

  connect(queryClient: any, toast: any) {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.queryClient = queryClient;
    this.toast = toast;
    this.isConnecting = true;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log('🔄 Connecting to WebSocket...', wsUrl);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        
        // Send authentication if user is logged in
        // We'll get user info from session/auth state
        this.sendAuth();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected', event.code, event.reason);
        this.isConnecting = false;
        this.ws = null;
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`🔄 Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
          setTimeout(() => this.connect(queryClient, toast), this.reconnectInterval);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
    }
  }

  private sendAuth() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // For now, send basic auth - we can enhance this later
      this.ws.send(JSON.stringify({
        type: 'auth',
        tenantId: 'main', // Default tenant for now
        userId: 'current_user'
      }));
    }
  }

  private handleMessage(message: WebSocketMessage) {
    console.log('📨 WebSocket message received:', message);

    switch (message.type) {
      case 'connected':
        console.log('🎉 Real-time connection established');
        break;
        
      case 'auth_success':
        console.log('✅ WebSocket authenticated');
        break;
        
      case 'data_update':
        this.handleDataUpdate(message);
        break;
        
      default:
        console.log('❓ Unknown WebSocket message type:', message.type, message);
    }
  }

  private handleDataUpdate(message: WebSocketMessage) {
    if (!this.queryClient || !message.resource) return;

    console.log(`🔄 Updating ${message.resource} data (${message.action})`);

    // Map resources to their query keys
    const queryKeyMap: Record<string, string[]> = {
      users: ['/api/users'],
      customers: ['/api/customers'],
      products: ['/api/products', '/api/products/low-stock'],
      categories: ['/api/categories'],
      'service-tickets': ['/api/service-tickets'],
      suppliers: ['/api/suppliers'],
      transactions: ['/api/transactions'],
      roles: ['/api/roles'],
      dashboard: ['/api/dashboard/stats'],
      whatsapp: ['/api/whatsapp/status'],
      inventory: ['/api/products', '/api/categories', '/api/reports/stock-movements'],
      'purchase-orders': ['/api/purchase-orders', '/api/purchase-orders/outstanding-items'],
      'stock-movements': ['/api/reports/stock-movements', '/api/products']
    };

    // Invalidate relevant queries to trigger refetch
    const queryKeys = queryKeyMap[message.resource] || [];
    
    queryKeys.forEach(queryKey => {
      this.queryClient.invalidateQueries({ queryKey: [queryKey] });
    });

    // Also invalidate dashboard stats for most updates
    if (message.resource !== 'dashboard') {
      this.queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
    }

    // Show toast notification for updates from other users
    if (this.toast && message.action) {
      const resourceNames: Record<string, string> = {
        users: 'User',
        customers: 'Customer',
        products: 'Produk',
        'service-tickets': 'Tiket Servis',
        suppliers: 'Supplier',
        transactions: 'Transaksi',
        roles: 'Role'
      };
      
      const actionNames = {
        create: 'ditambahkan',
        update: 'diperbarui',
        delete: 'dihapus'
      };

      const resourceName = resourceNames[message.resource] || message.resource;
      const actionName = actionNames[message.action] || message.action;

      this.toast({
        title: "Data Diperbarui",
        description: `${resourceName} telah ${actionName}`,
        duration: 3000
      });
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export const websocketManager = new WebSocketManager();

// React hook for easy WebSocket integration
export function useWebSocket() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const connect = () => {
    websocketManager.connect(queryClient, toast);
  };

  const disconnect = () => {
    websocketManager.disconnect();
  };

  return {
    connect,
    disconnect,
    isConnected: websocketManager.isConnected()
  };
}