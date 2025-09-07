import type { Express } from "express";
import { createServer, type Server } from "http";
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
import * as XLSX from 'xlsx';
import { db } from "./db";
import { eq, and, gte, lte, desc, count, sql } from "drizzle-orm";
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
  attendanceRecords
} from "@shared/schema";

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
        <strong>Periode Laporan: ${new Date(startDate).toLocaleDateString('id-ID')} - ${new Date(endDate).toLocaleDateString('id-ID')}</strong>
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
          <h3>Laba Bersih</h3>
          <div class="value income">Rp ${Number(financialReport?.profit || 0).toLocaleString('id-ID')}</div>
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
        <p>Laporan digenerate otomatis oleh LaptopPOS System pada ${new Date().toLocaleString('id-ID')}</p>
        <p>© 2025 LaptopPOS - Sistem Manajemen Bisnis Laptop</p>
      </div>
    </body>
    </html>
  `;
}

// Duplicate imports removed - already imported above
import { 
  insertProductSchema,
  insertCustomerSchema,
  insertSupplierSchema,
  insertTransactionSchema,
  insertTransactionItemSchema,
  insertServiceTicketSchema,
  insertStockMovementSchema,
  insertFinancialRecordSchema,
  insertCategorySchema,
  insertStoreConfigSchema,
  insertRoleSchema,
  generateSKU,
  generateBarcode
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
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
      const start = new Date(startDate + 'T00:00:00.000Z');
      const end = new Date(endDate + 'T23:59:59.999Z');
      
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
      const start = new Date(startDate + 'T00:00:00.000Z');
      const end = new Date(endDate + 'T23:59:59.999Z');
      
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
      const start = new Date(startDate + 'T00:00:00.000Z');
      const end = new Date(endDate + 'T23:59:59.999Z');
      
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

  // Stock movements report - Clean implementation
  app.get('/api/reports/stock-movements', isAuthenticated, async (req, res) => {
    try {
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
              WHEN ${stockMovements.referenceType} = 'purchase' THEN COALESCE(${purchaseOrders.poNumber}, ${stockMovements.referenceId})
              ELSE ${stockMovements.referenceId}
            END
          `,
          notes: stockMovements.notes,
          createdAt: stockMovements.createdAt,
          userName: sql<string>`'Admin'`, // Add userName field
        })
        .from(stockMovements)
        .leftJoin(products, eq(stockMovements.productId, products.id))
        .leftJoin(purchaseOrders, eq(stockMovements.referenceId, purchaseOrders.id))
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
      const start = new Date(startDate + 'T00:00:00.000Z');
      const end = new Date(endDate + 'T23:59:59.999Z');
      
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
        ['Periode', `${new Date(startDate).toLocaleDateString('id-ID')} - ${new Date(endDate).toLocaleDateString('id-ID')}`],
        [],
        ['Ringkasan Keuangan'],
        ['Total Penjualan', Number(salesReport?.totalSales || 0)],
        ['Omset Servis', Number(serviceReport?.totalRevenue || 0)],
        ['Total Pemasukan', Number(financialReport?.totalIncome || 0)],
        ['Total Pengeluaran', Number(financialReport?.totalExpense || 0)],
        ['Laba Bersih', Number(financialReport?.profit || 0)],
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
      const start = new Date(startDate + 'T00:00:00.000Z');
      const end = new Date(endDate + 'T23:59:59.999Z');
      
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

  app.post('/api/products', isAuthenticated, async (req, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      const productWithCodes = {
        ...productData,
        sku: generateSKU(),
        barcode: generateBarcode(),
      };
      const product = await storage.createProduct(productWithCodes);
      res.json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.put('/api/products/:id', isAuthenticated, async (req, res) => {
    try {
      const productData = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(req.params.id, productData);
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete('/api/products/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteProduct(req.params.id);
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Specialized pricing management endpoint
  app.patch('/api/products/:id/pricing', isAuthenticated, async (req, res) => {
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
      
      res.json({
        ...updatedProduct,
        currentHPP: currentHPP
      });
    } catch (error) {
      console.error("Error updating product pricing:", error);
      res.status(500).json({ message: "Failed to update product pricing" });
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
      
      res.json(order);
    } catch (error) {
      console.error("Error creating purchase order:", error);
      res.status(500).json({ message: "Failed to create purchase order" });
    }
  });

  app.post('/api/purchase-orders/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      const order = await storage.approvePurchaseOrder(req.params.id, req.session.user.id);
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
        unitCost: String(unitCost), // Maps to unit_cost (varchar)
        totalCost: String(quantity * unitCost), // Maps to total_cost (varchar)
        notes: req.body.notes || "",
      };
      console.log("Creating PO item with data:", itemData);
      const item = await storage.createPurchaseOrderItem(itemData);
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
      res.json({ message: "Items received successfully" });
    } catch (error) {
      console.error("Error receiving items:", error);
      res.status(500).json({ message: "Failed to receive items", error: (error as Error).message });
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

  app.post('/api/customers', isAuthenticated, async (req, res) => {
    try {
      const customerData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(customerData);
      res.json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  app.put('/api/customers/:id', isAuthenticated, async (req, res) => {
    try {
      const customerData = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(req.params.id, customerData);
      res.json(customer);
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(500).json({ message: "Failed to update customer" });
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
      const { transaction: transactionData, items } = createTransactionSchema.parse(req.body);
      
      // Generate transaction number
      const transactionNumber = `TRX-${Date.now()}`;
      
      // Add transaction number and user ID to transaction data
      const completeTransactionData = {
        ...transactionData,
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
      
      // Manual validation and transformation
      const { customerId, deviceType, deviceBrand, deviceModel, serialNumber, completeness, problem, diagnosis, solution, status, technicianId, estimatedCost, laborCost } = req.body;
      
      const ticketData = {
        customerId: customerId || "",
        deviceType: deviceType || "",
        deviceBrand: deviceBrand || null,
        deviceModel: deviceModel || null,
        serialNumber: serialNumber || null,
        completeness: completeness || null,
        problem: problem || "",
        diagnosis: diagnosis || null,
        solution: solution || null,
        status: status || 'pending',
        technicianId: technicianId || null,
        estimatedCost: estimatedCost ? String(estimatedCost) : null,
        laborCost: laborCost ? String(laborCost) : null,
        actualCost: null,
        partsCost: null,
        estimatedCompletion: null,
        completedAt: null,
      };
      
      console.log("Processed ticket data:", JSON.stringify(ticketData, null, 2));
      
      // Generate ticket number
      const ticketNumber = `SVC-${Date.now()}`;
      
      const ticket = await storage.createServiceTicket({
        ...ticketData,
        ticketNumber,
      });
      
      // Send WhatsApp notification for new service (async, don't block response)
      setImmediate(async () => {
        let retryCount = 0;
        const maxRetries = 3;
        
        const attemptNotification = async (): Promise<void> => {
          try {
            const config = await storage.getStoreConfig();
            console.log(`🔔 Service creation notification attempt ${retryCount + 1}/${maxRetries} for ticket ${ticket.ticketNumber}`);
            
            if (config?.whatsappEnabled) {
              console.log(`WhatsApp enabled in config, checking connection...`);
              
              if (whatsappService.isConnected()) {
                console.log(`WhatsApp connected, getting customer data...`);
                const customer = await storage.getCustomerById(ticket.customerId);
                
                if (customer?.phone) {
                  console.log(`Sending service creation notification to ${customer.phone}...`);
                  const success = await whatsappService.sendServiceCreatedNotification(
                    customer.phone,
                    ticket,
                    customer,
                    config
                  );
                  
                  if (!success && retryCount < maxRetries - 1) {
                    retryCount++;
                    console.log(`Retrying service creation notification in 2 seconds...`);
                    setTimeout(() => attemptNotification(), 2000);
                  }
                } else {
                  console.log('No phone number for customer, skipping WhatsApp notification');
                }
              } else {
                console.log(`WhatsApp not connected, skipping notification`);
              }
            } else {
              console.log('WhatsApp not enabled in config, skipping notification');
            }
          } catch (error) {
            console.error(`Error sending WhatsApp notification for new service (attempt ${retryCount + 1}):`, error);
            if (retryCount < maxRetries - 1) {
              retryCount++;
              console.log(`Retrying service creation notification in 2 seconds...`);
              setTimeout(() => attemptNotification(), 2000);
            }
          }
        };
        
        await attemptNotification();
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
      const { customerId, deviceType, deviceBrand, deviceModel, serialNumber, completeness, problem, diagnosis, solution, status, technicianId, estimatedCost, laborCost, parts } = req.body;
      
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
          let retryCount = 0;
          const maxRetries = 3;
          
          const attemptStatusNotification = async (): Promise<void> => {
            try {
              const config = await storage.getStoreConfig();
              console.log(`🔄 Status update notification attempt ${retryCount + 1}/${maxRetries} for ticket ${ticket.ticketNumber}: ${oldTicket.status} → ${status}`);
              
              if (config?.whatsappEnabled) {
                console.log(`WhatsApp enabled in config, checking connection...`);
                
                if (whatsappService.isConnected()) {
                  console.log(`WhatsApp connected, getting customer data...`);
                  const customer = await storage.getCustomerById(ticket.customerId);
                  
                  if (customer?.phone) {
                    console.log(`Sending status update notification to ${customer.phone}...`);
                    const success = await whatsappService.sendServiceStatusNotification(
                      customer.phone,
                      ticket,
                      customer,
                      config
                    );
                    
                    if (!success && retryCount < maxRetries - 1) {
                      retryCount++;
                      console.log(`Retrying status notification in 2 seconds...`);
                      setTimeout(() => attemptStatusNotification(), 2000);
                    }
                  } else {
                    console.log('No phone number for customer, skipping WhatsApp status notification');
                  }
                } else {
                  console.log(`WhatsApp not connected for status update, current state: ${whatsappService.getConnectionState()}`);
                  
                  // Force reconnect attempt for status updates
                  if (retryCount < maxRetries - 1) {
                    console.log('Attempting WhatsApp reconnect for status notification...');
                    whatsappService.initialize(); // Trigger reconnection
                    retryCount++;
                    setTimeout(() => attemptStatusNotification(), 5000); // Longer wait for reconnect
                  }
                }
              } else {
                console.log('WhatsApp not enabled in config, skipping status notification');
              }
            } catch (error) {
              console.error(`Error sending WhatsApp notification for status change (attempt ${retryCount + 1}):`, error);
              if (retryCount < maxRetries - 1) {
                retryCount++;
                console.log(`Retrying status notification in 2 seconds...`);
                setTimeout(() => attemptStatusNotification(), 2000);
              }
            }
          };
          
          await attemptStatusNotification();
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


  // User Management routes
  app.get('/api/users', isAuthenticated, async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put('/api/users/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userData = req.body;
      const user = await storage.updateUser(id, userData);
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete('/api/users/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteUser(id);
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
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
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
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
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
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
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

      // Update setup steps
      const config = await storage.getStoreConfig();
      const setupSteps = config?.setupSteps ? JSON.parse(config.setupSteps) : {};
      setupSteps.database = true;

      if (config) {
        await storage.upsertStoreConfig({
          ...config,
          setupSteps: JSON.stringify(setupSteps)
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
      const clientId = req.tenant?.clientId || null;
      
      const config = await storage.getStoreConfig(clientId);
      const userCount = await storage.getUserCount(clientId);
      
      const isSetupCompleted = Boolean(
        config && 
        config.name && 
        config.setupCompleted !== false &&
        userCount > 0
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
      if (error.code !== '42P01') {  
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
      const clientId = req.tenant?.clientId || null;
      
      const existingConfig = await storage.getStoreConfig(clientId);
      const setupSteps = existingConfig?.setupSteps ? JSON.parse(existingConfig.setupSteps) : {};
      setupSteps.store = true;

      await storage.upsertStoreConfig({
        id: existingConfig?.id || undefined,
        name,
        address: address || '',
        phone: phone || '',
        email: email || '',
        taxRate: taxRate || '11.00',
        setupSteps: JSON.stringify(setupSteps),
        setupCompleted: false, // Will be completed in final step
      });

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
  app.post('/api/setup/admin', async (req, res) => {
    try {
      const { username, password, email, firstName, lastName } = req.body;
      
      if (!username || !password || !email) {
        return res.status(400).json({ message: 'Username, password, and email are required' });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      const emailExists = await storage.getUserByEmail(email);
      if (emailExists) {
        return res.status(400).json({ message: 'Email already exists' });
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(password);
      
      await storage.createUser({
        username,
        password: hashedPassword,
        email,
        firstName: firstName || 'System',
        lastName: lastName || 'Administrator',
        role: 'admin',
        isActive: true,
        profileImageUrl: null
      });

      // Update setup steps
      const config = await storage.getStoreConfig();
      const setupSteps = config?.setupSteps ? JSON.parse(config.setupSteps) : {};
      setupSteps.admin = true;

      if (config) {
        await storage.upsertStoreConfig({
          ...config,
          setupSteps: JSON.stringify(setupSteps)
        });
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
            description: 'Lokasi utama toko',
            address: 'Alamat toko utama'
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
        await financeManager.initializeDefaultAccounts();
        console.log('✅ Default chart of accounts initialized');
      } catch (error) {
        console.error('Error initializing accounts:', error);
      }

      // Initialize WhatsApp service config (prevent crashes)
      try {
        const config = await storage.getStoreConfig();
        if (config && (!config.whatsappEnabled || config.whatsappEnabled === null)) {
          await storage.upsertStoreConfig({
            ...config,
            whatsappEnabled: false,
            whatsappConnected: false,
            whatsappPhone: null,
            whatsappApiKey: null
          });
          console.log('✅ WhatsApp service config initialized (disabled by default)');
        }
      } catch (error) {
        console.error('Error initializing WhatsApp config:', error);
      }

      // Update setup steps
      const config = await storage.getStoreConfig();
      const setupSteps = config?.setupSteps ? JSON.parse(config.setupSteps) : {};
      setupSteps.initialData = true;

      if (config) {
        await storage.upsertStoreConfig({
          ...config,
          setupSteps: JSON.stringify(setupSteps)
        });
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
  app.post('/api/setup/complete', async (req, res) => {
    try {
      const config = await storage.getStoreConfig();
      
      if (!config) {
        return res.status(400).json({ message: 'Store configuration not found' });
      }

      const setupSteps = config.setupSteps ? JSON.parse(config.setupSteps) : {};
      setupSteps.completed = true;

      await storage.upsertStoreConfig({
        ...config,
        setupCompleted: true,
        setupSteps: JSON.stringify(setupSteps)
      });

      res.json({ 
        success: true, 
        message: 'Setup completed successfully! You can now use the application.' 
      });
    } catch (error) {
      console.error('Error completing setup:', error);
      res.status(500).json({ message: 'Failed to complete setup' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
