import makeWASocket, { DisconnectReason, useMultiFileAuthState, ConnectionState } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import { storage } from './storage';

export class WhatsAppService {
  private socket: any = null;
  private isConnecting = false;
  private qrCode: string | null = null;
  private connectionState: string = 'close';

  async initialize() {
    if (this.isConnecting || this.socket) {
      return;
    }

    try {
      this.isConnecting = true;
      
      // Use memory-based auth state for simplicity
      const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

      this.socket = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        browser: ['LaptopPOS', 'Chrome', '1.0.0'],
      });

      // Handle connection events
      this.socket.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect, qr } = update;
        
        this.connectionState = connection;
        
        if (qr) {
          // Generate QR code
          this.qrCode = await QRCode.toDataURL(qr);
          await this.updateQRInDatabase();
        }

        if (connection === 'close') {
          await this.updateConnectionStatus(false);
          
          const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
          console.log('Connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
          
          if (shouldReconnect) {
            this.socket = null;
            this.isConnecting = false;
            setTimeout(() => this.initialize(), 3000);
          }
        } else if (connection === 'open') {
          console.log('WhatsApp connection opened');
          this.qrCode = null;
          await this.updateConnectionStatus(true);
          await this.clearQRFromDatabase();
        }
      });

      // Save credentials when updated
      this.socket.ev.on('creds.update', saveCreds);
      
    } catch (error) {
      console.error('WhatsApp initialization error:', error);
      this.isConnecting = false;
      await this.updateConnectionStatus(false);
    }
  }

  async disconnect() {
    if (this.socket) {
      await this.socket.logout();
      this.socket = null;
    }
    await this.updateConnectionStatus(false);
    await this.clearQRFromDatabase();
  }

  async sendMessage(phoneNumber: string, message: string): Promise<boolean> {
    if (!this.socket || this.connectionState !== 'open') {
      console.log('WhatsApp not connected, cannot send message');
      return false;
    }

    try {
      // Format phone number (add country code if not present)
      let formattedNumber = phoneNumber.replace(/\D/g, '');
      if (!formattedNumber.startsWith('62')) {
        if (formattedNumber.startsWith('0')) {
          formattedNumber = '62' + formattedNumber.substring(1);
        } else {
          formattedNumber = '62' + formattedNumber;
        }
      }
      
      const jid = formattedNumber + '@s.whatsapp.net';
      
      await this.socket.sendMessage(jid, { text: message });
      console.log(`WhatsApp message sent to ${phoneNumber}: ${message}`);
      return true;
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return false;
    }
  }

  getQRCode(): string | null {
    return this.qrCode;
  }

  isConnected(): boolean {
    return this.connectionState === 'open';
  }

  getConnectionState(): string {
    return this.connectionState;
  }

  private async updateConnectionStatus(connected: boolean) {
    try {
      const config = await storage.getStoreConfig();
      if (config) {
        await storage.upsertStoreConfig({
          ...config,
          whatsappConnected: connected,
        });
      }
    } catch (error) {
      console.error('Error updating WhatsApp connection status:', error);
    }
  }

  private async updateQRInDatabase() {
    try {
      const config = await storage.getStoreConfig();
      if (config && this.qrCode) {
        await storage.upsertStoreConfig({
          ...config,
          whatsappQR: this.qrCode,
        });
      }
    } catch (error) {
      console.error('Error updating QR code in database:', error);
    }
  }

  private async clearQRFromDatabase() {
    try {
      const config = await storage.getStoreConfig();
      if (config) {
        await storage.upsertStoreConfig({
          ...config,
          whatsappQR: null,
        });
      }
    } catch (error) {
      console.error('Error clearing QR code from database:', error);
    }
  }

  // Service notification templates
  async sendServiceCreatedNotification(customerPhone: string, customerName: string, serviceId: string, description: string) {
    const message = `Halo ${customerName},

Service laptop Anda telah kami terima dengan detail:
📝 ID Service: ${serviceId}
🔧 Deskripsi: ${description}

Kami akan segera memproses service Anda. Terima kasih telah mempercayakan laptop Anda kepada kami.

- LaptopPOS Service Center`;

    return await this.sendMessage(customerPhone, message);
  }

  async sendServiceStatusNotification(customerPhone: string, customerName: string, serviceId: string, status: string, description: string) {
    let statusText = '';
    let emoji = '';
    
    switch (status) {
      case 'in_progress':
        statusText = 'sedang dikerjakan';
        emoji = '🔧';
        break;
      case 'completed':
        statusText = 'telah selesai dikerjakan';
        emoji = '✅';
        break;
      case 'delivered':
        statusText = 'telah diserahkan';
        emoji = '📦';
        break;
      case 'cancelled':
        statusText = 'dibatalkan';
        emoji = '❌';
        break;
      default:
        statusText = status;
        emoji = '📋';
    }

    const message = `Halo ${customerName},

Update status service laptop Anda:
📝 ID Service: ${serviceId}
${emoji} Status: Service ${statusText}
🔧 Deskripsi: ${description}

${status === 'completed' ? 'Laptop Anda sudah siap diambil!' : status === 'delivered' ? 'Terima kasih telah menggunakan layanan kami!' : ''}

- LaptopPOS Service Center`;

    return await this.sendMessage(customerPhone, message);
  }
}

// Global instance
export const whatsappService = new WhatsAppService();