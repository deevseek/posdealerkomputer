import type { Express, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { realtimeService } from "./realtime";
import { storage } from "./storage";
import { whatsappService } from "./whatsappService";
import QRCode from 'qrcode';
// Conditional auth import based on environment
import { isAuthenticated, authenticateUser, hashPassword } from "./auth";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";
// import htmlPdf from 'html-pdf-node';  // Removed due to Chromium dependencies issues
import XLSX from 'xlsx';
import multer from 'multer';
import { db } from "./db";
import { eq, and, gte, lte, lt, desc, count, sql, isNull, inArray, or } from "drizzle-orm";
import {
  products,
  categories, 
  customers,
  suppliers,
  transactions,
  transactionItems,
  serviceTickets,
  serviceTicketParts,
  stockMovements,
  purchaseOrders,
  financialRecords,
  storeConfig,
  roles,
  users,
  employees,
  payrollRecords,
  attendanceRecords,
  insertTransactionSchema,
  insertTransactionItemSchema,
  insertServiceTicketSchema,
  warrantyClaims,
  insertWarrantyClaimSchema
} from "@shared/schema";

import { resolveSubscriptionPlanSlug, getSubscriptionPlanDisplayName } from "@shared/saas-utils";
import {
  plans,
  clients,
  subscriptions,
  payments,
  resolvePlanConfiguration,
  safeParseJson,
  ensurePlanCode,
} from "@shared/saas-schema";
import {
  getCurrentJakartaTime,
  toJakartaTime,
  formatDateForDatabase,
  formatDateForDisplay,
  formatDateShort,
  parseWithTimezone,
  getStartOfDayJakarta,
  getEndOfDayJakarta,
  createJakartaTimestamp,
  createDatabaseTimestamp
} from "@shared/utils/timezone";

const sanitizeOptionalText = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

// HTML template generator for PDF reports
function generateReportHTML(reportData: any, startDate: string, endDate: string): string {
  const { salesReport, serviceReport, financialReport, inventoryReport } = reportData;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Laporan Bisnis</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #4F46E5; padding-bottom: 20px; }
        .header h1 { color: #4F46E5; margin: 0; font-size: 28px; }
        .header p { margin: 5px 0; color: #666; }
        .period { background: #F3F4F6; padding: 15px; border-radius: 8px; margin-bottom: 25px; text-align: center; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #4F46E5; border-bottom: 1px solid #E5E7EB; padding-bottom: 8px; }
        .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0; }
        .stat-card { background: #F9FAFB; padding: 15px; border-radius: 8px; border-left: 4px solid #4F46E5; }
        .stat-card h3 { margin: 0 0 8px 0; color: #6B7280; font-size: 14px; }
        .stat-card .value { font-size: 24px; font-weight: bold; color: #111827; }
        .breakdown { margin: 15px 0; }
        .breakdown-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #E5E7EB; }
        .table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #E5E7EB; }
        .table th { background: #F9FAFB; font-weight: 600; color: #374151; }
        .income { color: #059669; }
        .expense { color: #DC2626; }
        .footer { margin-top: 40px; text-align: center; color: #6B7280; font-size: 12px; border-top: 1px solid #E5E7EB; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>LaptopPOS - Laporan Bisnis</h1>
        <p>Sistem Manajemen Penjualan & Servis Laptop</p>
      </div>
      
      <div class="period">
        <strong>Periode Laporan: ${formatDateShort(startDate)} - ${formatDateShort(endDate)}</strong>
      </div>
      
      <div class="section">
        <h2>📊 Ringkasan Keuangan</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <h3>Total Penjualan</h3>
            <div class="value">Rp ${Number(salesReport?.totalSales || 0).toLocaleString('id-ID')}</div>
          </div>
          <div class="stat-card">
            <h3>Omset Servis</h3>
            <div class="value">Rp ${Number(serviceReport?.totalRevenue || 0).toLocaleString('id-ID')}</div>
          </div>
          <div class="stat-card">
            <h3>Total Pemasukan</h3>
            <div class="value income">Rp ${Number(financialReport?.totalIncome || 0).toLocaleString('id-ID')}</div>
          </div>
          <div class="stat-card">
            <h3>Total Pengeluaran</h3>
            <div class="value expense">Rp ${Number(financialReport?.totalExpense || 0).toLocaleString('id-ID')}</div>
          </div>
        </div>
        
        <div class="stat-card" style="margin-top: 20px;">
          <h3>Laba Penjualan (Harga Jual - HPP)</h3>
          <div class="value income">Rp ${Number(financialReport?.profit || 0).toLocaleString('id-ID')}</div>
          <p style="margin-top: 8px; font-size: 12px; color: #6B7280;">
            Harga jual produk: Rp ${Number(financialReport?.totalSalesRevenue || 0).toLocaleString('id-ID')} • HPP: Rp ${Number(financialReport?.totalCOGS || 0).toLocaleString('id-ID')}
          </p>
          <p style="margin-top: 4px; font-size: 12px; color: #6B7280;">
            Laba bersih (pendapatan - pengeluaran): Rp ${Number(financialReport?.netProfit || 0).toLocaleString('id-ID')}
          </p>
        </div>
      </div>
      
      <div class="section">
        <h2>🔧 Laporan Servis</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <h3>Total Servis</h3>
            <div class="value">${serviceReport?.totalServices || 0} tiket</div>
          </div>
          <div class="stat-card">
            <h3>Modal Parts</h3>
            <div class="value expense">Rp ${Number(serviceReport?.totalCost || 0).toLocaleString('id-ID')}</div>
          </div>
        </div>
        
        <div class="breakdown">
          <h3>Breakdown Revenue Servis:</h3>
          <div class="breakdown-item">
            <span>Revenue Labor:</span>
            <span class="income">Rp ${Number(serviceReport?.revenueBreakdown?.laborRevenue || 0).toLocaleString('id-ID')}</span>
          </div>
          <div class="breakdown-item">
            <span>Revenue Parts:</span>
            <span class="income">Rp ${Number(serviceReport?.revenueBreakdown?.partsRevenue || 0).toLocaleString('id-ID')}</span>
          </div>
          <div class="breakdown-item" style="font-weight: bold;">
            <span>Laba Servis:</span>
            <span class="income">Rp ${Number(serviceReport?.totalProfit || 0).toLocaleString('id-ID')}</span>
          </div>
        </div>
      </div>
      
      <div class="section">
        <h2>📦 Laporan Inventory</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <h3>Total Produk</h3>
            <div class="value">${inventoryReport?.totalProducts || 0}</div>
          </div>
          <div class="stat-card">
            <h3>Stok Rendah</h3>
            <div class="value expense">${inventoryReport?.lowStockCount || 0}</div>
          </div>
          <div class="stat-card">
            <h3>Total Stok</h3>
            <div class="value">${inventoryReport?.totalStockQuantity || 0}</div>
          </div>
          <div class="stat-card">
            <h3>Nilai Aset</h3>
            <div class="value">Rp ${Number(inventoryReport?.totalAssetValue || 0).toLocaleString('id-ID')}</div>
          </div>
        </div>
      </div>
      
      <div class="footer">
        <p>Laporan digenerate otomatis oleh LaptopPOS System pada ${formatDateForDisplay(getCurrentJakartaTime(), 'dd/MM/yyyy HH:mm:ss')}</p>
        <p>© 2025 LaptopPOS - Sistem Manajemen Bisnis Laptop</p>
      </div>
    </body>
    </html>
  `;
}

// Additional schemas import
import { 
  insertProductSchema,
  insertCustomerSchema,
  insertSupplierSchema,
  insertStockMovementSchema,
  insertFinancialRecordSchema,
  insertCategorySchema,
  insertStoreConfigSchema,
  insertRoleSchema,
  insertUserSchema,
  generateSKU,
  generateBarcode
} from "@shared/schema";
import { z } from "zod";

// Import service cancellation validation
import { 
  serviceCancellationSchema, 
  validateCancellationBusinessRules 
} from "@shared/service-cancellation-schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure multer for file uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      // Accept only Excel files
      if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          file.mimetype === 'application/vnd.ms-excel') {
        cb(null, true);
      } else {
        cb(new Error('Only Excel files are allowed!') as any, false);
      }
    }
  });

  // Auth middleware
  // Always use local authentication for universal deployment compatibility
  const { setupAuth } = await import('./auth');
  await setupAuth(app);

  // Auth routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }

      const user = await authenticateUser({ username, password });
      if (!user) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }

      // Store user in session
      req.session.user = user;
      
      res.json({ user, message: 'Login successful' });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ message: 'Failed to logout' });
      }
      res.clearCookie('connect.sid');
      res.json({ message: 'Logout successful' });
    });
  });

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      // User is already available in session
      res.json(req.session.user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard routes
  app.get('/api/dashboard/stats', isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Reports API endpoints
  app.get('/api/reports/sales/:startDate/:endDate', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.params;
      const start = getStartOfDayJakarta(parseWithTimezone(startDate, false));
      const end = getEndOfDayJakarta(parseWithTimezone(endDate, false));
      
      const report = await storage.getSalesReport(start, end);
      res.json(report);
    } catch (error) {
      console.error("Error fetching sales report:", error);
      res.status(500).json({ message: "Failed to fetch sales report" });
    }
  });

  app.get('/api/reports/services/:startDate/:endDate', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.params;
      const start = getStartOfDayJakarta(parseWithTimezone(startDate, false));
      const end = getEndOfDayJakarta(parseWithTimezone(endDate, false));
      
      const report = await storage.getServiceReport(start, end);
      res.json(report);
    } catch (error) {
      console.error("Error fetching service report:", error);
      res.status(500).json({ message: "Failed to fetch service report" });
    }
  });

  app.get('/api/reports/financial/:startDate/:endDate', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.params;
      const start = getStartOfDayJakarta(parseWithTimezone(startDate, false));
      const end = getEndOfDayJakarta(parseWithTimezone(endDate, false));
      
      const report = await storage.getFinancialReport(start, end);
      res.json(report);
    } catch (error) {
      console.error("Error fetching financial report:", error);
      res.status(500).json({ message: "Failed to fetch financial report" });
    }
  });

  app.get('/api/reports/inventory', isAuthenticated, async (req, res) => {
    try {
      const report = await storage.getInventoryReport();
      res.json(report);
    } catch (error) {
      console.error("Error fetching inventory report:", error);
      res.status(500).json({ message: "Failed to fetch inventory report" });
    }
  });

  // Damaged goods report - Get damaged items from warranty returns
  app.get('/api/reports/damaged-goods', isAuthenticated, async (req: any, res) => {
    try {
      // Get client ID from authenticated session for multi-tenant security
      const clientId = req.tenant?.id || req.tenant?.clientId || req.session?.user?.clientId || null;
      
      // Build where conditions for multi-tenant filtering
      const whereConditions = [
        eq(stockMovements.referenceType, 'warranty_return_damaged'),
        // Multi-tenant filtering
        clientId ? eq(stockMovements.clientId, clientId) : isNull(stockMovements.clientId)
      ];
      
      // Get damaged goods with product details and original transaction info
      const damagedGoods = await db
        .select({
          id: stockMovements.id,
          productId: stockMovements.productId,
          productName: products.name,
          productSku: products.sku,
          quantity: stockMovements.quantity,
          unitPrice: sql<string>`
            COALESCE(
              (SELECT unit_price FROM transaction_items WHERE transaction_id = ${stockMovements.referenceId} AND product_id = ${stockMovements.productId} LIMIT 1),
              ${products.sellingPrice}
            )
          `,
          totalValue: sql<string>`
            ${stockMovements.quantity} * COALESCE(
              (SELECT unit_price FROM transaction_items WHERE transaction_id = ${stockMovements.referenceId} AND product_id = ${stockMovements.productId} LIMIT 1),
              ${products.sellingPrice}
            )
          `,
          originalTransactionNumber: sql<string>`
            COALESCE(${transactions.transactionNumber}, 'TXN-' || substr(${stockMovements.referenceId}, 1, 8))
          `,
          customerName: sql<string>`
            COALESCE(${customers.name}, 'Customer')
          `,
          damagedDate: stockMovements.createdAt,
          notes: stockMovements.notes,
        })
        .from(stockMovements)
        .leftJoin(products, and(
          eq(stockMovements.productId, products.id),
          clientId ? eq(products.clientId, clientId) : isNull(products.clientId)
        ))
        .leftJoin(transactions, and(
          eq(stockMovements.referenceId, transactions.id),
          clientId ? eq(transactions.clientId, clientId) : isNull(transactions.clientId)
        ))
        .leftJoin(customers, and(
          eq(transactions.customerId, customers.id),
          clientId ? eq(customers.clientId, clientId) : isNull(customers.clientId)
        ))
        .where(and(...whereConditions))
        .orderBy(desc(stockMovements.createdAt));
      
      // Calculate total value of damaged goods
      const totalDamagedValue = damagedGoods.reduce((sum, item) => {
        return sum + Number(item.totalValue || 0);
      }, 0);
      
      res.json({
        damagedGoods,
        totalDamagedValue,
        totalItems: damagedGoods.length
      });
    } catch (error) {
      console.error('Error fetching damaged goods report:', error);
      res.status(500).json({ message: 'Failed to fetch damaged goods report' });
    }
  });

  // TEMP DEBUG ENDPOINT (No auth for debugging)
  app.get('/api/debug/stock-movements', async (req: any, res) => {
    try {
      console.log('🔍 DEBUG ENDPOINT: Stock movements debugging...');
      
      // Test 1: Count all records
      const allRecords = await db
        .select({ count: sql<number>`count(*)` })
        .from(stockMovements);
      console.log('🔍 Total records in stock_movements:', allRecords[0]?.count || 0);
      
      // Test 2: Count records with null clientId only
      const nullClientRecords = await db
        .select({ count: sql<number>`count(*)` })
        .from(stockMovements)
        .where(isNull(stockMovements.clientId));
      console.log('🔍 Records with null clientId:', nullClientRecords[0]?.count || 0);
      
      // Test 3: Get actual data with null clientId
      const actualData = await db
        .select()
        .from(stockMovements)
        .where(isNull(stockMovements.clientId))
        .limit(10);
      console.log('🔍 Sample records with null clientId:', actualData.length);
      
      return res.json({
        totalRecords: allRecords[0]?.count || 0,
        nullClientRecords: nullClientRecords[0]?.count || 0,
        sampleData: actualData
      });
    } catch (error) {
      console.error('🔍 DEBUG ERROR:', error);
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Stock movements report - Clean implementation
  app.get('/api/reports/stock-movements', isAuthenticated, async (req: any, res) => {
    try {
      // Get client ID from authenticated session for multi-tenant security
      const clientId = req.tenant?.id || req.tenant?.clientId || req.session?.user?.clientId || null;

      const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
      const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
      const productId = typeof req.query.productId === 'string' ? req.query.productId : undefined;
      const referenceType = typeof req.query.referenceType === 'string' ? req.query.referenceType : undefined;

      // Build where conditions for multi-tenant filtering and optional filters
      const whereConditions = [] as any[];

      // Multi-tenant filtering - include records owned by tenant and historical null-tenant records
      const tenantCondition = clientId
        ? or(eq(stockMovements.clientId, clientId), isNull(stockMovements.clientId))
        : isNull(stockMovements.clientId);
      whereConditions.push(tenantCondition);

      if (startDate) {
        const parsedStart = getStartOfDayJakarta(parseWithTimezone(startDate, false));
        whereConditions.push(gte(stockMovements.createdAt, parsedStart));
      }

      if (endDate) {
        const parsedEnd = getEndOfDayJakarta(parseWithTimezone(endDate, false));
        whereConditions.push(lte(stockMovements.createdAt, parsedEnd));
      }

      if (productId && productId !== 'all') {
        whereConditions.push(eq(stockMovements.productId, productId));
      }

      if (referenceType && referenceType !== 'all') {
        const referenceFilters: string[] = [];

        switch (referenceType) {
          case 'purchase':
            referenceFilters.push('purchase', 'purchase_order', 'purchase_refund', 'refund_recovery');
            break;
          case 'return':
            referenceFilters.push('return', 'warranty_return', 'warranty_return_damaged', 'warranty_exchange');
            break;
          default:
            referenceFilters.push(referenceType);
        }

        if (referenceFilters.length === 1) {
          whereConditions.push(eq(stockMovements.referenceType, referenceFilters[0]));
        } else {
          whereConditions.push(inArray(stockMovements.referenceType, referenceFilters));
        }
      }

      const whereClause = whereConditions.length ? and(...whereConditions) : undefined;

      // Get stock movements with product names and readable references
      const movementData = await db
        .select({
          id: stockMovements.id,
          productId: stockMovements.productId,
          productName: products.name,
          movementType: stockMovements.movementType, // Frontend expects 'movementType'
          quantity: stockMovements.quantity,
          unitCost: stockMovements.unitCost,
          referenceType: stockMovements.referenceType,
          reference: sql<string>`
            CASE 
              WHEN ${stockMovements.referenceType} = 'purchase' THEN 'PO#' || COALESCE(${purchaseOrders.poNumber}, substr(${stockMovements.referenceId}, 1, 8))
              WHEN ${stockMovements.referenceType} = 'sale' THEN 'Penjualan #' || COALESCE(${transactions.transactionNumber}, substr(${stockMovements.referenceId}, 1, 8))
              WHEN ${stockMovements.referenceType} = 'service' THEN 'Servis #' || COALESCE(${serviceTickets.ticketNumber}, substr(${stockMovements.referenceId}, 1, 8))
              WHEN ${stockMovements.referenceType} = 'adjustment' THEN 'Penyesuaian #' || substr(${stockMovements.referenceId}, 1, 8)
              WHEN ${stockMovements.referenceType} = 'return' THEN 'Retur #' || substr(${stockMovements.referenceId}, 1, 8)
              ELSE 'Ref #' || substr(${stockMovements.referenceId}, 1, 8)
            END
          `,
          notes: stockMovements.notes,
          createdAt: stockMovements.createdAt,
          userName: sql<string>`
            COALESCE(
              NULLIF(TRIM(COALESCE(${users.firstName}, '') || ' ' || COALESCE(${users.lastName}, '')), ''),
              ${users.username},
              'User'
            )
          `,
        })
        .from(stockMovements)
        .leftJoin(products, and(
          eq(stockMovements.productId, products.id),
          // Add clientId filtering to joined tables for complete tenant isolation
          clientId ? or(eq(products.clientId, clientId), isNull(products.clientId)) : isNull(products.clientId)
        ))
        .leftJoin(purchaseOrders, and(
          eq(stockMovements.referenceId, purchaseOrders.id),
          clientId ? or(eq(purchaseOrders.clientId, clientId), isNull(purchaseOrders.clientId)) : isNull(purchaseOrders.clientId)
        ))
        .leftJoin(transactions, and(
          eq(stockMovements.referenceId, transactions.id),
          clientId ? or(eq(transactions.clientId, clientId), isNull(transactions.clientId)) : isNull(transactions.clientId)
        ))
        .leftJoin(serviceTickets, and(
          eq(stockMovements.referenceId, serviceTickets.id),
          clientId ? or(eq(serviceTickets.clientId, clientId), isNull(serviceTickets.clientId)) : isNull(serviceTickets.clientId)
        ))
        .leftJoin(users, eq(stockMovements.userId, users.id))
        .where(whereClause)
        .orderBy(desc(stockMovements.createdAt));
      
      // Frontend expects { movements: [...] } structure
      res.json({ movements: movementData });
    } catch (error) {
      console.error('Error fetching stock movements:', error);
      res.status(500).json({ message: 'Failed to fetch stock movements' });
    }
  });

  // Export XLSX endpoint
  app.post('/api/reports/export-xlsx', isAuthenticated, async (req, res) => {
    try {
      console.log('XLSX export request received');
      const { startDate, endDate } = req.body;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }
      
      // Fetch fresh data from database instead of using cached client data
      const start = getStartOfDayJakarta(parseWithTimezone(startDate, false));
      const end = getEndOfDayJakarta(parseWithTimezone(endDate, false));
      
      const salesReport = await storage.getSalesReport(start, end);
      const serviceReport = await storage.getServiceReport(start, end);
      const financialReport = await storage.getFinancialReport(start, end);
      const inventoryReport = await storage.getInventoryReport();
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // No need for additional DB query, we'll use financialReport.records

      // Overview sheet
      const overviewData = [
        ['Laporan Bisnis LaptopPOS'],
        ['Periode', `${formatDateShort(startDate)} - ${formatDateShort(endDate)}`],
        [],
        ['Ringkasan Keuangan'],
        ['Total Penjualan', Number(salesReport?.totalSales || 0)],
        ['Omset Servis', Number(serviceReport?.totalRevenue || 0)],
        ['Total Pemasukan', Number(financialReport?.totalIncome || 0)],
        ['Total Pengeluaran', Number(financialReport?.totalExpense || 0)],
        ['Harga Jual Produk', Number(financialReport?.totalSalesRevenue || 0)],
        ['HPP (Modal)', Number(financialReport?.totalCOGS || 0)],
        ['Laba Penjualan (Harga Jual - HPP)', Number(financialReport?.profit || 0)],
        ['Laba Bersih (Pendapatan - Pengeluaran)', Number(financialReport?.netProfit || 0)],
        []
      ];

      // Add expense breakdown section
      if (financialReport?.records && financialReport.records.length > 0) {
        // Group expenses by category
        const expensesByCategory = financialReport.records
          .filter((record: any) => record.type === 'expense')
          .reduce((acc: any, record: any) => {
            const category = record.category || 'Lainnya';
            acc[category] = (acc[category] || 0) + Number(record.amount || 0);
            return acc;
          }, {});

        overviewData.push(['Detail Pengeluaran']);
        Object.entries(expensesByCategory).forEach(([category, amount]) => {
          overviewData.push([`  ${category}`, Number(amount)]);
        });
        overviewData.push([]);
      }

      // Add service and inventory data
      overviewData.push(
        ['Laporan Servis'],
        ['Total Servis', serviceReport?.totalServices || 0],
        ['Revenue Labor', Number(serviceReport?.revenueBreakdown?.laborRevenue || 0)],
        ['Revenue Parts', Number(serviceReport?.revenueBreakdown?.partsRevenue || 0)],
        ['Modal Parts', Number(serviceReport?.totalCost || 0)],
        ['Laba Servis', Number(serviceReport?.totalProfit || 0)],
        [],
        ['Laporan Inventory'],
        ['Total Produk', inventoryReport?.totalProducts || 0],
        ['Stok Rendah', inventoryReport?.lowStockCount || 0],
        ['Total Stok', inventoryReport?.totalStockQuantity || 0],
        ['Nilai Aset', Number(inventoryReport?.totalAssetValue || 0)]
      );
      
      const ws = XLSX.utils.aoa_to_sheet(overviewData);
      XLSX.utils.book_append_sheet(wb, ws, 'Overview');
      
      // Generate buffer
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      console.log('XLSX generated successfully, size:', buffer.length);
      
      // Set headers and send file
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="laporan-bisnis-${startDate}-${endDate}.xlsx"`);
      res.setHeader('Content-Length', buffer.length);
      
      res.send(buffer);
    } catch (error) {
      console.error("Error exporting XLSX:", error);
      res.status(500).json({ 
        message: "Failed to export XLSX", 
        error: (error as Error).message 
      });
    }
  });

  // Export PDF endpoint
  app.post('/api/reports/export-pdf', isAuthenticated, async (req, res) => {
    try {
      console.log('PDF export request received');
      const { startDate, endDate } = req.body;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }
      
      // Fetch fresh data from database instead of using cached client data
      const start = getStartOfDayJakarta(parseWithTimezone(startDate, false));
      const end = getEndOfDayJakarta(parseWithTimezone(endDate, false));
      
      const salesReport = await storage.getSalesReport(start, end);
      const serviceReport = await storage.getServiceReport(start, end);
      const financialReport = await storage.getFinancialReport(start, end);
      const inventoryReport = await storage.getInventoryReport();
      
      const reportData = { salesReport, serviceReport, financialReport, inventoryReport };
      
      console.log('Generating HTML content...');
      // Generate HTML template for PDF
      const htmlContent = generateReportHTML(reportData, startDate, endDate);
      
      console.log('Generating PDF...');
      // For now, return HTML version with PDF styling  
      // Client-side PDF generation will be handled by jsPDF
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `inline; filename="laporan-bisnis-${startDate}-${endDate}.html"`);
      
      // Send HTML content with PDF-optimized styling
      res.send(htmlContent);
    } catch (error) {
      console.error("Error exporting PDF:", error);
      res.status(500).json({ 
        message: "Failed to export PDF", 
        error: (error as Error).message,
        stack: (error as Error).stack 
      });
    }
  });

  // Store configuration routes
  // GET is public so app name can be displayed on login/landing pages
  app.get('/api/store-config', async (req, res) => {
    try {
      const config = await storage.getStoreConfig();
      res.json(config);
    } catch (error) {
      console.error("Error fetching store config:", error);
      res.status(500).json({ message: "Failed to fetch store config" });
    }
  });

  app.post('/api/store-config', isAuthenticated, async (req, res) => {
    try {
      const configData = insertStoreConfigSchema.parse(req.body);
      const config = await storage.upsertStoreConfig(configData);
      res.json(config);
    } catch (error) {
      console.error("Error updating store config:", error);
      res.status(500).json({ message: "Failed to update store config" });
    }
  });

  // Add PATCH method for store config updates
  app.patch('/api/store-config', isAuthenticated, async (req, res) => {
    try {
      const configData = insertStoreConfigSchema.parse(req.body);
      const config = await storage.upsertStoreConfig(configData);
      res.json(config);
    } catch (error: any) {
      console.error("Error updating store config:", error);
      if (error.issues) {
        console.error("Zod validation errors:", error.issues);
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.issues 
        });
      }
      res.status(500).json({ message: "Failed to update store config" });
    }
  });

  // Category routes
  app.get('/api/categories', isAuthenticated, async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post('/api/categories', isAuthenticated, async (req, res) => {
    try {
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      res.json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  // Product routes
  app.get('/api/products', isAuthenticated, async (req, res) => {
    try {
      const { search } = req.query;
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get('/api/products/low-stock', isAuthenticated, async (req, res) => {
    try {
      const products = await storage.getLowStockProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching low stock products:", error);
      res.status(500).json({ message: "Failed to fetch low stock products" });
    }
  });

  // Product Excel Template route - MUST be before /:id route to avoid route conflict
  app.get('/api/products/template', isAuthenticated, async (req, res) => {
    try {
      // Create Excel template with product columns
      const templateData = [
        ['name', 'sku', 'brand', 'model', 'sellingPrice', 'stock', 'minStock', 'unit', 'specifications']
      ];
      
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(templateData);
      
      // Set column widths for better readability
      worksheet['!cols'] = [
        { width: 25 }, // name
        { width: 20 }, // sku
        { width: 15 }, // brand
        { width: 15 }, // model
        { width: 15 }, // sellingPrice
        { width: 10 }, // stock
        { width: 12 }, // minStock
        { width: 10 }, // unit
        { width: 30 }  // specifications
      ];
      
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
      
      // Generate Excel buffer
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
      
      res.setHeader('Content-Disposition', 'attachment; filename=product-template.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(excelBuffer);
    } catch (error) {
      console.error("Error generating product template:", error);
      res.status(500).json({ message: "Failed to generate product template" });
    }
  });

  app.get('/api/products/:id', isAuthenticated, async (req, res) => {
    try {
      const product = await storage.getProductById(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.post('/api/products', isAuthenticated, async (req: any, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      const productWithCodes = {
        ...productData,
        sku: generateSKU(),
        barcode: generateBarcode(),
      };
      const product = await storage.createProduct(productWithCodes);
      
      // Broadcast real-time update
      realtimeService.broadcastToTenant(req.tenant?.id, {
        resource: 'products',
        action: 'create',
        data: product
      });
      
      res.json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.put('/api/products/:id', isAuthenticated, async (req: any, res) => {
    try {
      const productData = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(req.params.id, productData);
      
      // Broadcast real-time update
      realtimeService.broadcastToTenant(req.tenant?.id, {
        resource: 'products',
        action: 'update',
        data: product,
        id: req.params.id
      });
      
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete('/api/products/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteProduct(req.params.id);
      
      // Broadcast real-time update
      realtimeService.broadcastToTenant(req.tenant?.id, {
        resource: 'products',
        action: 'delete',
        id: req.params.id
      });
      
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Specialized pricing management endpoint
  app.patch('/api/products/:id/pricing', isAuthenticated, async (req: any, res) => {
    try {
      const { sellingPrice, marginPercent } = req.body;
      
      // Calculate margin percentage if selling price provided
      let updateData: any = {};
      if (sellingPrice) updateData.sellingPrice = sellingPrice;
      if (marginPercent) updateData.marginPercent = marginPercent;
      
      const product = await storage.updateProduct(req.params.id, updateData);
      
      // Return updated product with current HPP info
      const currentHPP = await storage.getAveragePurchasePrice(req.params.id);
      const updatedProduct = await storage.getProductById(req.params.id);
      
      // Broadcast real-time update for product pricing changes
      realtimeService.broadcastToTenant(req.tenant?.id, {
        resource: 'products',
        action: 'update',
        data: updatedProduct,
        id: req.params.id
      });
      
      res.json({
        ...updatedProduct,
        currentHPP: currentHPP
      });
    } catch (error) {
      console.error("Error updating product pricing:", error);
      res.status(500).json({ message: "Failed to update product pricing" });
    }
  });

  // Product Excel Import/Export routes
  app.post('/api/products/import', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: "No file uploaded",
          imported: 0,
          failed: 0,
          errors: []
        });
      }

      // Get client ID from authenticated session for multi-tenant security
      const clientId = req.session?.user?.clientId || null;

      // Parse Excel file
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON array
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (rawData.length < 2) {
        return res.status(400).json({ 
          success: false,
          message: "Excel file must contain header row and at least one data row",
          imported: 0,
          failed: 0,
          errors: []
        });
      }

      const headers = rawData[0] as string[];
      const dataRows = rawData.slice(1);

      // Validate headers
      const expectedHeaders = ['name', 'sku', 'brand', 'model', 'sellingPrice', 'stock', 'minStock', 'unit', 'specifications'];
      const headerMap: Record<string, number> = {};
      
      for (const expectedHeader of expectedHeaders) {
        const headerIndex = headers.findIndex(h => h?.toString().toLowerCase().trim() === expectedHeader.toLowerCase());
        if (headerIndex === -1 && ['name', 'sku'].includes(expectedHeader)) {
          return res.status(400).json({ 
            totalRows: dataRows.length,
            successCount: 0,
            errorCount: 0,
            errors: [{ row: 0, message: `Required column '${expectedHeader}' not found in Excel file`, field: expectedHeader }]
          });
        }
        headerMap[expectedHeader] = headerIndex;
      }

      const results = {
        totalRows: dataRows.length,
        successCount: 0,
        errorCount: 0,
        errors: [] as Array<{ row: number; message: string; field?: string }>
      };

      // Enhanced Zod schema with type coercion
      const enhancedProductSchema = insertProductSchema.extend({
        sellingPrice: z.coerce.string().optional(),
        stock: z.coerce.number().int().min(0).optional(),
        minStock: z.coerce.number().int().min(0).optional(),
        clientId: z.string().nullable().optional()
      });

      // Check for existing SKUs to handle duplicates
      const existingProducts = await storage.getProducts();
      const existingSKUs = new Set(existingProducts.map(p => p.sku));

      // Begin database transaction for data integrity
      const successfulProducts = [];

      // Process each row
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i] as any[];
        const rowNumber = i + 2; // +2 because Excel rows start at 1 and we skip header
        
        try {
          // Skip completely empty rows
          if (row.every(cell => !cell || cell.toString().trim() === '')) {
            continue;
          }

          // Extract data from row
          const name = row[headerMap.name]?.toString().trim();
          const sku = row[headerMap.sku]?.toString().trim();
          const brand = row[headerMap.brand]?.toString().trim() || null;
          const model = row[headerMap.model]?.toString().trim() || null;
          const sellingPrice = row[headerMap.sellingPrice]?.toString().trim();
          const stock = row[headerMap.stock]?.toString().trim();
          const minStock = row[headerMap.minStock]?.toString().trim();
          const unit = row[headerMap.unit]?.toString().trim() || 'pcs';
          const specifications = row[headerMap.specifications]?.toString().trim() || null;

          // Validate required fields
          if (!name) {
            results.errors.push({ row: rowNumber, message: "Name is required", field: "name" });
            results.errorCount++;
            continue;
          }

          if (!sku) {
            results.errors.push({ row: rowNumber, message: "SKU is required", field: "sku" });
            results.errorCount++;
            continue;
          }

          // Check for duplicate SKU
          if (existingSKUs.has(sku)) {
            results.errors.push({ row: rowNumber, message: `SKU '${sku}' already exists`, field: "sku" });
            results.errorCount++;
            continue;
          }

          // Parse stock quantity first to use for calculations
          let stockQuantity = 0;
          if (stock && stock.trim() !== '') {
            const parsedStock = parseInt(stock);
            if (!isNaN(parsedStock) && parsedStock >= 0) {
              stockQuantity = parsedStock;
            }
          }

          let minStockQuantity = 0;
          if (minStock && minStock.trim() !== '') {
            const parsedMinStock = parseInt(minStock);
            if (!isNaN(parsedMinStock) && parsedMinStock >= 0) {
              minStockQuantity = parsedMinStock;
            }
          }

          // Create product data with multi-tenant security and all required fields
          const productData: any = {
            name,
            sku,
            brand: brand || undefined,
            model: model || undefined,
            unit,
            specifications: specifications || undefined,
            clientId, // CRITICAL: Add clientId for multi-tenant security
            // Stock management - ensure all required fields are set
            stock: stockQuantity,
            totalStock: stockQuantity,
            availableStock: stockQuantity,
            reservedStock: 0,
            minStock: minStockQuantity,
          };

          // Parse pricing fields with proper coercion
          if (sellingPrice && sellingPrice.trim() !== '') {
            const parsedPrice = parseFloat(sellingPrice);
            if (!isNaN(parsedPrice) && parsedPrice >= 0) {
              productData.sellingPrice = parsedPrice.toString();
            }
          }

          // Validate with enhanced schema
          const validatedData = enhancedProductSchema.parse(productData);
          
          // Add auto-generated barcode if not provided and ensure all required fields
          const productWithCodes = {
            ...validatedData,
            barcode: generateBarcode(),
            sellingPrice: validatedData.sellingPrice || '0',
            sku: sku || generateSKU(),
            minStock: validatedData.minStock || 0,
            stock: validatedData.stock || 0,
          };

          // Add to successful products list for transaction
          successfulProducts.push(productWithCodes);
          existingSKUs.add(sku); // Add to set to prevent duplicates within the same import

        } catch (error) {
          console.error(`Error processing row ${rowNumber}:`, error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.errors.push({ row: rowNumber, message: errorMessage });
          results.errorCount++;
        }
      }

      // Create all products in a transaction-safe manner
      try {
        for (const productData of successfulProducts) {
          await storage.createProduct(productData);
          results.successCount++;
        }
      } catch (error) {
        console.error("Error during bulk product creation:", error);
        return res.status(500).json({ 
          totalRows: results.totalRows,
          successCount: 0,
          errorCount: results.totalRows,
          errors: [{ row: 0, message: "Database transaction failed" }]
        });
      }

      // Broadcast real-time update for imported products
      realtimeService.broadcastToTenant(req.tenant?.id || clientId, {
        resource: 'products',
        action: 'create',
        data: { imported: results.successCount }
      });

      res.json({
        totalRows: results.totalRows,
        successCount: results.successCount,
        errorCount: results.errorCount,
        errors: results.errors
      });

    } catch (error) {
      console.error("Error importing products:", error);
      res.status(500).json({ 
        totalRows: 0,
        successCount: 0,
        errorCount: 0,
        errors: [{ row: 0, message: "Server error during import" }]
      });
    }
  });

  // Location routes
  app.get('/api/locations', isAuthenticated, async (req, res) => {
    try {
      const locations = await storage.getLocations();
      res.json(locations);
    } catch (error) {
      console.error("Error fetching locations:", error);
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  app.post('/api/locations', isAuthenticated, async (req, res) => {
    try {
      const locationData = req.body; // Create proper schema later
      const location = await storage.createLocation(locationData);
      res.json(location);
    } catch (error) {
      console.error("Error creating location:", error);
      res.status(500).json({ message: "Failed to create location" });
    }
  });

  // Purchase Order routes
  app.get('/api/purchase-orders', isAuthenticated, async (req, res) => {
    try {
      const orders = await storage.getPurchaseOrders();
      res.json(orders);
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      res.status(500).json({ message: "Failed to fetch purchase orders" });
    }
  });

  // Get ALL outstanding items from ALL purchase orders (for reports) - MUST be before /:id routes
  app.get('/api/purchase-orders/outstanding-items', isAuthenticated, async (req, res) => {
    try {
      const outstandingItems = await storage.getAllOutstandingItems();
      res.json(outstandingItems);
    } catch (error) {
      console.error("Error fetching outstanding items:", error);
      res.status(500).json({ message: "Failed to fetch outstanding items" });
    }
  });

  app.get('/api/purchase-orders/:id', isAuthenticated, async (req, res) => {
    try {
      const order = await storage.getPurchaseOrderById(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Purchase order not found" });
      }
      res.json(order);
    } catch (error) {
      console.error("Error fetching purchase order:", error);
      res.status(500).json({ message: "Failed to fetch purchase order" });
    }
  });

  app.post('/api/purchase-orders', isAuthenticated, async (req: any, res) => {
    try {
      const { items, ...poData } = req.body;
      
      console.log('Purchase Order Request Body:', JSON.stringify(req.body, null, 2));
      console.log('Items received:', items);
      console.log('PO Data received:', poData);
      
      // Calculate totals from items if provided
      let subtotal = 0;
      let taxAmount = 0;
      let totalAmount = 0;
      
      if (items && items.length > 0) {
        console.log('Processing items for calculation...');
        subtotal = items.reduce((sum: number, item: any) => {
          const unitCost = parseFloat(item.unitCost || item.hargaSatuan || '0');
          const quantity = parseInt(item.quantity || item.kuantitas || '0');
          const itemTotal = unitCost * quantity;
          console.log(`Item: ${item.productId}, Unit Cost: ${unitCost}, Quantity: ${quantity}, Item Total: ${itemTotal}`);
          return sum + itemTotal;
        }, 0);
        
        // Calculate tax if applicable (assuming tax rate from poData or default 0%)
        const taxRate = parseFloat(poData.taxRate || '0') / 100;
        taxAmount = subtotal * taxRate;
        totalAmount = subtotal + taxAmount;
        
        console.log(`Calculated - Subtotal: ${subtotal}, Tax: ${taxAmount}, Total: ${totalAmount}`);
      } else {
        console.log('No items provided, using default values');
      }
      
      // Remove any null/undefined financial fields from poData to avoid override
      const { subtotal: _, taxAmount: __, totalAmount: ___, ...cleanPoData } = poData;
      
      const orderData = {
        ...cleanPoData,
        subtotal: (subtotal || 0).toString(),
        taxAmount: (taxAmount || 0).toString(), 
        totalAmount: (totalAmount || 0).toString(),
        requestedBy: req.session.user.id
      };
      
      console.log('Final Order Data:', JSON.stringify(orderData, null, 2));
      
      const order = await storage.createPurchaseOrder(orderData);
      
      // Create items if provided
      if (items && items.length > 0) {
        for (const item of items) {
          const unitCost = parseFloat(item.unitCost || item.hargaSatuan || '0');
          const quantity = parseInt(item.quantity || item.kuantitas || '0');
          
          await storage.createPurchaseOrderItem({
            ...item,
            purchaseOrderId: order.id,
            orderedQuantity: quantity,
            unitCost: unitCost.toString(),
            totalCost: (unitCost * quantity).toString()
          });
        }
      }
      
      // Emit real-time update for purchase order creation
      realtimeService.broadcast({
        resource: 'purchase_orders',
        action: 'create',
        data: order,
        id: order.id
      });
      
      res.json(order);
    } catch (error) {
      console.error("Error creating purchase order:", error);
      res.status(500).json({ message: "Failed to create purchase order" });
    }
  });

  app.post('/api/purchase-orders/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      const order = await storage.approvePurchaseOrder(req.params.id, req.session.user.id);
      
      // Emit real-time update for purchase order approval
      realtimeService.broadcast({
        resource: 'purchase_orders',
        action: 'update',
        data: order,
        id: order.id
      });
      
      res.json(order);
    } catch (error) {
      console.error("Error approving purchase order:", error);
      res.status(500).json({ message: "Failed to approve purchase order" });
    }
  });

  // Purchase Order Items routes
  app.get('/api/purchase-orders/:id/items', isAuthenticated, async (req, res) => {
    try {
      const items = await storage.getPurchaseOrderItems(req.params.id);
      res.json(items);
    } catch (error) {
      console.error("Error fetching purchase order items:", error);
      res.status(500).json({ message: "Failed to fetch purchase order items" });
    }
  });

  app.post('/api/purchase-orders/:id/items', isAuthenticated, async (req, res) => {
    try {
      const quantity = parseInt(req.body.quantity) || 1;
      const unitCost = parseFloat(req.body.unitCost) || 0;
      const itemData = {
        purchaseOrderId: req.params.id,
        productId: req.body.productId,
        quantity: quantity, // Maps to quantity field (NOT NULL)
        orderedQuantity: quantity, // Maps to ordered_quantity field
        receivedQuantity: 0, // Initial received quantity is 0
        outstandingQuantity: quantity, // Initial outstanding = quantity
        unitCost: String(unitCost), // Maps to unit_cost (varchar)
        totalCost: String(quantity * unitCost), // Maps to total_cost (varchar)
        notes: req.body.notes || "",
      };
      console.log("Creating PO item with data:", itemData);
      const item = await storage.createPurchaseOrderItem(itemData);
      
      // Emit real-time update for item addition
      realtimeService.broadcast({
        resource: 'purchase_order_items',
        action: 'create',
        data: item,
        id: item.id
      });
      
      res.json(item);
    } catch (error) {
      console.error("Error creating purchase order item:", error);
      res.status(500).json({ message: "Failed to create purchase order item" });
    }
  });

  // Delete purchase order item
  app.delete('/api/purchase-orders/:poId/items/:itemId', isAuthenticated, async (req, res) => {
    try {
      const { itemId } = req.params;
      await storage.deletePurchaseOrderItem(itemId);
      res.json({ message: "Item berhasil dihapus" });
    } catch (error) {
      console.error("Error deleting purchase order item:", error);
      res.status(500).json({ message: "Gagal menghapus item", error: (error as Error).message });
    }
  });

  // Receiving routes
  app.post('/api/purchase-orders/items/:itemId/receive', isAuthenticated, async (req, res) => {
    try {
      const { itemId } = req.params;
      const { receivedQuantity } = req.body;
      const userId = req.session.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      console.log("Receiving items:", { itemId, receivedQuantity, userId });
      await storage.receivePurchaseOrderItem(itemId, parseInt(receivedQuantity), userId);
      
      // Emit real-time update for stock changes
      realtimeService.broadcast({
        resource: 'inventory',
        action: 'update',
        data: { itemId, message: 'Barang telah diterima dan stok diperbarui' },
        id: itemId
      });
      
      res.json({ message: "Items received successfully" });
    } catch (error) {
      console.error("Error receiving items:", error);
      res.status(500).json({ message: "Failed to receive items", error: (error as Error).message });
    }
  });

  // Outstanding item management
  app.post('/api/purchase-orders/items/:itemId/outstanding-status', isAuthenticated, async (req, res) => {
    try {
      const { itemId } = req.params;
      const { status, reason } = req.body;
      const userId = req.session.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      await storage.updateOutstandingItemStatus(itemId, status, reason, userId);
      res.json({ message: "Outstanding status updated successfully" });
    } catch (error) {
      console.error("Error updating outstanding status:", error);
      res.status(500).json({ message: "Failed to update outstanding status", error: (error as Error).message });
    }
  });

  // Product Batch routes
  app.get('/api/product-batches', isAuthenticated, async (req, res) => {
    try {
      const { productId } = req.query;
      const batches = await storage.getProductBatches(productId as string);
      res.json(batches);
    } catch (error) {
      console.error("Error fetching product batches:", error);
      res.status(500).json({ message: "Failed to fetch product batches" });
    }
  });

  app.post('/api/product-batches', isAuthenticated, async (req, res) => {
    try {
      const batch = await storage.createProductBatch(req.body);
      res.json(batch);
    } catch (error) {
      console.error("Error creating product batch:", error);
      res.status(500).json({ message: "Failed to create product batch" });
    }
  });

  // Inventory Adjustment routes
  app.get('/api/inventory-adjustments', isAuthenticated, async (req, res) => {
    try {
      const adjustments = await storage.getInventoryAdjustments();
      res.json(adjustments);
    } catch (error) {
      console.error("Error fetching inventory adjustments:", error);
      res.status(500).json({ message: "Failed to fetch inventory adjustments" });
    }
  });

  app.post('/api/inventory-adjustments', isAuthenticated, async (req: any, res) => {
    try {
      const adjustmentData = {
        ...req.body,
        createdBy: req.session.user.id
      };
      const adjustment = await storage.createInventoryAdjustment(adjustmentData);
      res.json(adjustment);
    } catch (error) {
      console.error("Error creating inventory adjustment:", error);
      res.status(500).json({ message: "Failed to create inventory adjustment" });
    }
  });

  app.post('/api/inventory-adjustments/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      const adjustment = await storage.approveInventoryAdjustment(req.params.id, req.session.user.id);
      res.json(adjustment);
    } catch (error) {
      console.error("Error approving inventory adjustment:", error);
      res.status(500).json({ message: "Failed to approve inventory adjustment" });
    }
  });

  // Special endpoint for handling refunded goods that arrived
  app.post('/api/purchase-orders/:poId/receive-refunded-item', isAuthenticated, async (req: any, res) => {
    try {
      const { poId } = req.params;
      const { itemId, quantityReceived, unitCost, reason } = req.body;
      const userId = req.session.user.id;

      // Get the item details and current PO
      const poItems = await storage.getPurchaseOrderItems(poId);
      const poItem = poItems.find(item => item.id === itemId);
      if (!poItem) {
        return res.status(404).json({ message: "PO item not found" });
      }

      // Create inventory adjustment for the refunded goods
      const adjustmentNumber = `ADJ-REF-${Date.now()}`;
      const adjustment = await storage.createInventoryAdjustment({
        adjustmentNumber,
        type: 'increase',
        reason: `Refunded goods received - ${reason || 'Previously refunded item arrived'}`,
        status: 'approved', // Auto-approve since it's from receiving
        createdBy: userId,
        approvedBy: userId,
        approvedDate: new Date(),
        notes: `Adjustment for refunded item from PO: ${poId}, Item: ${poItem.productName}`,
      });

      // Create adjustment item
      await storage.createInventoryAdjustmentItem({
        adjustmentId: adjustment.id,
        productId: poItem.productId,
        quantity: quantityReceived, // Add required quantity field
        systemQuantity: 0, // Since it was refunded, system shows 0
        actualQuantity: quantityReceived,
        adjustmentQuantity: quantityReceived,
        unitCost: unitCost || poItem.unitPrice,
        totalCostImpact: (quantityReceived * parseFloat(unitCost || poItem.unitPrice)).toString(),
        notes: `Refunded goods received: ${quantityReceived} units`,
      });

      // Update product stock - we'll create a stock movement instead
      // The stock will be updated through the stock movement

      // Create stock movement
      await storage.createStockMovement({
        productId: poItem.productId,
        movementType: 'in',
        quantity: quantityReceived,
        unitCost: unitCost || poItem.unitPrice,
        referenceId: adjustment.id,
        referenceType: 'adjustment',
        reason: 'refunded-goods-received',
        notes: `Refunded goods received from PO: ${poId}`,
        userId
      });

      // Create journal entry for the inventory adjustment
      const totalValue = quantityReceived * (unitCost || poItem.unitPrice);
      await storage.createJournalEntry({
        journalNumber: `JE-REF-${Date.now()}`,
        date: new Date(),
        description: `Inventory adjustment - Refunded goods received`,
        reference: adjustment.id,
        referenceType: 'inventory-adjustment',
        totalAmount: totalValue,
        userId,
        lines: [
          {
            accountCode: '1300', // Inventory account
            description: `Inventory increase - ${poItem.productName}`,
            debitAmount: totalValue,
            creditAmount: 0
          },
          {
            accountCode: '5200', // Cost adjustment account
            description: `Cost adjustment - Refunded goods`,
            debitAmount: 0,
            creditAmount: totalValue
          }
        ]
      });

      // Note: PO item status will be updated when the adjustment is processed
      // We don't need to update it here since this is a special case

      res.json({ 
        message: "Refunded goods successfully processed",
        adjustment,
        totalValue,
        quantityReceived
      });
    } catch (error) {
      console.error("Error processing refunded goods:", error);
      res.status(500).json({ message: "Failed to process refunded goods" });
    }
  });

  // Customer routes
  app.get('/api/customers', isAuthenticated, async (req, res) => {
    try {
      const { search } = req.query;
      let customers;
      
      if (search) {
        customers = await storage.searchCustomers(search as string);
      } else {
        customers = await storage.getCustomers();
      }
      
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  // Customer Excel Template route - MUST be before /:id route to avoid route conflict
  app.get('/api/customers/template', isAuthenticated, async (req, res) => {
    try {
      // Create Excel template with customer columns
      const templateData = [
        ['name', 'email', 'phone', 'address']
      ];
      
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(templateData);
      
      // Set column widths for better readability
      worksheet['!cols'] = [
        { width: 20 }, // name
        { width: 25 }, // email  
        { width: 15 }, // phone
        { width: 30 }  // address
      ];
      
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');
      
      // Generate Excel buffer
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
      
      res.setHeader('Content-Disposition', 'attachment; filename=customer-template.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(excelBuffer);
    } catch (error) {
      console.error("Error generating customer template:", error);
      res.status(500).json({ message: "Failed to generate customer template" });
    }
  });

  app.get('/api/customers/:id', isAuthenticated, async (req, res) => {
    try {
      const customer = await storage.getCustomerById(req.params.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  app.post('/api/customers', isAuthenticated, async (req: any, res) => {
    try {
      const customerData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(customerData);
      
      // Broadcast real-time update
      realtimeService.broadcastToTenant(req.tenant?.id, {
        resource: 'customers',
        action: 'create',
        data: customer
      });
      
      res.json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  app.put('/api/customers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const customerData = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(req.params.id, customerData);
      
      // Broadcast real-time update
      realtimeService.broadcastToTenant(req.tenant?.id, {
        resource: 'customers',
        action: 'update',
        data: customer,
        id: req.params.id
      });
      
      res.json(customer);
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(500).json({ message: "Failed to update customer" });
    }
  });

  // Customer Excel Import/Export routes

  app.post('/api/customers/import', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: "No file uploaded",
          imported: 0,
          failed: 0,
          errors: []
        });
      }

      // Get client ID from authenticated session for multi-tenant security
      const clientId = req.session?.user?.clientId || null;

      // Parse Excel file
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON array
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (rawData.length < 2) {
        return res.status(400).json({ 
          success: false,
          message: "Excel file must contain header row and at least one data row",
          imported: 0,
          failed: 0,
          errors: []
        });
      }

      const headers = rawData[0] as string[];
      const dataRows = rawData.slice(1);

      // Validate headers
      const expectedHeaders = ['name', 'email', 'phone', 'address'];
      const headerMap: Record<string, number> = {};
      
      for (const expectedHeader of expectedHeaders) {
        const headerIndex = headers.findIndex(h => h?.toString().toLowerCase().trim() === expectedHeader);
        if (headerIndex === -1 && expectedHeader === 'name') {
          return res.status(400).json({ 
            success: false,
            message: `Required column '${expectedHeader}' not found in Excel file`,
            imported: 0,
            failed: 0,
            errors: []
          });
        }
        headerMap[expectedHeader] = headerIndex;
      }

      const results = {
        totalRows: dataRows.length,
        successCount: 0,
        errorCount: 0,
        errors: [] as Array<{ row: number; message: string; field?: string }>
      };

      // Enhanced Zod schema with type coercion
      const enhancedCustomerSchema = insertCustomerSchema.extend({
        clientId: z.string().nullable().optional(),
        email: z.string().email().optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
        phone: z.string().optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
        address: z.string().optional().or(z.literal("")).transform(val => val === "" ? undefined : val)
      });

      // Check for existing customers to handle duplicates
      const existingCustomers = await storage.getCustomers();
      const existingEmails = new Set(existingCustomers.map(c => c.email).filter(Boolean));

      // Begin database transaction for data integrity
      const successfulCustomers = [];

      // Process each row
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i] as any[];
        const rowNumber = i + 2; // +2 because Excel rows start at 1 and we skip header
        
        try {
          // Skip completely empty rows
          if (row.every(cell => !cell || cell.toString().trim() === '')) {
            continue;
          }

          // Extract data from row
          const name = row[headerMap.name]?.toString().trim();
          const email = row[headerMap.email]?.toString().trim() || null;
          const phone = row[headerMap.phone]?.toString().trim() || null;
          const address = row[headerMap.address]?.toString().trim() || null;

          // Validate required fields
          if (!name) {
            results.errors.push({ row: rowNumber, message: "Name is required", field: "name" });
            results.errorCount++;
            continue;
          }

          // Check for duplicate email if provided
          if (email && existingEmails.has(email)) {
            results.errors.push({ row: rowNumber, message: `Email '${email}' already exists`, field: "email" });
            results.errorCount++;
            continue;
          }

          // Create customer data with multi-tenant security
          const customerData = {
            name,
            email: email || undefined,
            phone: phone || undefined,
            address: address || undefined,
            clientId, // CRITICAL: Add clientId for multi-tenant security
          };

          // Validate with enhanced schema
          const validatedData = enhancedCustomerSchema.parse(customerData);
          
          // Add to successful customers list for transaction
          successfulCustomers.push(validatedData);
          if (email) {
            existingEmails.add(email); // Add to set to prevent duplicates within the same import
          }

        } catch (error) {
          console.error(`Error processing row ${rowNumber}:`, error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.errors.push({ row: rowNumber, message: errorMessage });
          results.errorCount++;
        }
      }

      // Create all customers in a transaction-safe manner
      try {
        for (const customerData of successfulCustomers) {
          await storage.createCustomer(customerData);
          results.successCount++;
        }
      } catch (error) {
        console.error("Error during bulk customer creation:", error);
        return res.status(500).json({ 
          totalRows: results.totalRows,
          successCount: 0,
          errorCount: results.totalRows,
          errors: [{ row: 0, message: "Database transaction failed" }]
        });
      }

      // Broadcast real-time update for imported customers
      realtimeService.broadcastToTenant(req.tenant?.id || clientId, {
        resource: 'customers',
        action: 'create',
        data: { imported: results.successCount }
      });

      res.json({
        totalRows: results.totalRows,
        successCount: results.successCount,
        errorCount: results.errorCount,
        errors: results.errors
      });

    } catch (error) {
      console.error("Error importing customers:", error);
      res.status(500).json({ 
        totalRows: 0,
        successCount: 0,
        errorCount: 0,
        errors: [{ row: 0, message: "Server error during import" }]
      });
    }
  });

  // Supplier routes
  app.get('/api/suppliers', isAuthenticated, async (req, res) => {
    try {
      const suppliers = await storage.getSuppliers();
      res.json(suppliers);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      res.status(500).json({ message: "Failed to fetch suppliers" });
    }
  });

  app.post('/api/suppliers', isAuthenticated, async (req, res) => {
    try {
      const supplierData = insertSupplierSchema.parse(req.body);
      const supplier = await storage.createSupplier(supplierData);
      res.json(supplier);
    } catch (error) {
      console.error("Error creating supplier:", error);
      res.status(500).json({ message: "Failed to create supplier" });
    }
  });

  // Transaction routes
  app.get('/api/transactions', isAuthenticated, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const transactions = await storage.getTransactions(limit);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.get('/api/transactions/:id', isAuthenticated, async (req, res) => {
    try {
      const transaction = await storage.getTransactionById(req.params.id);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      res.json(transaction);
    } catch (error) {
      console.error("Error fetching transaction:", error);
      res.status(500).json({ message: "Failed to fetch transaction" });
    }
  });

  const createTransactionSchema = z.object({
    transaction: insertTransactionSchema,
    items: z.array(insertTransactionItemSchema),
  });

  app.post('/api/transactions', isAuthenticated, async (req: any, res) => {
    try {
      console.log("Raw request body:", JSON.stringify(req.body, null, 2));
      
      const { transaction: transactionData, items } = createTransactionSchema.parse(req.body);
      
      console.log("Parsed transaction data:", JSON.stringify(transactionData, null, 2));
      console.log("Parsed items:", JSON.stringify(items, null, 2));
      
      // Generate transaction number
      const transactionNumber = `TRX-${Date.now()}`;
      
      // Normalize warranty dates to Date objects for database compatibility
      const normalize = (v: any) => (v ? new Date(v) : null);
      const normalizedData = {
        ...transactionData,
        warrantyStartDate: normalize(transactionData.warrantyStartDate),
        warrantyEndDate: normalize(transactionData.warrantyEndDate)
      };
      
      console.log("DEBUG - Warranty dates after normalization:");
      console.log("- warrantyStartDate:", normalizedData.warrantyStartDate, "Type:", typeof normalizedData.warrantyStartDate);
      console.log("- warrantyEndDate:", normalizedData.warrantyEndDate, "Type:", typeof normalizedData.warrantyEndDate);
      console.log("- Is warrantyStartDate a Date?", normalizedData.warrantyStartDate instanceof Date);
      console.log("- Is warrantyEndDate a Date?", normalizedData.warrantyEndDate instanceof Date);
      
      // Add transaction number and user ID to transaction data  
      const completeTransactionData = {
        ...normalizedData,
        transactionNumber,
        userId: req.session.user?.id
      };
      
      const transaction = await storage.createTransaction(
        completeTransactionData,
        items
      );
      
      res.json(transaction);
    } catch (error) {
      console.error("Error creating transaction:", error);
      if (error instanceof Error) {
        console.error("Error stack:", error.stack);
      }
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });

  // Service Ticket routes
  app.get('/api/service-tickets', isAuthenticated, async (req, res) => {
    try {
      const { active } = req.query;
      let tickets;
      
      if (active === 'true') {
        tickets = await storage.getActiveServiceTickets();
      } else {
        tickets = await storage.getServiceTickets();
      }
      
      res.json(tickets);
    } catch (error) {
      console.error("Error fetching service tickets:", error);
      res.status(500).json({ message: "Failed to fetch service tickets" });
    }
  });

  app.get('/api/service-tickets/:id', isAuthenticated, async (req, res) => {
    try {
      const ticket = await storage.getServiceTicketById(req.params.id);
      if (!ticket) {
        return res.status(404).json({ message: "Service ticket not found" });
      }
      res.json(ticket);
    } catch (error) {
      console.error("Error fetching service ticket:", error);
      res.status(500).json({ message: "Failed to fetch service ticket" });
    }
  });

  app.post('/api/service-tickets', isAuthenticated, async (req, res) => {
    try {
      console.log("Raw request body:", JSON.stringify(req.body, null, 2));
      
      // Use proper schema validation to include warranty fields
      const ticketData = insertServiceTicketSchema.parse(req.body);
      
      console.log("Processed ticket data:", JSON.stringify(ticketData, null, 2));
      
      // Generate ticket number
      const ticketNumber = `SVC-${Date.now()}`;
      
      const ticket = await storage.createServiceTicket({
        ...ticketData,
        ticketNumber,
      });
      
      // Send WhatsApp notification for new service (async, don't block response)
      setImmediate(async () => {
        try {
          const config = await storage.getStoreConfig();
          console.log(`🔔 Service creation notification for ticket ${ticket.ticketNumber}`);
          
          if (config?.whatsappEnabled && whatsappService.isConnected()) {
            console.log(`WhatsApp enabled and connected, getting customer data...`);
            const customer = await storage.getCustomerById(ticket.customerId);
            
            if (customer?.phone) {
              console.log(`Sending service creation notification to ${customer.phone}...`);
              await whatsappService.sendServiceCreatedNotification(
                customer.phone,
                ticket,
                customer,
                config
              );
            } else {
              console.log('No phone number for customer, skipping WhatsApp notification');
            }
          } else {
            console.log('WhatsApp not enabled or not connected, skipping notification');
          }
        } catch (error) {
          console.error('Error sending WhatsApp notification for new service:', error);
        }
      });
      
      res.json(ticket);
    } catch (error) {
      console.error("Error creating service ticket:", error);
      res.status(500).json({ message: "Failed to create service ticket" });
    }
  });

  app.put('/api/service-tickets/:id', isAuthenticated, async (req, res) => {
    try {
      console.log("Raw update body:", JSON.stringify(req.body, null, 2));
      
      // Manual validation and transformation for update
      const { customerId, deviceType, deviceBrand, deviceModel, serialNumber, completeness, problem, diagnosis, solution, status, technicianId, estimatedCost, laborCost, parts, warrantyDuration, warrantyStartDate, warrantyEndDate } = req.body;
      
      const ticketData: any = {};
      
      if (customerId !== undefined) ticketData.customerId = customerId;
      if (deviceType !== undefined) ticketData.deviceType = deviceType;
      if (deviceBrand !== undefined) ticketData.deviceBrand = deviceBrand || null;
      if (deviceModel !== undefined) ticketData.deviceModel = deviceModel || null;
      if (serialNumber !== undefined) ticketData.serialNumber = serialNumber || null;
      if (completeness !== undefined) ticketData.completeness = completeness || null;
      if (problem !== undefined) ticketData.problem = problem;
      if (diagnosis !== undefined) ticketData.diagnosis = diagnosis || null;
      if (solution !== undefined) ticketData.solution = solution || null;
      if (status !== undefined) ticketData.status = status;
      if (technicianId !== undefined) ticketData.technicianId = technicianId || null;
      if (estimatedCost !== undefined) ticketData.estimatedCost = estimatedCost ? String(estimatedCost) : null;
      if (laborCost !== undefined) ticketData.laborCost = laborCost ? String(laborCost) : null;
      
      // Handle warranty fields with proper Date conversion
      if (warrantyDuration !== undefined) ticketData.warrantyDuration = warrantyDuration;
      if (warrantyStartDate !== undefined) {
        ticketData.warrantyStartDate = warrantyStartDate ? new Date(warrantyStartDate) : null;
      }
      if (warrantyEndDate !== undefined) {
        ticketData.warrantyEndDate = warrantyEndDate ? new Date(warrantyEndDate) : null;
      }
      
      console.log("Processed update data:", JSON.stringify(ticketData, null, 2));
      
      // Get old ticket for status comparison
      const oldTicket = await storage.getServiceTicketById(req.params.id);
      const userId = req.session.user?.id;
      
      console.log("Session data:", { 
        sessionExists: !!req.session, 
        userExists: !!req.session.user, 
        userId: userId,
        sessionId: req.sessionID 
      });
      
      if (!userId) {
        console.error("No user ID in session for service ticket update");
        return res.status(401).json({ message: "User session invalid. Please login again." });
      }
      
      const ticket = await storage.updateServiceTicket(req.params.id, ticketData, parts, userId);
      
      // Send WhatsApp notification for status change (async, don't block response)
      if (status !== undefined && oldTicket && status !== oldTicket.status) {
        setImmediate(async () => {
          try {
            const config = await storage.getStoreConfig();
            console.log(`🔄 Status update notification for ticket ${ticket.ticketNumber}: ${oldTicket.status} → ${status}`);
            
            if (config?.whatsappEnabled && whatsappService.isConnected()) {
              console.log(`WhatsApp enabled and connected, getting customer data...`);
              const customer = await storage.getCustomerById(ticket.customerId);
              
              if (customer?.phone) {
                console.log(`Sending status update notification to ${customer.phone}...`);
                await whatsappService.sendServiceStatusNotification(
                  customer.phone,
                  ticket,
                  customer,
                  config
                );
              } else {
                console.log('No phone number for customer, skipping WhatsApp status notification');
              }
            } else {
              console.log('WhatsApp not enabled or not connected, skipping status notification');
            }
          } catch (error) {
            console.error('Error sending WhatsApp notification for status change:', error);
          }
        });
      }
      
      res.json(ticket);
    } catch (error) {
      console.error("Error updating service ticket:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to update service ticket" });
    }
  });

  // Delete service ticket
  app.delete('/api/service-tickets/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteServiceTicket(id);
      res.json({ message: "Service ticket deleted successfully" });
    } catch (error) {
      console.error("Error deleting service ticket:", error);
      res.status(500).json({ message: "Failed to delete service ticket" });
    }
  });

  // Cancel service ticket with 3 different scenarios - Enhanced with Zod validation
  app.post('/api/service-tickets/:id/cancel', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Zod validation for request body
      const validationResult = serviceCancellationSchema.safeParse({
        ...req.body,
        userId: req.session.user.id
      });
      
      if (!validationResult.success) {
        const errorMessages = validationResult.error.errors.map(err => err.message);
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: errorMessages 
        });
      }
      
      const { cancellationFee, cancellationReason, cancellationType } = validationResult.data;

      // Get service ticket for business rule validation
      const existingTicket = await storage.getServiceTicketById(id);
      if (!existingTicket) {
        return res.status(404).json({ message: "Service ticket not found" });
      }

      // Business rule validation
      const ticketValidation = await validateCancellationBusinessRules.validateTicketEligibility(id, existingTicket);
      if (!ticketValidation.isValid) {
        return res.status(400).json({ 
          message: "Business rule validation failed", 
          errors: ticketValidation.errors 
        });
      }

      // Warranty specific validation
      if (cancellationType === 'warranty_refund') {
        const warrantyValidation = await validateCancellationBusinessRules.validateWarrantyEligibility(id, existingTicket);
        if (!warrantyValidation.isValid) {
          return res.status(400).json({ 
            message: "Warranty validation failed", 
            errors: warrantyValidation.errors 
          });
        }
      }

      // Status-specific validation based on cancellation type  
      if (cancellationType === 'after_completed' && existingTicket.status !== 'selesai' && existingTicket.status !== 'sudah_diambil') {
        return res.status(400).json({
          message: "Cannot cancel with 'after_completed' type - service ticket is not completed"
        });
      }

      if (cancellationType === 'warranty_refund') {
        if (existingTicket.status !== 'selesai' && existingTicket.status !== 'sudah_diambil') {
          return res.status(400).json({
            message: "Cannot cancel with 'warranty_refund' type - service ticket must be completed or under warranty claim"
          });
        }
      }

      // Execute cancellation
      const result = await storage.cancelServiceTicket(id, {
        cancellationFee: cancellationFee,
        cancellationReason: cancellationReason,
        cancellationType,
        userId: req.session.user.id
      });

      if (!result.success) {
        return res.status(400).json({ message: result.message || "Failed to cancel service ticket" });
      }

      // Broadcast realtime update
      realtimeService.broadcastToTenant(undefined, {
        resource: 'service-tickets',
        action: 'update',
        data: { id, cancellationType, reason: cancellationReason },
        id: id
      });

      res.json({ 
        message: result.message || "Service ticket cancelled successfully",
        success: true,
        cancellationType,
        cancellationFee: parseFloat(cancellationFee)
      });

    } catch (error) {
      console.error("Error cancelling service ticket:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to cancel service ticket" 
      });
    }
  });

  // Get parts for a service ticket
  app.get('/api/service-tickets/:id/parts', isAuthenticated, async (req, res) => {
    try {
      const parts = await storage.getServiceTicketParts(req.params.id);
      res.json(parts);
    } catch (error) {
      console.error("Error fetching service ticket parts:", error);
      res.status(500).json({ message: "Failed to fetch service ticket parts" });
    }
  });

  // Stock Movement routes
  app.get('/api/stock-movements', isAuthenticated, async (req, res) => {
    try {
      const { productId } = req.query;
      const movements = await storage.getStockMovements(productId as string);
      res.json(movements);
    } catch (error) {
      console.error("Error fetching stock movements:", error);
      res.status(500).json({ message: "Failed to fetch stock movements" });
    }
  });

  app.post('/api/stock-movements', isAuthenticated, async (req: any, res) => {
    try {
      const movementData = insertStockMovementSchema.parse(req.body);
      const movement = await storage.createStockMovement({
        ...movementData,
        userId: req.session.user.id,
      });
      res.json(movement);
    } catch (error) {
      console.error("Error creating stock movement:", error);
      res.status(500).json({ message: "Failed to create stock movement" });
    }
  });


  // Permission checking middleware
  const requirePermission = (permission: string) => {
    return async (req: any, res: Response, next: NextFunction) => {
      try {
        // Super admin bypasses permission checks
        if (req.isSuperAdmin) {
          return next();
        }

        // Check if user is authenticated
        if (!req.session?.user) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const user = req.session.user;

        // Check user role permissions
        if (user.role === 'admin') {
          // Admin has all permissions
          return next();
        }

        // For non-admin users, check specific permissions
        const userPermissions = await getUserPermissions(user.role);
        
        if (!userPermissions.includes(permission)) {
          return res.status(403).json({ 
            message: "Anda tidak memiliki izin untuk mengakses resource ini",
            requiredPermission: permission,
            userRole: user.role
          });
        }

        next();
      } catch (error) {
        console.error("Permission check error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    };
  };

  // Helper function to get user permissions based on role
  const getUserPermissions = async (role: string): Promise<string[]> => {
    const roleConfig = {
      admin: [
        'dashboard_view', 'pos_access', 'inventory_full', 'purchasing_full',
        'financial_full', 'reports_full', 'customers_full', 'suppliers_full',
        'service_tickets_full', 'users_full', 'roles_full', 'settings_full',
        'whatsapp_settings', 'store_settings', 'system_admin'
      ],
      kasir: [
        'dashboard_view', 'pos_access', 'inventory_view', 'customers_view',
        'customers_create', 'customers_edit', 'transactions_create',
        'reports_sales_view'
      ],
      teknisi: [
        'dashboard_view', 'service_tickets_full', 'inventory_view',
        'inventory_update_stock', 'customers_view', 'customers_create',
        'customers_edit', 'reports_services_view'
      ],
      purchasing: [
        'dashboard_view', 'purchasing_full', 'suppliers_full', 'inventory_full',
        'reports_purchasing_view', 'reports_inventory_view'
      ],
      finance: [
        'dashboard_view', 'financial_full', 'reports_full', 'customers_view',
        'suppliers_view', 'transactions_view'
      ],
      owner: [
        'dashboard_view', 'pos_access', 'inventory_view', 'purchasing_view',
        'financial_full', 'reports_full', 'customers_full', 'suppliers_view',
        'service_tickets_view', 'users_view', 'settings_view'
      ]
    };

    return roleConfig[role as keyof typeof roleConfig] || [];
  };

  // User Management routes
  app.get('/api/users', isAuthenticated, requirePermission('users_view'), async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/users', isAuthenticated, requirePermission('users_full'), async (req: any, res) => {
    try {
      const { username, email, firstName, lastName, password, role } = req.body;

      // Validate required fields
      if (!username || !email || !password || !role) {
        return res.status(400).json({ 
          message: "Username, email, password, dan role wajib diisi" 
        });
      }

      // Check if username or email already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username sudah digunakan" });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email sudah digunakan" });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user
      const userData = {
        username,
        email,
        firstName,
        lastName,
        password: hashedPassword,
        role,
        isActive: true
      };

      const user = await storage.createUser(userData);
      
      // Remove password from response
      const { password: _, ...userResponse } = user;
      
      // Broadcast real-time update
      realtimeService.broadcastToTenant(req.tenant?.id, {
        resource: 'users',
        action: 'create',
        data: userResponse
      });
      
      res.status(201).json(userResponse);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.put('/api/users/:id', isAuthenticated, requirePermission('users_full'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const userData = req.body;
      const user = await storage.updateUser(id, userData);
      
      // Broadcast real-time update
      realtimeService.broadcastToTenant(req.tenant?.id, {
        resource: 'users',
        action: 'update',
        data: user,
        id
      });
      
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete('/api/users/:id', isAuthenticated, requirePermission('users_full'), async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteUser(id);
      
      // Broadcast real-time update
      realtimeService.broadcastToTenant(req.tenant?.id, {
        resource: 'users',
        action: 'delete',
        id
      });
      
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Role Management routes
  app.get('/api/roles', isAuthenticated, async (req, res) => {
    try {
      const roles = await storage.getRoles();
      res.json(roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });

  app.post('/api/roles', isAuthenticated, async (req, res) => {
    try {
      const roleData = insertRoleSchema.parse(req.body);
      const role = await storage.createRole(roleData);
      res.json(role);
    } catch (error) {
      console.error("Error creating role:", error);
      res.status(500).json({ message: "Failed to create role" });
    }
  });

  app.put('/api/roles/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const roleData = req.body;
      const role = await storage.updateRole(id, roleData);
      res.json(role);
    } catch (error) {
      console.error("Error updating role:", error);
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  app.delete('/api/roles/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteRole(id);
      res.json({ message: "Role deleted successfully" });
    } catch (error) {
      console.error("Error deleting role:", error);
      res.status(500).json({ message: "Failed to delete role" });
    }
  });

  // New Finance Management Routes
  const { financeManager } = await import('./financeManager');

  // Financial Transactions
  app.get('/api/finance/transactions', isAuthenticated, async (req, res) => {
    try {
      const { type, category, startDate, endDate, referenceType } = req.query;
      const filters = {
        type: type as string,
        category: category as string,
        startDate: startDate ? parseWithTimezone(startDate as string, false) : undefined,
        endDate: endDate ? parseWithTimezone(endDate as string, false) : undefined,
        referenceType: referenceType as string
      };
      const transactions = await financeManager.getTransactions(filters);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post('/api/finance/transactions', isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const transaction = await financeManager.createTransaction({
        ...req.body,
        userId
      });
      res.json(transaction);
    } catch (error) {
      console.error("Error creating transaction:", error);
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });

  app.get('/api/finance/summary', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const summary = await financeManager.getSummary(
        startDate ? parseWithTimezone(startDate as string, false) : undefined,
        endDate ? parseWithTimezone(endDate as string, false) : undefined
      );
      res.json(summary);
    } catch (error) {
      console.error("Error fetching summary:", error);
      res.status(500).json({ message: "Failed to fetch summary" });
    }
  });

  app.delete('/api/finance/service-records/:serviceId', isAuthenticated, async (req, res) => {
    try {
      const { serviceId } = req.params;
      
      // Delete all financial records related to this service
      await db.delete(financialRecords).where(eq(financialRecords.reference, serviceId));
      
      res.json({ message: "Service financial records cleared" });
    } catch (error) {
      console.error("Error clearing service financial records:", error);
      res.status(500).json({ message: "Failed to clear records" });
    }
  });
  
  // Enhanced Accounting Reports API
  app.get('/api/finance/balance-sheet', isAuthenticated, async (req, res) => {
    try {
      const { asOfDate } = req.query;
      const asOf = asOfDate ? new Date(asOfDate as string) : undefined;
      const balanceSheet = await storage.getBalanceSheet(asOf);
      res.json(balanceSheet);
    } catch (error) {
      console.error("Error fetching balance sheet:", error);
      res.status(500).json({ message: "Failed to fetch balance sheet" });
    }
  });
  
  app.get('/api/finance/income-statement', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? parseWithTimezone(startDate as string, false) : undefined;
      const end = endDate ? parseWithTimezone(endDate as string, false) : undefined;
      const incomeStatement = await storage.getIncomeStatement(start, end);
      res.json(incomeStatement);
    } catch (error) {
      console.error("Error fetching income statement:", error);
      res.status(500).json({ message: "Failed to fetch income statement" });
    }
  });
  
  app.get('/api/finance/chart-of-accounts', isAuthenticated, async (req, res) => {
    try {
      const accounts = await storage.getChartOfAccounts();
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching chart of accounts:", error);
      res.status(500).json({ message: "Failed to fetch chart of accounts" });
    }
  });
  
  app.post('/api/finance/journal-entry', isAuthenticated, async (req, res) => {
    try {
      const data = req.body;
      data.userId = req.session?.user?.id;
      const result = await storage.createJournalEntry(data);
      
      if (result.success) {
        res.status(201).json(result.journalEntry);
      } else {
        res.status(400).json({ message: result.error });
      }
    } catch (error) {
      console.error("Error creating journal entry:", error);
      res.status(500).json({ message: "Failed to create journal entry" });
    }
  });

  // Reset database (keep only users and roles)
  app.post('/api/admin/reset-database', isAuthenticated, async (req, res) => {
    try {
      await db.transaction(async (tx) => {
        // Delete in correct order to handle foreign keys
        await tx.delete(attendanceRecords);
        await tx.delete(payrollRecords);
        await tx.delete(employees);
        await tx.delete(financialRecords);
        await tx.delete(stockMovements);
        await tx.delete(serviceTicketParts);
        await tx.delete(serviceTickets);
        await tx.delete(transactionItems);
        await tx.delete(transactions);
        await tx.delete(products);
        await tx.delete(categories);
        await tx.delete(customers);
        await tx.delete(suppliers);
        await tx.delete(storeConfig);
      });
      
      res.json({ message: "Database reset completed. Users and roles preserved." });
    } catch (error) {
      console.error("Error resetting database:", error);
      res.status(500).json({ message: "Failed to reset database" });
    }
  });

  // Employee Management
  app.get('/api/employees', isAuthenticated, async (req, res) => {
    try {
      const { includeInactive } = req.query;
      const employees = await financeManager.getEmployees(includeInactive === 'true');
      res.json(employees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  app.post('/api/employees', isAuthenticated, async (req, res) => {
    try {
      const employee = await financeManager.createEmployee(req.body);
      res.json(employee);
    } catch (error) {
      console.error("Error creating employee:", error);
      res.status(500).json({ message: "Failed to create employee" });
    }
  });

  app.put('/api/employees/:id', isAuthenticated, async (req, res) => {
    try {
      const employee = await financeManager.updateEmployee(req.params.id, req.body);
      res.json(employee);
    } catch (error) {
      console.error("Error updating employee:", error);
      res.status(500).json({ message: "Failed to update employee" });
    }
  });

  // Payroll Management
  app.get('/api/payroll', isAuthenticated, async (req, res) => {
    try {
      const { employeeId } = req.query;
      const payrolls = await financeManager.getPayrollRecords(employeeId as string);
      res.json(payrolls);
    } catch (error) {
      console.error("Error fetching payroll records:", error);
      res.status(500).json({ message: "Failed to fetch payroll records" });
    }
  });

  app.post('/api/payroll', isAuthenticated, async (req: any, res) => {
    try {
      const payroll = await financeManager.createPayroll({
        ...req.body,
        userId: req.session.user.id
      });
      res.json(payroll);
    } catch (error) {
      console.error("Error creating payroll:", error);
      res.status(500).json({ message: "Failed to create payroll" });
    }
  });

  app.put('/api/payroll/:id/status', isAuthenticated, async (req, res) => {
    try {
      const { status } = req.body;
      const payroll = await financeManager.updatePayrollStatus(req.params.id, status);
      res.json(payroll);
    } catch (error) {
      console.error("Error updating payroll status:", error);
      res.status(500).json({ message: "Failed to update payroll status" });
    }
  });

  // Object storage routes
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      // Check if object storage is configured
      const searchPaths = objectStorageService.getPublicObjectSearchPaths();
      if (searchPaths.length === 0) {
        return res.status(503).json({ error: "Object storage not configured" });
      }
      
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      // Check if private object storage is configured
      const privateDir = objectStorageService.getPrivateObjectDir();
      if (!privateDir) {
        return res.status(503).json({ error: "Private object storage not configured" });
      }
      
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      if (!uploadURL) {
        return res.status(503).json({ error: "Object storage not configured for uploads" });
      }
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      return res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  app.put("/api/logos", isAuthenticated, async (req, res) => {
    if (!req.body.logoURL) {
      return res.status(400).json({ error: "logoURL is required" });
    }

    try {
      const objectStorageService = new ObjectStorageService();
      
      // Check if private object storage is configured
      const privateDir = objectStorageService.getPrivateObjectDir();
      if (!privateDir) {
        return res.status(503).json({ error: "Object storage not configured" });
      }
      
      const objectPath = objectStorageService.normalizeObjectEntityPath(
        req.body.logoURL,
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting logo:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // WhatsApp API endpoints
  
  // Get WhatsApp status
  app.get('/api/whatsapp/status', isAuthenticated, async (req, res) => {
    try {
      const rawQrCode = whatsappService.getQRCode();
      let qrCodeDataUrl = null;
      
      // Convert raw QR string to data URL for frontend display
      if (rawQrCode) {
        try {
          console.log('Converting QR code to data URL, raw length:', rawQrCode.length);
          qrCodeDataUrl = await QRCode.toDataURL(rawQrCode);
          console.log('QR conversion successful, data URL length:', qrCodeDataUrl ? qrCodeDataUrl.length : 0);
        } catch (qrError) {
          console.error('Error converting QR code to data URL:', qrError);
        }
      } else {
        console.log('No raw QR code available for conversion');
      }
      
      res.json({
        connected: whatsappService.isConnected(),
        connectionState: whatsappService.getConnectionState(),
        qrCode: qrCodeDataUrl,
      });
    } catch (error) {
      console.error('Error getting WhatsApp status:', error);
      res.status(500).json({ message: 'Failed to get WhatsApp status' });
    }
  });

  // Enable WhatsApp
  app.post('/api/whatsapp/enable', isAuthenticated, async (req, res) => {
    try {
      const existingConfig = await storage.getStoreConfig();
      await storage.upsertStoreConfig({
        name: existingConfig?.name || "LaptopPOS",
        address: existingConfig?.address || "",
        phone: existingConfig?.phone || "",
        email: existingConfig?.email || "",
        taxRate: existingConfig?.taxRate || "11.00",
        defaultDiscount: existingConfig?.defaultDiscount || "0.00",
        databasePort: existingConfig?.databasePort || 5432,
        whatsappEnabled: true,
      });
      res.json({ message: 'WhatsApp enabled successfully' });
    } catch (error) {
      console.error('Error enabling WhatsApp:', error);
      res.status(500).json({ message: 'Failed to enable WhatsApp' });
    }
  });

  // Disable WhatsApp
  app.post('/api/whatsapp/disable', isAuthenticated, async (req, res) => {
    try {
      // Disconnect if currently connected
      if (whatsappService.isConnected()) {
        await whatsappService.disconnect();
      }
      
      const existingConfig = await storage.getStoreConfig();
      await storage.upsertStoreConfig({
        name: existingConfig?.name || "LaptopPOS",
        address: existingConfig?.address || "",
        phone: existingConfig?.phone || "",
        email: existingConfig?.email || "",
        taxRate: existingConfig?.taxRate || "11.00",
        defaultDiscount: existingConfig?.defaultDiscount || "0.00",
        databasePort: existingConfig?.databasePort || 5432,
        whatsappEnabled: false,
      });
      res.json({ message: 'WhatsApp disabled successfully' });
    } catch (error) {
      console.error('Error disabling WhatsApp:', error);
      res.status(500).json({ message: 'Failed to disable WhatsApp' });
    }
  });

  // Connect WhatsApp
  app.post('/api/whatsapp/connect', isAuthenticated, async (req, res) => {
    try {
      const config = await storage.getStoreConfig();
      if (!config?.whatsappEnabled) {
        return res.status(400).json({ message: 'WhatsApp not enabled in settings' });
      }

      await whatsappService.initialize();
      res.json({ message: 'WhatsApp connection initiated' });
    } catch (error) {
      console.error('Error connecting WhatsApp:', error);
      res.status(500).json({ message: 'Failed to connect WhatsApp' });
    }
  });

  // Disconnect WhatsApp
  app.post('/api/whatsapp/disconnect', isAuthenticated, async (req, res) => {
    try {
      await whatsappService.disconnect();
      res.json({ message: 'WhatsApp disconnected successfully' });
    } catch (error) {
      console.error('Error disconnecting WhatsApp:', error);
      res.status(500).json({ message: 'Failed to disconnect WhatsApp' });
    }
  });

  // Test message
  app.post('/api/whatsapp/test-message', isAuthenticated, async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({ message: 'Phone number is required' });
      }

      if (!whatsappService.isConnected()) {
        return res.status(400).json({ message: 'WhatsApp not connected' });
      }

      const testMessage = `🔧 Test pesan dari LaptopPOS Service Center

Ini adalah pesan test untuk memastikan koneksi WhatsApp berfungsi dengan baik.

Terima kasih!
- LaptopPOS Team`;

      const success = await whatsappService.sendMessage(phoneNumber, testMessage);
      
      if (success) {
        res.json({ message: 'Test message sent successfully' });
      } else {
        res.status(500).json({ message: 'Failed to send test message' });
      }
    } catch (error) {
      console.error('Error sending test message:', error);
      res.status(500).json({ message: 'Failed to send test message' });
    }
  });

  // Public API for customers to check service status with query parameter
  app.get('/api/public/service-status', async (req, res) => {
    try {
      const { ticket } = req.query;
      
      if (!ticket) {
        return res.status(400).json({ message: 'Ticket number is required' });
      }

      // Get service ticket with customer info using Drizzle
      const serviceTicket = await db
        .select()
        .from(serviceTickets)
        .leftJoin(customers, eq(serviceTickets.customerId, customers.id))
        .where(eq(serviceTickets.ticketNumber, ticket as string))
        .limit(1);

      if (!serviceTicket.length) {
        return res.status(404).json({ message: 'Service not found' });
      }

      const service = serviceTicket[0];
      
      // Return limited info for customer
      res.json({
        ticketNumber: service.service_tickets.ticketNumber,
        customerName: service.customers?.name,
        deviceType: service.service_tickets.deviceType,
        deviceBrand: service.service_tickets.deviceBrand,
        deviceModel: service.service_tickets.deviceModel,
        problem: service.service_tickets.problem,
        diagnosis: service.service_tickets.diagnosis,
        status: service.service_tickets.status,
        estimatedCost: service.service_tickets.estimatedCost,
        estimatedCompletion: service.service_tickets.estimatedCompletion,
        completedAt: service.service_tickets.completedAt,
        createdAt: service.service_tickets.createdAt,
      });
    } catch (error) {
      console.error('Error getting service status:', error);
      res.status(500).json({ message: 'Failed to get service status' });
    }
  });

  // Public API for customers to check service status
  app.get('/api/public/service-status/:serviceNumber', async (req, res) => {
    try {
      const { serviceNumber } = req.params;
      
      if (!serviceNumber) {
        return res.status(400).json({ message: 'Service number is required' });
      }

      // Get service ticket with customer info using Drizzle
      const serviceTicket = await db
        .select()
        .from(serviceTickets)
        .leftJoin(customers, eq(serviceTickets.customerId, customers.id))
        .where(eq(serviceTickets.ticketNumber, serviceNumber as string))
        .limit(1);

      if (!serviceTicket.length) {
        return res.status(404).json({ message: 'Service not found' });
      }

      const service = serviceTicket[0];
      
      // Get customer info and parts from the service ticket
      const ticket = service.service_tickets;
      const customer = service.customers;
      
      // Get used parts
      const parts = await storage.getServiceTicketParts(ticket.id);
      
      // Return complete status info with parts (single response)
      res.json({
        ticketNumber: ticket.ticketNumber,
        customerName: customer?.name,
        deviceType: ticket.deviceType,
        deviceBrand: ticket.deviceBrand,
        deviceModel: ticket.deviceModel,
        problem: ticket.problem,
        diagnosis: ticket.diagnosis,
        status: ticket.status,
        estimatedCost: ticket.estimatedCost,
        estimatedCompletion: ticket.estimatedCompletion,
        completedAt: ticket.completedAt,
        createdAt: ticket.createdAt,
        parts: parts.map(part => ({
          name: part.productName,
          quantity: part.quantity,
          unitPrice: part.unitPrice
        }))
      });
    } catch (error) {
      console.error('Error getting service status:', error);
      res.status(500).json({ message: 'Failed to get service status' });
    }
  });

  // Import default roles config
  const { defaultRoleConfigs } = await import('./defaultRoles.js');

  // Function to create default roles
  async function createDefaultRoles() {
    try {
      console.log('Creating default roles...');
      
      for (const roleConfig of defaultRoleConfigs) {
        // Check if role already exists
        const existingRoles = await storage.getRoles();
        const roleExists = existingRoles.some(role => role.name === roleConfig.name);
        
        if (!roleExists) {
          await storage.createRole({
            name: roleConfig.name,
            displayName: roleConfig.displayName,
            description: roleConfig.description,
            permissions: roleConfig.permissions,
            isActive: true
          });
          console.log(`✅ Created role: ${roleConfig.displayName}`);
        } else {
          console.log(`ℹ️ Role already exists: ${roleConfig.displayName}`);
        }
      }
      
      console.log('✅ Default roles setup completed');
    } catch (error) {
      console.error('Error creating default roles:', error);
    }
  }

  // Initialize SaaS system with default subscription plans
  async function initializeSaaSSystem() {
    try {
      console.log('🚀 Initializing SaaS system...');
      
      // Default subscription plans
      const defaultPlans = [
        {
          name: 'Basic',
          description: 'Paket dasar untuk usaha kecil',
          price: 149000,
          currency: 'IDR',
          billingPeriod: 'monthly',
          isActive: true,
          features: JSON.stringify(["POS System", "Inventory Management", "Basic Reports", "1 Store Location"]),
          limits: JSON.stringify({
            maxUsers: 3,
            maxProducts: 500,
            maxTransactions: 1000,
            maxStorage: 1
          }),
          maxUsers: 3,
          maxTransactionsPerMonth: 1000,
          maxStorageGB: 1,
          whatsappIntegration: false,
          customBranding: false,
          apiAccess: false,
          prioritySupport: false
        },
        {
          name: 'Professional',
          description: 'Paket lengkap untuk usaha menengah',
          price: 299000,
          currency: 'IDR',
          billingPeriod: 'monthly',
          isActive: true,
          features: JSON.stringify(["Advanced POS", "Multi-Store", "Service Management", "Advanced Reports", "WhatsApp Integration"]),
          limits: JSON.stringify({
            maxUsers: 10,
            maxProducts: 2000,
            maxTransactions: 5000,
            maxStorage: 5
          }),
          maxUsers: 10,
          maxTransactionsPerMonth: 5000,
          maxStorageGB: 5,
          whatsappIntegration: true,
          customBranding: false,
          apiAccess: false,
          prioritySupport: false
        },
        {
          name: 'Enterprise',
          description: 'Solusi enterprise untuk usaha besar',
          price: 599000,
          currency: 'IDR',
          billingPeriod: 'monthly',
          isActive: true,
          features: JSON.stringify(["Full Features", "Unlimited Stores", "API Access", "Custom Reports", "Priority Support"]),
          limits: JSON.stringify({
            maxUsers: 50,
            maxProducts: 10000,
            maxTransactions: 50000,
            maxStorage: 20
          }),
          maxUsers: 50,
          maxTransactionsPerMonth: 50000,
          maxStorageGB: 20,
          whatsappIntegration: true,
          customBranding: true,
          apiAccess: true,
          prioritySupport: true
        }
      ];

      // Check and create default plans
      const existingPlans = await db.select().from(plans);
      
      for (const planConfig of defaultPlans) {
        const planExists = existingPlans.some(plan => plan.name === planConfig.name);
        
        if (!planExists) {
          await db.insert(plans).values(planConfig);
          console.log(`✅ Created subscription plan: ${planConfig.name}`);
        } else {
          console.log(`ℹ️ Subscription plan already exists: ${planConfig.name}`);
        }
      }

      console.log('✅ SaaS system initialization completed');
    } catch (error) {
      console.error('Error initializing SaaS system:', error);
    }
  }

  // Setup Wizard Endpoints - untuk installer
  
  // Database migration endpoint
  app.post('/api/setup/migrate-database', async (req, res) => {
    try {
      console.log('Starting database migration...');
      
      // Import child_process to run drizzle migration
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      // Run drizzle push command to apply schema changes
      await execAsync('npm run db:push --force', {
        cwd: process.cwd(),
        timeout: 60000, // 1 minute timeout
      });

      console.log('Database migration completed successfully');

      // Create default roles after migration
      await createDefaultRoles();
      
      // Initialize SaaS system with default subscription plans
      await initializeSaaSSystem();

      // Update setup steps
      const config = await storage.getStoreConfig();
      const setupSteps = config?.setupSteps ? JSON.parse(config.setupSteps) : {};
      setupSteps.database = true;

      if (config) {
        await storage.upsertStoreConfig({
          name: config.name,
          taxRate: config.taxRate || '11.00',
          defaultDiscount: config.defaultDiscount || '0.00',
          databasePort: config.databasePort || 5432,
          clientId: config.clientId,
          email: config.email,
          address: config.address,
          phone: config.phone,
          logo: config.logo,
          setupCompleted: config.setupCompleted,
          setupSteps: JSON.stringify(setupSteps),
          databaseUrl: config.databaseUrl,
          databaseHost: config.databaseHost,
          databaseName: config.databaseName,
          databaseUser: config.databaseUser,
          databasePassword: config.databasePassword,
          whatsappEnabled: config.whatsappEnabled,
          whatsappSessionData: config.whatsappSessionData,
          whatsappQR: config.whatsappQR,
          whatsappConnected: config.whatsappConnected
        });
      }

      res.json({ 
        success: true, 
        message: 'Database migration completed successfully' 
      });
    } catch (error) {
      console.error('Database migration failed:', error);
      res.status(500).json({ 
        message: 'Database migration failed', 
        error: (error as Error).message 
      });
    }
  });

  // Check setup status
  app.get('/api/setup/status', async (req: any, res) => {
    try {
      // Extract clientId from tenant info (SaaS mode) or use null (single-tenant mode)
      const clientId = req.tenant?.id || req.tenant?.clientId || null;
      
      let config = null;
      let userCount = 0;
      
      try {
        config = await storage.getStoreConfig(clientId);
      } catch (configError) {
        // Store config table doesn't exist yet - fresh installation
        console.log('Store config table not found - fresh installation');
      }
      
      try {
        userCount = await storage.getUserCount(clientId);
      } catch (userError) {
        // Users table doesn't exist yet - fresh installation 
        console.log('Users table not found - fresh installation');
      }
      
      // Check if all required steps are completed
      const setupSteps = config?.setupSteps ? JSON.parse(config.setupSteps || '{}') : {};
      const allStepsCompleted = Boolean(
        setupSteps.store && 
        setupSteps.database && 
        setupSteps.admin && 
        setupSteps.initialData
      );
      
      const isSetupCompleted = Boolean(
        config && 
        config.name && 
        userCount > 0 &&
        (config.setupCompleted === true || allStepsCompleted)
      );
      
      res.json({
        setupCompleted: isSetupCompleted,
        hasStoreConfig: Boolean(config?.name),
        hasAdminUser: userCount > 0,
        storeName: config?.name,
        setupSteps: config?.setupSteps ? JSON.parse(config.setupSteps || '{}') : {},
        databaseMigrated: config?.setupSteps ? JSON.parse(config.setupSteps || '{}').database : false,
        clientId: clientId // Include client context
      });
    } catch (error) {
      // Silence table missing errors during fresh setup to avoid console spam
      if ((error as any)?.code !== '42P01') {  
        console.error('Error checking setup status:', error);
      }
      res.json({
        setupCompleted: false,
        hasStoreConfig: false,
        hasAdminUser: false,
        setupSteps: {}
      });
    }
  });

  // Setup store configuration
  app.post('/api/setup/store', async (req: any, res) => {
    try {
      const { name, address, phone, email, taxRate } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: 'Store name is required' });
      }

      // Extract clientId from tenant info (SaaS mode) or use null (single-tenant mode)
      const clientId = req.tenant?.id || req.tenant?.clientId || null;
      
      const existingConfig = await storage.getStoreConfig(clientId);
      const setupSteps = existingConfig?.setupSteps ? JSON.parse(existingConfig.setupSteps) : {};
      setupSteps.store = true;

      await storage.upsertStoreConfig({
        name,
        address: address || '',
        phone: phone || '',
        email: email || '',
        taxRate: taxRate || '11.00',
        defaultDiscount: '0.00',
        databasePort: 5432,
        setupSteps: JSON.stringify(setupSteps),
        setupCompleted: false, // Will be completed in final step
      }, clientId);

      res.json({ 
        success: true, 
        message: 'Store configuration saved successfully' 
      });
    } catch (error) {
      console.error('Error saving store config:', error);
      res.status(500).json({ message: 'Failed to save store configuration' });
    }
  });

  // Setup admin user
  app.post('/api/setup/admin', async (req: any, res) => {
    try {
      const { username, password, email, firstName, lastName } = req.body;
      
      if (!username || !password || !email) {
        return res.status(400).json({ message: 'Username, password, and email are required' });
      }

      // Extract clientId from tenant info (SaaS mode) or use null (single-tenant mode)
      const clientId = req.tenant?.id || req.tenant?.clientId || null;

      const existingUserByUsername = await storage.getUserByUsername(username);
      const existingUserByEmail = await storage.getUserByEmail(email);

      const isDifferentClient = (user: any) => {
        if (!user) return false;
        if (!clientId && !user.clientId) return false;
        if (!clientId) return Boolean(user.clientId);
        return user.clientId !== clientId;
      };

      if (isDifferentClient(existingUserByUsername)) {
        return res.status(400).json({ message: 'Username already used by another tenant' });
      }

      if (isDifferentClient(existingUserByEmail)) {
        return res.status(400).json({ message: 'Email already used by another tenant' });
      }

      const userToUpdate = existingUserByEmail && !isDifferentClient(existingUserByEmail)
        ? existingUserByEmail
        : existingUserByUsername && !isDifferentClient(existingUserByUsername)
          ? existingUserByUsername
          : null;

      // Hash password and persist user with tenant isolation
      const hashedPassword = await hashPassword(password);

      if (userToUpdate) {
        await storage.updateUser(userToUpdate.id, {
          username,
          password: hashedPassword,
          email,
          firstName: firstName || 'System',
          lastName: lastName || 'Administrator',
          role: 'admin',
          isActive: true,
          profileImageUrl: null,
          clientId: clientId || null,
        });
      } else {
        await storage.createUser({
          username,
          password: hashedPassword,
          email,
          firstName: firstName || 'System',
          lastName: lastName || 'Administrator',
          role: 'admin',
          isActive: true,
          profileImageUrl: null
        }, clientId || undefined);
      }

      // Update setup steps
      const config = await storage.getStoreConfig(clientId || undefined);
      const setupSteps = config?.setupSteps ? JSON.parse(config.setupSteps) : {};
      setupSteps.admin = true;

      if (config) {
        await storage.upsertStoreConfig({
          name: config.name,
          taxRate: config.taxRate || '11.00',
          defaultDiscount: config.defaultDiscount || '0.00',
          databasePort: config.databasePort || 5432,
          clientId: config.clientId,
          email: config.email,
          address: config.address,
          phone: config.phone,
          logo: config.logo,
          setupCompleted: config.setupCompleted,
          setupSteps: JSON.stringify(setupSteps),
          databaseUrl: config.databaseUrl,
          databaseHost: config.databaseHost,
          databaseName: config.databaseName,
          databaseUser: config.databaseUser,
          databasePassword: config.databasePassword,
          whatsappEnabled: config.whatsappEnabled,
          whatsappSessionData: config.whatsappSessionData,
          whatsappQR: config.whatsappQR,
          whatsappConnected: config.whatsappConnected
        }, clientId || undefined);
      }

      res.json({ 
        success: true, 
        message: 'Admin user created successfully' 
      });
    } catch (error) {
      console.error('Error creating admin user:', error);
      res.status(500).json({ message: 'Failed to create admin user' });
    }
  });

  // Setup initial data (categories, locations, accounts)
  app.post('/api/setup/initial-data', async (req, res) => {
    try {
      console.log('Setting up initial data...');
      
      // Create default categories
      const defaultCategories = [
        { name: 'Laptop', description: 'Laptop dan notebook' },
        { name: 'Aksesoris', description: 'Aksesoris laptop dan komputer' },
        { name: 'Sparepart', description: 'Suku cadang laptop' },
        { name: 'Software', description: 'Software dan aplikasi' }
      ];

      for (const category of defaultCategories) {
        try {
          const existingCategories = await storage.getCategories();
          const categoryExists = existingCategories.some(cat => cat.name === category.name);
          
          if (!categoryExists) {
            await storage.createCategory(category);
            console.log(`✅ Created category: ${category.name}`);
          } else {
            console.log(`ℹ️ Category already exists: ${category.name}`);
          }
        } catch (error) {
          console.error(`Error creating category ${category.name}:`, error);
        }
      }

      // Create default location
      try {
        const existingLocations = await storage.getLocations();
        if (existingLocations.length === 0) {
          await storage.createLocation({
            name: 'Main Store',
            code: 'MAIN-001',
            description: 'Lokasi utama toko'
          });
          console.log('✅ Created default location: Main Store');
        }
      } catch (error) {
        console.error('Error creating default location:', error);
      }

      // Import finance manager to set up accounts
      const { FinanceManager } = await import('./financeManager');
      const financeManager = new FinanceManager();
      
      try {
        const accountsResult = await financeManager.initializeDefaultAccounts();
        if (accountsResult.success) {
          console.log(`✅ ${accountsResult.message}`);
        } else {
          console.error(`❌ ${accountsResult.message}`);
        }
      } catch (error) {
        console.error('Error initializing accounts:', error);
      }

      // Initialize WhatsApp service config (prevent crashes)
      try {
        const config = await storage.getStoreConfig();
        if (config && (!config.whatsappEnabled || config.whatsappEnabled === null)) {
          await storage.upsertStoreConfig({
            name: config.name,
            taxRate: config.taxRate || '11.00',
            defaultDiscount: config.defaultDiscount || '0.00',
            databasePort: config.databasePort || 5432,
            clientId: config.clientId,
            email: config.email,
            address: config.address,
            phone: config.phone,
            logo: config.logo,
            setupCompleted: config.setupCompleted,
            setupSteps: config.setupSteps,
            databaseUrl: config.databaseUrl,
            databaseHost: config.databaseHost,
            databaseName: config.databaseName,
            databaseUser: config.databaseUser,
            databasePassword: config.databasePassword,
            whatsappEnabled: false,
            whatsappSessionData: config.whatsappSessionData,
            whatsappQR: config.whatsappQR,
            whatsappConnected: false
          });
          console.log('✅ WhatsApp service config initialized (disabled by default)');
        }
      } catch (error) {
        console.error('Error initializing WhatsApp config:', error);
      }

      // Update setup steps  
      const clientId = req.tenant?.id || null;
      const config = await storage.getStoreConfig(clientId || undefined);
      const setupSteps = config?.setupSteps ? JSON.parse(config.setupSteps) : {};
      setupSteps.initialData = true;

      if (config) {
        await storage.upsertStoreConfig({
          name: config.name,
          taxRate: config.taxRate || '11.00',
          defaultDiscount: config.defaultDiscount || '0.00',
          databasePort: config.databasePort || 5432,
          clientId: config.clientId,
          email: config.email,
          address: config.address,
          phone: config.phone,
          logo: config.logo,
          setupCompleted: config.setupCompleted,
          setupSteps: JSON.stringify(setupSteps),
          databaseUrl: config.databaseUrl,
          databaseHost: config.databaseHost,
          databaseName: config.databaseName,
          databaseUser: config.databaseUser,
          databasePassword: config.databasePassword,
          whatsappEnabled: config.whatsappEnabled,
          whatsappSessionData: config.whatsappSessionData,
          whatsappQR: config.whatsappQR,
          whatsappConnected: config.whatsappConnected
        }, clientId || undefined);
      }

      res.json({ 
        success: true, 
        message: 'Initial data setup completed successfully' 
      });
    } catch (error) {
      console.error('Error setting up initial data:', error);
      res.status(500).json({ 
        message: 'Failed to setup initial data', 
        error: (error as Error).message 
      });
    }
  });

  // Complete setup
  app.post('/api/setup/complete', async (req: any, res) => {
    try {
      // Extract clientId from tenant info (SaaS mode) or use null (single-tenant mode)
      const clientId = req.tenant?.id || req.tenant?.clientId || null;
      
      const config = await storage.getStoreConfig(clientId || undefined);
      
      if (!config) {
        return res.status(400).json({ message: 'Store configuration not found' });
      }

      const setupSteps = config.setupSteps ? JSON.parse(config.setupSteps) : {};
      setupSteps.completed = true;

      await storage.upsertStoreConfig({
        name: config.name,
        taxRate: config.taxRate || '11.00',
        defaultDiscount: config.defaultDiscount || '0.00',
        databasePort: config.databasePort || 5432,
        clientId: config.clientId,
        email: config.email,
        address: config.address,
        phone: config.phone,
        logo: config.logo,
        setupCompleted: true,
        setupSteps: JSON.stringify(setupSteps),
        databaseUrl: config.databaseUrl,
        databaseHost: config.databaseHost,
        databaseName: config.databaseName,
        databaseUser: config.databaseUser,
        databasePassword: config.databasePassword,
        whatsappEnabled: config.whatsappEnabled,
        whatsappSessionData: config.whatsappSessionData,
        whatsappQR: config.whatsappQR,
        whatsappConnected: config.whatsappConnected
      }, clientId);

      res.json({ 
        success: true, 
        message: 'Setup completed successfully! You can now use the application.' 
      });
    } catch (error) {
      console.error('Error completing setup:', error);
      res.status(500).json({ message: 'Failed to complete setup' });
    }
  });

  // =============================
  // 🚀 SAAS MANAGEMENT ROUTES
  // =============================

  // Subscription limits middleware
  const checkSubscriptionLimits = (feature: string) => {
    return async (req: any, res: Response, next: NextFunction) => {
      try {
        // Skip if super admin
        if (req.isSuperAdmin) {
          return next();
        }

        // Check if tenant has valid subscription
        if (!req.tenant) {
          return res.status(403).json({ 
            error: 'No tenant context',
            message: 'Subscription validation failed'
          });
        }

        // Get active subscription
        const activeSubscription = await db
          .select()
          .from(subscriptions)
          .where(
            and(
              eq(subscriptions.clientId, req.tenant.id),
              eq(subscriptions.paymentStatus, 'paid'),
              gte(subscriptions.endDate, new Date())
            )
          )
          .orderBy(subscriptions.endDate)
          .limit(1);

        if (!activeSubscription.length) {
          return res.status(402).json({
            error: 'Subscription required',
            message: 'This feature requires an active subscription'
          });
        }

        const subscription = activeSubscription[0];
        
        // Get plan details
        const planResult = await db
          .select()
          .from(plans)
          .where(eq(plans.id, subscription.planId as any))
          .limit(1);

        if (!planResult.length) {
          return res.status(500).json({ error: 'Plan not found' });
        }

        // Check feature availability based on plan
        const planData = planResult[0];
        const featureAccess = {
          'whatsapp': planData.whatsappIntegration,
          'export': planData.name !== 'basic',
          'api': planData.apiAccess,
          'custom_branding': planData.customBranding,
          'priority_support': planData.prioritySupport
        };

        if (!featureAccess[feature as keyof typeof featureAccess]) {
          return res.status(402).json({
            error: 'Feature not available',
            message: `This feature requires ${planData.name === 'basic' ? 'Pro' : 'Premium'} plan or higher`,
            currentPlan: planData.name,
            feature
          });
        }

        // Add subscription info to request
        req.subscription = subscription;
        req.plan = planData;
        
        next();
      } catch (error) {
        console.error('Subscription limits check error:', error);
        res.status(500).json({ error: 'Subscription validation failed' });
      }
    };
  };

  // SaaS Admin Routes - Client Management
  app.get('/api/admin/saas/clients', isAuthenticated, requirePermission('saas_admin'), async (_req, res) => {
    try {
      const baseClients = await db
        .select({
          id: clients.id,
          name: clients.name,
          subdomain: clients.subdomain,
          customDomain: clients.customDomain,
          email: clients.email,
          status: clients.status,
          trialEndsAt: clients.trialEndsAt,
          createdAt: clients.createdAt,
        })
        .from(clients)
        .orderBy(desc(clients.createdAt));

      if (baseClients.length === 0) {
        return res.json([]);
      }

      const clientIds = baseClients.map((client) => client.id).filter(Boolean);

      const subscriptionRows = await db
        .select({
          id: subscriptions.id,
          clientId: subscriptions.clientId,
          planId: subscriptions.planId,
          planName: subscriptions.planName,
          plan: subscriptions.plan,
          paymentStatus: subscriptions.paymentStatus,
          startDate: subscriptions.startDate,
          endDate: subscriptions.endDate,
          amount: subscriptions.amount,
          currency: subscriptions.currency,
          createdAt: subscriptions.createdAt,
        })
        .from(subscriptions)
        .where(inArray(subscriptions.clientId, clientIds))
        .orderBy(desc(subscriptions.createdAt));

      const subscriptionByClient = new Map<string, typeof subscriptionRows[number]>();
      for (const subscription of subscriptionRows) {
        if (!subscriptionByClient.has(subscription.clientId)) {
          subscriptionByClient.set(subscription.clientId, subscription);
        }
      }

      const clientsWithSubscriptions = baseClients.map((client) => ({
        ...client,
        subscription: subscriptionByClient.get(client.id) ?? null,
      }));

      res.json(clientsWithSubscriptions);
    } catch (error) {
      console.error('Error fetching SaaS clients:', error);
      res.status(500).json({ message: 'Failed to fetch clients' });
    }
  });

  // Create new client
  app.post('/api/admin/saas/clients', isAuthenticated, requirePermission('saas_admin'), async (req, res) => {
    try {
      const {
        name: rawName,
        subdomain: rawSubdomain,
        email: rawEmail,
        planId: rawPlanId,
        trialDays: rawTrialDays = 7,
        plan: rawRequestedPlan,
        phone: rawPhone,
        address: rawAddress,
      } = req.body ?? {};

      const name = typeof rawName === 'string' ? rawName.trim() : '';
      const subdomain = typeof rawSubdomain === 'string' ? rawSubdomain.trim().toLowerCase() : '';
      const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
      const selectedPlanId = typeof rawPlanId === 'string' ? rawPlanId.trim() : '';
      const requestedPlanName = typeof rawRequestedPlan === 'string' ? rawRequestedPlan : undefined;
      const phone = sanitizeOptionalText(rawPhone);
      const address = sanitizeOptionalText(rawAddress);

      if (!name || !subdomain || !email || !selectedPlanId) {

        return res.status(400).json({ message: 'All fields are required' });
      }

      // Validate subdomain pattern (letters, numbers, hyphen)
      const subdomainPattern = /^[a-z0-9-]+$/;
      if (!subdomainPattern.test(subdomain)) {
        return res.status(400).json({ message: 'Subdomain hanya boleh berisi huruf, angka, dan tanda hubung' });
      }

      // Check for duplicates
      const [existingClient] = await db
        .select()
        .from(clients)
        .where(eq(clients.subdomain, subdomain))
        .limit(1);

      if (existingClient) {
        return res.status(400).json({ message: 'Subdomain already exists' });
      }

      const [existingEmail] = await db
        .select({ id: clients.id })
        .from(clients)
        .where(eq(clients.email, email))
        .limit(1);

      if (existingEmail) {
        return res.status(400).json({ message: 'Email already exists' });
      }

      // Get plan details
      const [plan] = await db
        .select()
        .from(plans)
        .where(eq(plans.id, selectedPlanId))
        .limit(1);

      if (!plan) {
        return res.status(400).json({ message: 'Plan not found' });
      }

      const parsedTrialDays =
        typeof rawTrialDays === 'number'
          ? rawTrialDays
          : Number.parseInt(typeof rawTrialDays === 'string' ? rawTrialDays : '', 10);

      const boundedTrialDays = Number.isFinite(parsedTrialDays)
        ? Math.min(Math.max(Math.trunc(parsedTrialDays), 0), 90)
        : 7;

      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + boundedTrialDays);

      const fullDomain = `${subdomain}.profesionalservis.my.id`;
      const {
        planCode: canonicalPlanCode,
        normalizedLimits,
        normalizedLimitsJson,
        shouldPersistNormalizedLimits,
      } = resolvePlanConfiguration(plan);

      const subscriptionPlan = ensurePlanCode(canonicalPlanCode, {
        fallbackName: typeof plan.name === 'string' ? plan.name : undefined,
      });

      const normalizedPlanLimits = {
        ...normalizedLimits,
        planCode: subscriptionPlan,
      };

      const shouldPersistLimits = shouldPersistNormalizedLimits;

      if (shouldPersistLimits) {
        await db
          .update(plans)
          .set({ limits: normalizedLimitsJson })
          .where(eq(plans.id, plan.id));
      }

      const planFeatures = safeParseJson<unknown>(plan.features);

      const settingsPayload: Record<string, unknown> = {
        planId: plan.id,
        planName: plan.name,
        planCode: subscriptionPlan,
        maxUsers: plan.maxUsers ?? undefined,
        maxStorage: plan.maxStorageGB ?? undefined,
        domain: fullDomain,
      };

      if (planFeatures !== undefined) {
        settingsPayload.features = planFeatures;
      } else if (plan.features) {
        settingsPayload.features = plan.features;
      }

      if (Object.keys(normalizedPlanLimits).length > 0) {
        settingsPayload.limits = normalizedPlanLimits;
      }

      const planSlug = resolveSubscriptionPlanSlug(plan.name, requestedPlanName);
      const planDisplayName = getSubscriptionPlanDisplayName(planSlug);

      settingsPayload.planName = planDisplayName;
      settingsPayload.planSlug = planSlug;

      const newClient = await db.transaction(async (tx) => {
        const [createdClient] = await tx
          .insert(clients)
          .values({
            name,
            subdomain,
            email,
            phone: phone ?? null,
            address: address ?? null,
            customDomain: fullDomain,
            status: 'trial',
            trialEndsAt,
            settings: JSON.stringify(settingsPayload),
          })
          .returning();

        const subscriptionStart = new Date();
        const subscriptionEnd = new Date(subscriptionStart);
        subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);

        await tx
          .insert(subscriptions)
          .values({
            clientId: createdClient.id,
            planId: plan.id,
            planName: planDisplayName,
            plan: subscriptionPlan,
            amount: typeof plan.price === 'number' ? plan.price.toString() : '0',
            currency: plan.currency ?? 'IDR',
            paymentStatus: 'pending',
            startDate: subscriptionStart,
            endDate: subscriptionEnd,
            trialEndDate: trialEndsAt,
          });

        return createdClient;
      });


      realtimeService.broadcast({
        resource: 'saas-clients',
        action: 'create',
        data: newClient,
      });

      res.json({
        message: 'Client created successfully',
        client: newClient,
        trialUrl: `https://${fullDomain}`,
      });
    } catch (error) {
      console.error('Error creating SaaS client:', error);
      res.status(500).json({ message: 'Failed to create client' });
    }
  });

  app.put('/api/admin/saas/clients/:id', isAuthenticated, requirePermission('saas_admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, planId } = req.body as { name?: string; email?: string; planId?: string };

      const [existingClient] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, id))
        .limit(1);

      if (!existingClient) {
        return res.status(404).json({ message: 'Client not found' });
      }

      const clientUpdates: Record<string, unknown> = { updatedAt: new Date() };

      if (typeof name === 'string' && name.trim().length > 0 && name !== existingClient.name) {
        clientUpdates.name = name.trim();
      }

      if (typeof email === 'string' && email.trim().length > 0 && email !== existingClient.email) {
        clientUpdates.email = email.trim();
      }

      let updatedClient = existingClient;

      if (Object.keys(clientUpdates).length > 1) {
        [updatedClient] = await db
          .update(clients)
          .set(clientUpdates)
          .where(eq(clients.id, id))
          .returning();
      }

      let updatedSubscription = null;

      if (planId) {
        const [plan] = await db
          .select()
          .from(plans)
          .where(eq(plans.id, planId))
          .limit(1);

        if (!plan) {
          return res.status(400).json({ message: 'Plan not found' });
        }

        const [currentSubscription] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.clientId, id))
          .orderBy(desc(subscriptions.createdAt))
          .limit(1);

        const subscriptionPayload = {
          planId: plan.id,
          planName: plan.name,
          plan: plan.name.toLowerCase() as any,
          amount: plan.price.toString(),
          updatedAt: new Date(),
        };

        if (currentSubscription) {
          [updatedSubscription] = await db
            .update(subscriptions)
            .set(subscriptionPayload)
            .where(eq(subscriptions.id, currentSubscription.id))
            .returning();
        } else {
          const startDate = new Date();
          const endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + 1);

          [updatedSubscription] = await db
            .insert(subscriptions)
            .values({
              clientId: id,
              planId: plan.id,
              planName: plan.name,
              plan: plan.name.toLowerCase() as any,
              amount: plan.price.toString(),
              paymentStatus: 'paid',
              startDate,
              endDate,
            })
            .returning();
        }
      }

      realtimeService.broadcast({
        resource: 'saas-clients',
        action: 'update',
        data: { ...updatedClient, subscription: updatedSubscription },
        id,
      });

      res.json({
        message: 'Client updated successfully',
        client: updatedClient,
        subscription: updatedSubscription,
      });
    } catch (error) {
      console.error('Error updating SaaS client:', error);
      res.status(500).json({ message: 'Failed to update client' });
    }
  });

  // Update client status
  app.patch('/api/admin/saas/clients/:id/status', isAuthenticated, requirePermission('saas_admin'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['active', 'suspended', 'expired', 'trial', 'pending'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }

      const [updatedClient] = await db
        .update(clients)
        .set({ 
          status,
          updatedAt: new Date()
        })
        .where(eq(clients.id, id))
        .returning();

      if (!updatedClient) {
        return res.status(404).json({ message: 'Client not found' });
      }

      // Broadcast real-time update
      realtimeService.broadcast({
        resource: 'saas-clients',
        action: 'update',
        data: updatedClient,
        id
      });

      res.json({
        message: 'Client status updated successfully',
        client: updatedClient
      });
    } catch (error) {
      console.error('Error updating client status:', error);
      res.status(500).json({ message: 'Failed to update client status' });
    }
  });

  // SaaS Dashboard Stats
  app.get('/api/admin/saas/stats', isAuthenticated, requirePermission('saas_admin'), async (req, res) => {
    try {
      // Total clients
      const [totalClientsResult] = await db
        .select({ count: count() })
        .from(clients);
      const totalClients = totalClientsResult.count;

      // Active clients
      const [activeClientsResult] = await db
        .select({ count: count() })
        .from(clients)
        .where(eq(clients.status, 'active'));
      const activeClients = activeClientsResult.count;

      // Trial clients
      const [trialClientsResult] = await db
        .select({ count: count() })
        .from(clients)
        .where(eq(clients.status, 'trial'));
      const trialClients = trialClientsResult.count;

      // New clients this month
      const currentDate = new Date();
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const [newClientsResult] = await db
        .select({ count: count() })
        .from(clients)
        .where(gte(clients.createdAt, firstDayOfMonth));
      const newClientsThisMonth = newClientsResult.count;

      // Revenue calculation based on paid invoices in the current month
      const [monthlyRevenueResult] = await db
        .select({
          total: sql<number>`coalesce(sum(${payments.amount}), 0)`
        })
        .from(payments)
        .where(
          and(
            eq(payments.status, 'paid'),
            or(
              gte(payments.paidAt, firstDayOfMonth),
              and(isNull(payments.paidAt), gte(payments.createdAt, firstDayOfMonth))
            )
          )
        );

      const monthlyRevenue = monthlyRevenueResult?.total ?? 0;

      // Expiring trials (trials ending in next 7 days)
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const [expiringTrialsResult] = await db
        .select({ count: count() })
        .from(clients)
        .where(
          and(
            eq(clients.status, 'trial'),
            lte(clients.trialEndsAt, nextWeek)
          )
        );
      const expiringTrials = expiringTrialsResult.count;

      res.json({
        totalClients,
        activeClients,
        trialClients,
        newClientsThisMonth,
        monthlyRevenue,
        revenueGrowth: 15, // Mock growth percentage
        expiringTrials,
        averageRevenuePerClient: Math.round(monthlyRevenue / Math.max(activeClients, 1))
      });
    } catch (error) {
      console.error('Error fetching SaaS stats:', error);
      res.status(500).json({ message: 'Failed to fetch SaaS dashboard stats' });
    }
  });

  // Plan Management
  app.get('/api/admin/saas/plans', isAuthenticated, requirePermission('saas_admin'), async (req, res) => {
    try {
      const allPlans = await db
        .select()
        .from(plans)
        .orderBy(plans.price);

      res.json(allPlans);
    } catch (error) {
      console.error('Error fetching plans:', error);
      res.status(500).json({ message: 'Failed to fetch plans' });
    }
  });

  app.post('/api/admin/saas/plans', isAuthenticated, requirePermission('saas_admin'), async (req, res) => {
    try {
      const {
        name,
        description,
        price,
        currency = 'IDR',
        billingPeriod = 'monthly',
        maxUsers,
        maxTransactionsPerMonth,
        maxStorageGB,
        whatsappIntegration,
        customBranding,
        apiAccess,
        prioritySupport,
        features,
        limits,
      } = req.body;

      if (!name || !description) {
        return res.status(400).json({ message: 'Name and description are required' });
      }

      const parsedPrice = typeof price === 'string' ? parseInt(price, 10) : price;
      if (!Number.isFinite(parsedPrice)) {
        return res.status(400).json({ message: 'Price must be a valid number' });
      }

      const parseOptionalNumber = (value: unknown) => {
        if (typeof value === 'number') {
          return value;
        }
        if (typeof value === 'string' && value.trim().length > 0) {
          const parsed = parseInt(value, 10);
          return Number.isFinite(parsed) ? parsed : undefined;
        }
        return undefined;
      };

      const [newPlan] = await db
        .insert(plans)
        .values({
          name: name.toLowerCase(),
          description,
          price: parsedPrice,
          currency: currency || 'IDR',
          billingPeriod: billingPeriod || 'monthly',
          maxUsers: parseOptionalNumber(maxUsers),
          maxTransactionsPerMonth: parseOptionalNumber(maxTransactionsPerMonth),
          maxStorageGB: parseOptionalNumber(maxStorageGB),
          whatsappIntegration: Boolean(whatsappIntegration),
          customBranding: Boolean(customBranding),
          apiAccess: Boolean(apiAccess),
          prioritySupport: Boolean(prioritySupport),
          features: Array.isArray(features)
            ? JSON.stringify(features)
            : typeof features === 'string' && features.trim().length > 0
            ? features
            : undefined,
          limits: typeof limits === 'object' && limits !== null
            ? JSON.stringify(limits)
            : typeof limits === 'string' && limits.trim().length > 0
            ? limits
            : undefined,
        })
        .returning();

      res.json({ message: 'Plan created successfully', plan: newPlan });
    } catch (error) {
      console.error('Error creating plan:', error);
      res.status(500).json({ message: 'Failed to create plan' });
    }
  });

  // Update plan
  app.put('/api/admin/saas/plans/:id', isAuthenticated, requirePermission('saas_admin'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const planData = req.body;

      const [updatedPlan] = await db
        .update(plans)
        .set({ 
          ...planData,
          updatedAt: new Date()
        })
        .where(eq(plans.id, id))
        .returning();

      if (!updatedPlan) {
        return res.status(404).json({ message: 'Plan not found' });
      }

      // Broadcast real-time update
      realtimeService.broadcast({
        resource: 'saas-plans',
        action: 'update',
        data: updatedPlan,
        id
      });

      res.json({
        message: 'Plan updated successfully',
        plan: updatedPlan
      });
    } catch (error) {
      console.error('Error updating plan:', error);
      res.status(500).json({ message: 'Failed to update plan' });
    }
  });

  // Public Routes - No authentication required
  app.get('/api/saas/plans', async (req, res) => {
    try {
      const publicPlans = await db
        .select({
          id: plans.id,
          name: plans.name,
          description: plans.description,
          price: plans.price,
          currency: plans.currency,
          billingPeriod: plans.billingPeriod,
          features: plans.features,
          maxUsers: plans.maxUsers,
          maxTransactionsPerMonth: plans.maxTransactionsPerMonth,
          maxStorageGB: plans.maxStorageGB,
          whatsappIntegration: plans.whatsappIntegration,
          customBranding: plans.customBranding,
          apiAccess: plans.apiAccess,
          prioritySupport: plans.prioritySupport
        })
        .from(plans)
        .where(eq(plans.isActive, true))
        .orderBy(plans.price);

      res.json(publicPlans);
    } catch (error) {
      console.error('Error fetching public plans:', error);
      res.status(500).json({ message: 'Failed to fetch plans' });
    }
  });

  // Feature-gated routes examples
  app.post('/api/whatsapp/send', isAuthenticated, checkSubscriptionLimits('whatsapp'), async (req: any, res) => {
    try {
      // WhatsApp send logic here
      res.json({ 
        message: 'WhatsApp message sent successfully',
        plan: req.plan?.name,
        remainingQuota: 'unlimited' 
      });
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      res.status(500).json({ message: 'Failed to send WhatsApp message' });
    }
  });

  app.post('/api/data/export', isAuthenticated, checkSubscriptionLimits('export'), async (req: any, res) => {
    try {
      // Data export logic here
      res.json({ 
        message: 'Data export initiated successfully',
        plan: req.plan?.name,
        exportUrl: '/downloads/export.xlsx'
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      res.status(500).json({ message: 'Failed to export data' });
    }
  });

  // Auto-expire subscriptions (runs periodically)
  app.post('/api/admin/saas/check-expirations', isAuthenticated, requirePermission('saas_admin'), async (req, res) => {
    try {
      const now = new Date();
      
      // Find expired subscriptions
      const expiredSubscriptions = await db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.paymentStatus, 'paid'),
            lt(subscriptions.endDate, now)
          )
        );

      let updated = 0;
      
      for (const subscription of expiredSubscriptions) {
        // Update client status to expired
        await db
          .update(clients)
          .set({ 
            status: 'expired',
            updatedAt: new Date()
          })
          .where(eq(clients.id, subscription.clientId));

        // Update subscription status
        await db
          .update(subscriptions)
          .set({ 
            paymentStatus: 'failed',
            updatedAt: new Date()
          })
          .where(eq(subscriptions.id, subscription.id));

        updated++;
      }

      res.json({
        message: `Checked and updated ${updated} expired subscriptions`,
        expiredCount: updated
      });
    } catch (error) {
      console.error('Error checking subscription expirations:', error);
      res.status(500).json({ message: 'Failed to check expirations' });
    }
  });

  // Warranty Claims API Endpoints
  
  // GET /api/warranty-claims - List warranty claims with optional filtering
  app.get('/api/warranty-claims', isAuthenticated, async (req, res) => {
    try {
      const { status } = req.query;
      const claims = await storage.getWarrantyClaims(status as string);
      res.json(claims);
    } catch (error) {
      console.error("Error fetching warranty claims:", error);
      res.status(500).json({ message: "Failed to fetch warranty claims" });
    }
  });

  // GET /api/warranty-claims/:id - Get warranty claim by ID
  app.get('/api/warranty-claims/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const claim = await storage.getWarrantyClaimById(id);
      
      if (!claim) {
        return res.status(404).json({ message: "Warranty claim not found" });
      }
      
      res.json(claim);
    } catch (error) {
      console.error("Error fetching warranty claim:", error);
      res.status(500).json({ message: "Failed to fetch warranty claim" });
    }
  });

  // POST /api/warranty-claims - Create new warranty claim
  app.post('/api/warranty-claims', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Validate request data
      const claimData = insertWarrantyClaimSchema.parse({
        ...req.body
      });

      // Validate warranty eligibility
      const eligibilityCheck = await storage.validateWarrantyEligibility(
        claimData.originalTransactionId || undefined,
        claimData.originalServiceTicketId || undefined
      );

      if (!eligibilityCheck.isValid) {
        return res.status(400).json({ 
          message: eligibilityCheck.message,
          isEligible: false
        });
      }

      // Create warranty claim
      const claim = await storage.createWarrantyClaim(claimData);
      
      // Broadcast warranty claim creation to all clients
      realtimeService.broadcastToTenant(req.clientId, {
        resource: 'warranty-claims',
        action: 'create',
        data: claim,
        id: claim.id
      });
      
      res.status(201).json({
        claim,
        message: "Warranty claim created successfully"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors
        });
      }
      
      console.error("Error creating warranty claim:", error);
      res.status(500).json({ message: "Failed to create warranty claim" });
    }
  });

  // PUT /api/warranty-claims/:id/process - Process warranty claim (approve/reject)
  app.put('/api/warranty-claims/:id/process', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { action, adminNotes, returnCondition } = req.body;
      const userId = req.session.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Validate action and map to status
      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ 
          message: "Action must be either 'approve' or 'reject'" 
        });
      }

      // Map frontend action to backend status
      const status = action === 'approve' ? 'approved' : 'rejected';

      // Get warranty claim details
      const existingClaim = await storage.getWarrantyClaimById(id);
      if (!existingClaim) {
        return res.status(404).json({ message: "Warranty claim not found" });
      }

      if (existingClaim.status !== 'pending') {
        return res.status(400).json({ 
          message: "Only pending warranty claims can be processed" 
        });
      }

      // For sales return claims that are approved, require returnCondition
      if (existingClaim.claimType === 'sales_return' && status === 'approved') {
        if (!returnCondition || !['normal_stock', 'damaged_stock'].includes(returnCondition)) {
          return res.status(400).json({
            message: "returnCondition is required for approved sales return claims and must be 'normal_stock' or 'damaged_stock'"
          });
        }
      }

      // Process warranty claim
      const updatedClaim = await storage.processWarrantyClaim(
        id, 
        status, 
        userId, 
        returnCondition
      );

      // Broadcast warranty claim update to all clients
      realtimeService.broadcastToTenant(req.clientId, {
        resource: 'warranty-claims',
        action: 'update',
        data: updatedClaim,
        id: updatedClaim.id
      });

      res.json({
        claim: updatedClaim,
        message: `Warranty claim ${status} successfully`
      });
    } catch (error) {
      console.error("Error processing warranty claim:", error);
      res.status(500).json({ message: "Failed to process warranty claim" });
    }
  });

  // PUT /api/warranty-claims/:id/complete - Mark warranty claim as completed
  app.put('/api/warranty-claims/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Get warranty claim details
      const existingClaim = await storage.getWarrantyClaimById(id);
      if (!existingClaim) {
        return res.status(404).json({ message: "Warranty claim not found" });
      }

      if (existingClaim.status !== 'approved') {
        return res.status(400).json({ 
          message: "Only approved warranty claims can be marked as completed" 
        });
      }

      // Handle sales return inventory and finance integration
      if (existingClaim.claimType === 'sales_return' && existingClaim.originalTransactionId) {
        await storage.processSalesReturnWarranty(
          existingClaim.originalTransactionId,
          existingClaim.returnCondition || 'normal_stock',
          userId
        );
      }

      // Mark warranty claim as processed/completed
      const updatedClaim = await storage.updateWarrantyClaimStatus(
        id,
        'processed',
        userId
      );

      // Broadcast warranty claim completion to all clients
      realtimeService.broadcastToTenant(req.clientId, {
        resource: 'warranty-claims',
        action: 'update',
        data: updatedClaim,
        id: updatedClaim.id
      });

      res.json({
        claim: updatedClaim,
        message: "Warranty claim marked as completed successfully"
      });
    } catch (error) {
      console.error("Error completing warranty claim:", error);
      res.status(500).json({ message: "Failed to complete warranty claim" });
    }
  });

  // GET /api/warranty-claims/validate/:type/:id - Validate warranty eligibility
  app.get('/api/warranty-claims/validate/:type/:id', isAuthenticated, async (req, res) => {
    try {
      const { type, id } = req.params;
      
      let originalTransactionId: string | undefined;
      let originalServiceTicketId: string | undefined;
      
      if (type === 'sale') {
        originalTransactionId = id;
      } else if (type === 'service') {
        originalServiceTicketId = id;
      } else {
        return res.status(400).json({ 
          message: "Type must be either 'sale' or 'service'" 
        });
      }

      const eligibilityCheck = await storage.validateWarrantyEligibility(
        originalTransactionId,
        originalServiceTicketId
      );

      res.json({
        isEligible: eligibilityCheck.isValid,
        message: eligibilityCheck.message,
        type,
        id
      });
    } catch (error) {
      console.error("Error validating warranty eligibility:", error);
      res.status(500).json({ 
        message: "Failed to validate warranty eligibility",
        isEligible: false
      });
    }
  });

  const httpServer = createServer(app);
  
  // Initialize WebSocket server for real-time updates
  realtimeService.initialize(httpServer);
  
  return httpServer;
}
