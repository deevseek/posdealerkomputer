import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

interface ClientConnection {
  ws: WebSocket;
  tenantId?: string;
  userId?: string;
}

export class RealtimeService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ClientConnection> = new Map();

  initialize(server: Server) {
    console.log('🔄 Initializing WebSocket server for real-time updates...');
    
    this.wss = new WebSocketServer({
      server,
      path: '/api/ws'
    });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientId = this.generateClientId();
      console.log(`🔌 WebSocket client connected: ${clientId}`);

      this.clients.set(clientId, { ws });

      // Handle authentication and tenant setup
      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'auth') {
            const client = this.clients.get(clientId);
            if (client) {
              client.tenantId = message.tenantId;
              client.userId = message.userId;
              console.log(`✅ Client ${clientId} authenticated for tenant: ${message.tenantId}`);
              
              // Send acknowledgment
              ws.send(JSON.stringify({
                type: 'auth_success',
                clientId
              }));
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.log(`🔌 WebSocket client disconnected: ${clientId}`);
        this.clients.delete(clientId);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
        this.clients.delete(clientId);
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        clientId,
        message: 'Real-time connection established'
      }));
    });

    console.log('✅ WebSocket server initialized');
  }

  // Broadcast data change to all clients of a tenant
  broadcastToTenant(tenantId: string | undefined, event: {
    resource: string;
    action: 'create' | 'update' | 'delete';
    data?: any;
    id?: string;
  }) {
    if (!this.wss) return;

    const message = JSON.stringify({
      type: 'data_update',
      timestamp: new Date().toISOString(),
      ...event
    });

    let sentCount = 0;
    
    this.clients.forEach((client, clientId) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        // Send to all clients if no tenant specified, or matching tenant clients
        if (!tenantId || client.tenantId === tenantId) {
          client.ws.send(message);
          sentCount++;
        }
      } else {
        // Clean up dead connections
        this.clients.delete(clientId);
      }
    });

    console.log(`📡 Broadcasted ${event.resource} ${event.action} to ${sentCount} clients`);
  }

  // Broadcast to all clients (for global updates)
  broadcast(event: any) {
    this.broadcastToTenant(undefined, event);
  }

  // Get connected clients count
  getConnectedClientsCount(tenantId?: string): number {
    if (!tenantId) {
      return this.clients.size;
    }
    
    return Array.from(this.clients.values())
      .filter(client => client.tenantId === tenantId).length;
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const realtimeService = new RealtimeService();