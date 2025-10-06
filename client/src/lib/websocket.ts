import { useCallback } from 'react';
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
  private maxReconnectAttemptsPerUrl = 3;
  private reconnectInterval = 3000;
  private isConnecting = false;
  private queryClient: any = null;
  private toast: any = null;
  private connectionUrls: string[] = [];
  private currentUrlIndex = 0;

  private resolveWebSocketUrls(): string[] {
    const DEFAULT_WS_PATH = '/api/ws';
    const envWsUrl = (import.meta.env.VITE_WS_URL as string | undefined)?.trim();
    const envApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
    const fallbackProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

    const ensureWsPath = (value: string, allowCustomPath = false): string => {
      try {
        const url = new URL(value);
        const trimmedPath = url.pathname.replace(/\/+$/, '');

        if (!trimmedPath || trimmedPath === '/') {
          url.pathname = DEFAULT_WS_PATH;
        } else if (!allowCustomPath && !trimmedPath.endsWith('/ws')) {
          url.pathname = `${trimmedPath}/ws`;
        }

        return url.toString();
      } catch (error) {
        console.warn('Unable to normalize websocket path, using raw value:', error);
        return value;
      }
    };

    const normalizeWsUrl = (value: string, allowCustomPath = false): string | null => {
      if (!value) return null;

      const trimmed = value.trim();
      if (!trimmed) return null;

      const hasScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed);

      try {
        if (hasScheme) {
          const parsed = new URL(trimmed);
          if (parsed.protocol === 'ws:' || parsed.protocol === 'wss:') {
            return ensureWsPath(parsed.toString(), allowCustomPath);
          }

          if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            parsed.protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
            return ensureWsPath(parsed.toString(), allowCustomPath);
          }
        }
      } catch (error) {
        console.warn('Unable to parse websocket URL, falling back to heuristics:', error);
      }

      if (trimmed.startsWith('//')) {
        return ensureWsPath(`${fallbackProtocol}${trimmed}`, allowCustomPath);
      }

      if (/^[\w.-]+:\d+(\/.*)?$/.test(trimmed)) {
        return ensureWsPath(`${fallbackProtocol}//${trimmed}`, allowCustomPath);
      }

      if (trimmed.startsWith('/')) {
        return ensureWsPath(`${fallbackProtocol}//${window.location.host}${trimmed}`, allowCustomPath);
      }

      if (trimmed.includes('/')) {
        return ensureWsPath(`${fallbackProtocol}//${window.location.host}/${trimmed.replace(/^\/+/, '')}`, allowCustomPath);
      }

      return ensureWsPath(`${fallbackProtocol}//${trimmed}`, allowCustomPath);
    };

    const urlCandidates = new Set<string>();

    const addUrlCandidate = (value: string | null | undefined, allowCustomPath = false) => {
      if (!value) return;

      try {
        const normalized = ensureWsPath(value, allowCustomPath);
        urlCandidates.add(normalized);
      } catch (error) {
        console.warn('Skipping invalid WebSocket URL candidate:', value, error);
      }
    };

    const normalizedEnvWsUrl = envWsUrl ? normalizeWsUrl(envWsUrl, true) : null;
    if (normalizedEnvWsUrl) {
      urlCandidates.add(normalizedEnvWsUrl);
    }

    if (envApiUrl) {
      try {
        const apiUrl = new URL(envApiUrl, window.location.href);
        const wsUrl = new URL(apiUrl.toString());
        wsUrl.protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';

        const apiPath = apiUrl.pathname.replace(/\/+$/, '');
        if (apiPath && apiPath !== '/') {
          wsUrl.pathname = `${apiPath}/ws`;
        } else {
          wsUrl.pathname = DEFAULT_WS_PATH;
        }

        wsUrl.search = '';
        wsUrl.hash = '';

        urlCandidates.add(wsUrl.toString());
      } catch (error) {
        console.warn('Unable to parse VITE_API_URL for websocket usage:', error);
      }
    }

    const currentHostUrl = `${fallbackProtocol}//${window.location.host}`;
    addUrlCandidate(currentHostUrl);

    // Handle common development scenarios where the frontend runs on the Vite dev server
    const devServerPorts = new Set(['5173', '4173', '4174', '4175']);
    if (devServerPorts.has(window.location.port)) {
      const hostname = window.location.hostname || 'localhost';
      ['3000', '5000'].forEach((port) => {
        addUrlCandidate(`${fallbackProtocol}//${hostname}:${port}`);
      });
    }

    // As a final fallback, try the hostname without an explicit port (useful behind proxies)
    if (window.location.hostname) {
      addUrlCandidate(`${fallbackProtocol}//${window.location.hostname}`);
    }

    return Array.from(urlCandidates, (value) => ensureWsPath(value, true));
  }

  private notifyConnectionFailure() {
    if (!this.toast) return;

    this.toast({
      title: 'Gagal terhubung ke pembaruan real-time',
      description: 'Sistem akan tetap berjalan tanpa sinkronisasi waktu nyata.',
    });
  }

  connect(queryClient: any, toast: any) {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.queryClient = queryClient;
    this.toast = toast;
    this.connectionUrls = this.resolveWebSocketUrls();
    this.currentUrlIndex = 0;
    this.reconnectAttempts = 0;

    if (this.connectionUrls.length === 0) {
      console.error('No valid WebSocket URLs resolved');
      this.notifyConnectionFailure();
      return;
    }

    this.connectToCurrentUrl();
  }

  private connectToCurrentUrl() {
    const wsUrl = this.connectionUrls[this.currentUrlIndex];
    this.isConnecting = true;

    console.log('🔄 Connecting to WebSocket...', wsUrl);

    try {
      this.ws = new WebSocket(wsUrl);
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
      this.handleReconnectFailure();
      return;
    }

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

      if (!this.handleReconnectFailure()) {
        this.notifyConnectionFailure();
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.isConnecting = false;
      if (!this.handleReconnectFailure()) {
        this.notifyConnectionFailure();
      }
    };
  }

  private handleReconnectFailure(): boolean {
    if (!this.connectionUrls.length) {
      return false;
    }

    if (this.reconnectAttempts < this.maxReconnectAttemptsPerUrl) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttemptsPerUrl} for ${this.connectionUrls[this.currentUrlIndex]}`);
    } else if (this.currentUrlIndex < this.connectionUrls.length - 1) {
      this.currentUrlIndex++;
      this.reconnectAttempts = 0;
      console.log('🔁 Switching to fallback WebSocket URL:', this.connectionUrls[this.currentUrlIndex]);
    } else {
      return false;
    }

    setTimeout(() => this.connectToCurrentUrl(), this.reconnectInterval);
    return true;
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
      'warranty-claims': ['/api/warranty-claims'],
      roles: ['/api/roles'],
      dashboard: ['/api/dashboard/stats'],
      whatsapp: ['/api/whatsapp/status'],
      inventory: ['/api/products', '/api/categories', '/api/reports/stock-movements'],
      'purchase-orders': ['/api/purchase-orders', '/api/purchase-orders/outstanding-items'],
      'purchase_orders': ['/api/purchase-orders', '/api/purchase-orders/outstanding-items'],
      'purchase_order_items': ['/api/purchase-orders', '/api/purchase-orders/outstanding-items'],
      'stock-movements': ['/api/reports/stock-movements', '/api/products'],
      'saas-clients': ['/api/admin/saas/clients', '/api/admin/clients', '/api/admin/saas/stats', '/api/admin/stats'],
      'saas-plans': ['/api/admin/saas/plans', '/api/admin/plans']
    };

    // Invalidate relevant queries to trigger refetch
    const queryKeys = queryKeyMap[message.resource] || [];

    queryKeys.forEach(queryKey => {
      this.queryClient.invalidateQueries({ queryKey: [queryKey] });
    });

    // Handle dynamic invalidations that depend on payload data
    if (message.resource === 'purchase_order_items' && message.data?.purchaseOrderId) {
      this.queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders', message.data.purchaseOrderId, 'items'] });
    }

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
        categories: 'Kategori',
        inventory: 'Inventaris',
        'service-tickets': 'Tiket Servis',
        suppliers: 'Supplier',
        transactions: 'Transaksi',
        'warranty-claims': 'Garansi',
        roles: 'Role',
        whatsapp: 'WhatsApp',
        'purchase-orders': 'Purchase Order',
        'purchase_orders': 'Purchase Order',
        'purchase_order_items': 'Item Purchase Order',
        'stock-movements': 'Pergerakan Stok',
        'saas-clients': 'Client SaaS',
        'saas-plans': 'Paket SaaS'
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
    this.reconnectAttempts = 0;
    this.currentUrlIndex = 0;
    this.connectionUrls = [];
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

  const connect = useCallback(() => {
    websocketManager.connect(queryClient, toast);
  }, [queryClient, toast]);

  const disconnect = useCallback(() => {
    websocketManager.disconnect();
  }, []);

  return {
    connect,
    disconnect,
    isConnected: websocketManager.isConnected()
  };
}