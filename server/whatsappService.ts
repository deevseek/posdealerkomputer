import { makeWASocket, DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import { storage } from './storage';

export class WhatsAppService {
  private socket: any = null;
  private isConnecting = false;
  private qrCode: string | null = null;
  private connectionState: string = 'close';
  private heartbeatInterval: NodeJS.Timeout | null = null;

  async initialize() {
    if (this.isConnecting) {
      console.log('WhatsApp already connecting...');
      return;
    }

    this.isConnecting = true;
    console.log('🔌 Initializing WhatsApp connection...');
    
    try {
      // Use file-based auth state
      const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
      
      // Create proper logger with required methods
      const logger = {
        level: 'silent',
        error: () => {},
        warn: () => {},
        info: () => {},
        debug: () => {},
        trace: () => {},
        child: () => logger,
      };

      this.socket = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: logger as any,
      });

      // Connection updates
      this.socket.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
          this.qrCode = qr;
          qrcode.generate(qr, { small: true });
          console.log('QR Code updated');
          await this.updateQRInDatabase();
        }

        if (connection === 'close') {
          this.connectionState = 'close';
          const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
          console.log('Connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
          
          if (shouldReconnect) {
            setTimeout(() => this.initialize(), 3000);
          } else {
            console.log('WhatsApp logged out');
            this.qrCode = null;
            await this.clearQRFromDatabase();
          }
          
          this.isConnecting = false;
          await this.updateConnectionStatus(false);
        } else if (connection === 'open') {
          this.connectionState = 'open';
          this.isConnecting = false;
          this.qrCode = null;
          console.log('✅ WhatsApp connected successfully');
          await this.updateConnectionStatus(true);
          await this.clearQRFromDatabase();
          
          // Start connection health monitoring
          this.startConnectionMonitoring();
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


  async sendMessage(phoneNumber: string, message: string): Promise<boolean> {
    // Enhanced connection checking
    console.log(`WhatsApp sendMessage attempt: socket=${!!this.socket}, connectionState=${this.connectionState}, isConnecting=${this.isConnecting}`);
    
    if (!this.socket || this.connectionState !== 'open') {
      console.log(`WhatsApp not ready - Socket: ${!!this.socket}, State: ${this.connectionState}, Connecting: ${this.isConnecting}`);
      
      // Auto-reconnect if disconnected but not already connecting
      if (!this.isConnecting && this.connectionState === 'close') {
        console.log('Attempting WhatsApp auto-reconnect...');
        await this.initialize(); // Wait for reconnection attempt
        
        // Check again after reconnection attempt
        if (this.connectionState === 'open' && this.socket) {
          console.log('WhatsApp reconnected successfully, retrying message send...');
        } else {
          console.log('WhatsApp reconnection failed, message cannot be sent');
          return false;
        }
      } else {
        return false;
      }
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
      
      console.log(`Sending WhatsApp to ${formattedNumber} (original: ${phoneNumber})`);
      await this.socket.sendMessage(jid, { text: message });
      console.log(`✅ WhatsApp message sent successfully to ${phoneNumber}`);
      return true;
    } catch (error) {
      console.error('❌ Error sending WhatsApp message:', error);
      
      // Check if connection lost during send
      if (this.connectionState !== 'open') {
        console.log('Connection lost during send, marking as disconnected');
        await this.updateConnectionStatus(false);
      }
      
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
  async sendServiceCreatedNotification(customerPhone: string, serviceTicket: any, customer: any, storeConfig: any): Promise<boolean> {
    console.log(`📧 Attempting to send service creation notification to ${customerPhone} for ticket ${serviceTicket.ticketNumber}`);
    // Dynamic domain detection for different deployment scenarios
    const getBaseUrl = () => {
      // Check for custom domain environment variable (untuk ngrok, cloudflare, dll)
      if (process.env.PUBLIC_URL) {
        return process.env.PUBLIC_URL;
      }
      
      // Check for Replit domains
      if (process.env.REPLIT_DOMAINS?.split(',')[0]) {
        return 'https://' + process.env.REPLIT_DOMAINS.split(',')[0];
      }
      
      // Check for custom app URL (untuk ngrok dll)
      if (process.env.APP_URL) {
        return process.env.APP_URL;
      }
      
      // Check for ngrok URL pattern in environment
      if (process.env.NGROK_URL) {
        return process.env.NGROK_URL;
      }
      
      // Fallback to localhost with current port
      const port = process.env.PORT || '5000';
      return `http://localhost:${port}`;
    };
    
    const statusUrl = `${getBaseUrl()}/service-status`;
    
    // Format estimated cost
    const formatCurrency = (amount: string | number) => {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(Number(amount));
    };

    // Format received date
    const receivedDate = new Date(serviceTicket.createdAt).toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Status label
    const statusLabels = {
      'pending': 'Menunggu Pemeriksaan',
      'checking': 'Sedang Dicek',
      'in-progress': 'Sedang Dikerjakan',
      'waiting-parts': 'Menunggu Sparepart',
      'waiting-payment': 'Menunggu Pembayaran',
      'completed': 'Selesai',
      'delivered': 'Sudah Diambil',
      'cancelled': 'Dibatalkan'
    };

    // Build spare parts info if available
    let sparepartsInfo = '';
    if (serviceTicket.parts && serviceTicket.parts.length > 0) {
      sparepartsInfo = `\n\n📦 **SPAREPART YANG DIPERLUKAN:**`;
      serviceTicket.parts.forEach((part: any, index: number) => {
        sparepartsInfo += `\n${index + 1}. ${part.name}`;
        sparepartsInfo += `\n   • Jumlah: ${part.quantity} unit`;
        sparepartsInfo += `\n   • Harga: ${formatCurrency(part.unitPrice)}`;
        if (part.description) {
          sparepartsInfo += `\n   • Keterangan: ${part.description}`;
        }
      });
      
      const totalParts = serviceTicket.parts.reduce((sum: number, part: any) => 
        sum + (Number(part.quantity) * Number(part.unitPrice)), 0
      );
      sparepartsInfo += `\n\n💰 **Total Sparepart:** ${formatCurrency(totalParts)}`;
    }

    const message = `🔧 **KONFIRMASI PENERIMAAN SERVICE**

Halo ${customer.name},

Service laptop Anda telah kami terima dengan detail lengkap sebagai berikut:

📋 **INFORMASI SERVICE:**
📝 Nomor Service: *${serviceTicket.ticketNumber}*
📅 Tanggal Diterima: ${receivedDate}
⏰ Status Saat Ini: *${statusLabels[serviceTicket.status as keyof typeof statusLabels] || 'Menunggu'}*

💻 **DETAIL PERANGKAT:**
🏷️ Jenis: ${serviceTicket.deviceType}
${serviceTicket.deviceBrand ? `🏭 Merk: ${serviceTicket.deviceBrand}` : ''}
${serviceTicket.deviceModel ? `📱 Model: ${serviceTicket.deviceModel}` : ''}
${serviceTicket.serialNumber ? `🔢 Serial Number: ${serviceTicket.serialNumber}` : ''}

🔍 **KELUHAN & MASALAH:**
${serviceTicket.problem}

${serviceTicket.symptoms ? `🩺 **GEJALA YANG DIALAMI:**\n${serviceTicket.symptoms}\n\n` : ''}
${serviceTicket.notes ? `📌 **CATATAN TEKNISI:**\n${serviceTicket.notes}\n\n` : ''}
💰 **ESTIMASI BIAYA SERVICE:**
${serviceTicket.estimatedCost ? formatCurrency(serviceTicket.estimatedCost) : 'Akan diberitahu setelah pemeriksaan'}
${sparepartsInfo}

📞 **INFORMASI KONTAK:**
👤 Customer: ${customer.name}
📱 Telepon: ${customer.phone}
${customer.email ? `📧 Email: ${customer.email}` : ''}
${customer.address ? `🏠 Alamat: ${customer.address}` : ''}

🔍 **CEK STATUS SERVICE:**
Anda dapat memantau perkembangan service kapan saja melalui:
${statusUrl}?ticket=${serviceTicket.ticketNumber}
*Klik link di atas untuk langsung melihat status service Anda*

⚠️ **PENTING:**
• Harap simpan nomor service untuk tracking
• Kami akan menghubungi jika ada update penting
• Estimasi waktu pengerjaan: ${serviceTicket.estimatedDays ? serviceTicket.estimatedDays + ' hari' : '3-7 hari kerja'}
• Bawa tanda terima saat pengambilan

Terima kasih telah mempercayakan perangkat Anda kepada kami. Kami akan memberikan pelayanan terbaik untuk memperbaiki laptop Anda.

---
🏪 **${storeConfig?.name || 'LaptopPOS Service Center'}**
📍 ${storeConfig?.address || 'Alamat Toko'}
📞 ${storeConfig?.phone || 'Telepon Toko'}
${storeConfig?.email ? `📧 ${storeConfig.email}` : ''}`;

    try {
      const result = await this.sendMessage(customerPhone, message);
      console.log(`📧 Service creation notification ${result ? 'sent successfully' : 'failed'} to ${customerPhone}`);
      return result;
    } catch (error) {
      console.error(`❌ Service creation notification error for ${customerPhone}:`, error);
      return false;
    }
  }

  async sendServiceStatusNotification(customerPhone: string, serviceTicket: any, customer: any, storeConfig: any): Promise<boolean> {
    console.log(`🔄 Attempting to send status update notification to ${customerPhone} for ticket ${serviceTicket.ticketNumber}, status: ${serviceTicket.status}`);
    // Format currency
    const formatCurrency = (amount: string | number) => {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(Number(amount));
    };

    // Format update date
    const updateDate = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    let statusText = '';
    let emoji = '';
    let nextSteps = '';
    
    switch (serviceTicket.status) {
      case 'checking':
        statusText = 'SEDANG DICEK';
        emoji = '🔍';
        nextSteps = 'Tim teknisi kami sedang memeriksa perangkat Anda untuk menentukan kerusakan dan solusi yang tepat.';
        break;
      case 'in-progress':
        statusText = 'SEDANG DIKERJAKAN';
        emoji = '🔧';
        nextSteps = 'Perangkat Anda sedang dalam proses perbaikan. Tim teknisi kami bekerja untuk menyelesaikan masalah.';
        break;
      case 'completed':
        statusText = 'SELESAI DIKERJAKAN';
        emoji = '✅';
        nextSteps = 'Perbaikan telah selesai! Perangkat siap diambil. Silakan datang ke toko dengan membawa tanda terima.';
        break;
      case 'cancelled':
        statusText = 'DIBATALKAN';
        emoji = '❌';
        nextSteps = 'Service dibatalkan sesuai permintaan. Jika ada pertanyaan, silakan hubungi kami.';
        break;
      case 'waiting-parts':
        statusText = 'MENUNGGU SPAREPART';
        emoji = '📦';
        nextSteps = 'Kami sedang memesan sparepart yang diperlukan. Akan ada update setelah sparepart tersedia.';
        break;
      case 'waiting-payment':
        statusText = 'MENUNGGU PEMBAYARAN';
        emoji = '💳';
        nextSteps = 'Perbaikan selesai, silakan lakukan pembayaran untuk mengambil perangkat.';
        break;
      case 'waiting-confirmation':
        statusText = 'MENUNGGU KONFIRMASI';
        emoji = '❓';
        nextSteps = 'Kami memerlukan konfirmasi dari Anda untuk melanjutkan perbaikan. Silakan hubungi kami.';
        break;
      case 'testing':
        statusText = 'SEDANG TES';
        emoji = '🧪';
        nextSteps = 'Sedang dilakukan pengujian untuk memastikan perbaikan berfungsi dengan baik.';
        break;
      default:
        statusText = 'DIUPDATE';
        emoji = '🔄';
        nextSteps = 'Status service Anda telah diperbarui. Silakan cek detail lengkap melalui link di bawah.';
    }

    // Dynamic domain detection for different deployment scenarios
    const getBaseUrl = () => {
      // Check for custom domain environment variable (untuk ngrok, cloudflare, dll)
      if (process.env.PUBLIC_URL) {
        return process.env.PUBLIC_URL;
      }
      
      // Check for Replit domains
      if (process.env.REPLIT_DOMAINS?.split(',')[0]) {
        return 'https://' + process.env.REPLIT_DOMAINS.split(',')[0];
      }
      
      // Check for custom app URL (untuk ngrok dll)
      if (process.env.APP_URL) {
        return process.env.APP_URL;
      }
      
      // Check for ngrok URL pattern in environment
      if (process.env.NGROK_URL) {
        return process.env.NGROK_URL;
      }
      
      // Fallback to localhost with current port
      const port = process.env.PORT || '5000';
      return `http://localhost:${port}`;
    };
    
    const statusUrl = `${getBaseUrl()}/service-status`;
    
    // Build diagnosis and solution info
    let progressInfo = '';
    if (serviceTicket.diagnosis) {
      progressInfo += `\n🔍 **HASIL DIAGNOSIS:**\n${serviceTicket.diagnosis}`;
    }
    if (serviceTicket.solution) {
      progressInfo += `\n\n🔧 **SOLUSI PERBAIKAN:**\n${serviceTicket.solution}`;
    }
    if (serviceTicket.actualCost && serviceTicket.actualCost > 0) {
      progressInfo += `\n\n💰 **BIAYA AKTUAL:**\n${formatCurrency(serviceTicket.actualCost)}`;
    }

    // Completion info for completed status
    let completionInfo = '';
    if (serviceTicket.status === 'completed' && serviceTicket.completedAt) {
      const completedDate = new Date(serviceTicket.completedAt).toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      completionInfo = `\n\n✅ **WAKTU SELESAI:** ${completedDate}`;
    }

    const message = `${emoji} **UPDATE STATUS SERVICE**\n\nHalo ${customer.name},\n\nAda update untuk service laptop Anda:\n\n📋 **INFORMASI SERVICE:**\n📝 Nomor Service: *${serviceTicket.ticketNumber}*\n📅 Update Terakhir: ${updateDate}\n⏰ Status: *${statusText}*\n\n💻 **PERANGKAT:**\n${serviceTicket.deviceType}${serviceTicket.deviceBrand ? ` - ${serviceTicket.deviceBrand}` : ''}${serviceTicket.deviceModel ? ` ${serviceTicket.deviceModel}` : ''}\n\n🔍 **MASALAH:**\n${serviceTicket.problem}${progressInfo}${completionInfo}\n\n💬 **LANGKAH SELANJUTNYA:**\n${nextSteps}\n\n🔍 **CEK STATUS DETAIL:**\nUntuk informasi lebih lengkap, kunjungi:\n${statusUrl}?ticket=${serviceTicket.ticketNumber}\n\n${serviceTicket.status === 'completed' ? '⚠️ **PENTING:** Harap bawa tanda terima saat pengambilan!' : '📞 **INFO:** Kami akan update jika ada perkembangan baru.'}\n\n---\n🏪 **${storeConfig?.name || 'LaptopPOS Service Center'}**\n📞 ${storeConfig?.phone || 'Telepon Toko'}`;

    try {
      const result = await this.sendMessage(customerPhone, message);
      console.log(`🔄 Status update notification ${result ? 'sent successfully' : 'failed'} to ${customerPhone}`);
      return result;
    } catch (error) {
      console.error(`❌ Status update notification error for ${customerPhone}:`, error);
      return false;
    }
  }

  private startConnectionMonitoring() {
    // Clear existing heartbeat if any
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Check connection every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      if (this.connectionState !== 'open' && !this.isConnecting) {
        console.log('🩺 WhatsApp connection lost, attempting reconnection...');
        this.initialize();
      }
    }, 30000);
  }

  async disconnect() {
    // Clear heartbeat monitoring
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.socket) {
      await this.socket.logout();
      this.socket = null;
    }
    await this.updateConnectionStatus(false);
    await this.clearQRFromDatabase();
  }
}

export const whatsappService = new WhatsAppService();