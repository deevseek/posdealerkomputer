import type {
  InstallationStep,
  DiscountConfig,
  TrackingConfig,
  WhatsappConfig,
  PrintLayout,
  ExpenseCategory,
  DailyExpense,
  InsertInstallationStep,
  InsertDiscountConfig,
  InsertTrackingConfig,
  InsertWhatsappConfig,
  InsertPrintLayout,
  InsertExpenseCategory,
  InsertDailyExpense,
} from "@shared/schema";

export interface IStorage {
  // Installation steps
  getInstallationSteps(): Promise<InstallationStep[]>;
  createInstallationStep(step: InsertInstallationStep): Promise<InstallationStep>;
  updateInstallationStep(id: string, updates: Partial<InstallationStep>): Promise<InstallationStep>;
  
  // Discount configuration
  getDiscountConfigs(): Promise<DiscountConfig[]>;
  createDiscountConfig(config: InsertDiscountConfig): Promise<DiscountConfig>;
  updateDiscountConfig(id: string, updates: Partial<DiscountConfig>): Promise<DiscountConfig>;
  
  // Tracking configuration
  getTrackingConfig(): Promise<TrackingConfig | null>;
  createTrackingConfig(config: InsertTrackingConfig): Promise<TrackingConfig>;
  updateTrackingConfig(id: string, updates: Partial<TrackingConfig>): Promise<TrackingConfig>;
  
  // WhatsApp configuration
  getWhatsappConfig(): Promise<WhatsappConfig | null>;
  createWhatsappConfig(config: InsertWhatsappConfig): Promise<WhatsappConfig>;
  updateWhatsappConfig(id: string, updates: Partial<WhatsappConfig>): Promise<WhatsappConfig>;
  
  // Print layouts
  getPrintLayouts(): Promise<PrintLayout[]>;
  createPrintLayout(layout: InsertPrintLayout): Promise<PrintLayout>;
  updatePrintLayout(id: string, updates: Partial<PrintLayout>): Promise<PrintLayout>;
  
  // Expense categories
  getExpenseCategories(): Promise<ExpenseCategory[]>;
  createExpenseCategory(category: InsertExpenseCategory): Promise<ExpenseCategory>;
  updateExpenseCategory(id: string, updates: Partial<ExpenseCategory>): Promise<ExpenseCategory>;
  
  // Daily expenses
  getDailyExpenses(date?: Date): Promise<DailyExpense[]>;
  createDailyExpense(expense: InsertDailyExpense): Promise<DailyExpense>;
  updateDailyExpense(id: string, updates: Partial<DailyExpense>): Promise<DailyExpense>;
  deleteDailyExpense(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private installationSteps: InstallationStep[] = [];
  private discountConfigs: DiscountConfig[] = [];
  private trackingConfig: TrackingConfig | null = null;
  private whatsappConfig: WhatsappConfig | null = null;
  private printLayouts: PrintLayout[] = [];
  private expenseCategories: ExpenseCategory[] = [];
  private dailyExpenses: DailyExpense[] = [];

  constructor() {
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    // Initialize installation steps
    const steps: InsertInstallationStep[] = [
      {
        id: "transaction-discount",
        name: "Transaction System",
        description: "Discount Management",
        status: "completed",
        progress: 100,
        features: ["Percentage discounts", "Rupiah discounts", "Transaction validation"],
      },
      {
        id: "online-tracking",
        name: "Online Tracking",
        description: "Auto Service Links",
        status: "completed",
        progress: 100,
        features: ["Auto-generated links", "One-click tracking", "Service status display"],
      },
      {
        id: "whatsapp-api",
        name: "WhatsApp API",
        description: "Connection Issues",
        status: "in_progress",
        progress: 75,
        features: ["Message queue", "Retry mechanism", "Status logging"],
      },
      {
        id: "print-layouts",
        name: "Print Layouts",
        description: "Receipt Templates",
        status: "completed",
        progress: 100,
        features: ["Service receipts", "Payment receipts", "Sales receipts"],
      },
      {
        id: "daily-expenses",
        name: "Daily Expenses",
        description: "Tracking System",
        status: "completed",
        progress: 100,
        features: ["Expense categories", "Quick entry", "Daily summaries"],
      },
    ];

    steps.forEach((step, index) => {
      this.installationSteps.push({
        ...step,
        createdAt: new Date(Date.now() - (steps.length - index) * 60000),
        updatedAt: new Date(),
      });
    });

    // Initialize discount configurations
    this.discountConfigs = [
      {
        id: "percentage-discount",
        type: "percentage",
        maxValue: 50,
        minTransactionAmount: 100000,
        isActive: true,
        description: "Percentage-based discount up to 50%",
        createdAt: new Date(),
      },
      {
        id: "rupiah-discount",
        type: "rupiah",
        maxValue: 200000,
        minTransactionAmount: 300000,
        isActive: true,
        description: "Fixed amount discount up to Rp 200,000",
        createdAt: new Date(),
      },
    ];

    // Initialize tracking config
    this.trackingConfig = {
      id: "tracking-config",
      baseUrl: "https://service.app",
      autoGenerateLinks: true,
      linkFormat: "/track/{serviceId}",
      isActive: true,
      createdAt: new Date(),
    };

    // Initialize WhatsApp config
    this.whatsappConfig = {
      id: "whatsapp-config",
      apiUrl: "https://api.whatsapp.business",
      apiKey: process.env.WHATSAPP_API_KEY || "default_key",
      webhookUrl: "https://service.app/webhooks/whatsapp",
      status: "connected",
      lastMessageSent: new Date(Date.now() - 30 * 60000),
      messagesSentToday: 247,
      pendingMessages: 12,
      failedMessages: 3,
      retryAttempts: 3,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Initialize print layouts
    const printLayouts: InsertPrintLayout[] = [
      {
        id: "service-receipt-a4",
        type: "service_receipt",
        paperSize: "a4",
        fontSize: "normal",
        logoPosition: "center_top",
        template: "<div>Service Receipt Template</div>",
        isDefault: true,
        isActive: true,
      },
      {
        id: "payment-receipt-a4",
        type: "payment_receipt",
        paperSize: "a4",
        fontSize: "normal",
        logoPosition: "center_top",
        template: "<div>Payment Receipt Template</div>",
        isDefault: true,
        isActive: true,
      },
      {
        id: "sales-receipt-thermal",
        type: "sales_receipt",
        paperSize: "thermal_80",
        fontSize: "small",
        logoPosition: "center_top",
        template: "<div>Sales Receipt Template</div>",
        isDefault: true,
        isActive: true,
      },
    ];

    printLayouts.forEach(layout => {
      this.printLayouts.push({
        ...layout,
        createdAt: new Date(),
      });
    });

    // Initialize expense categories
    const categories: InsertExpenseCategory[] = [
      { id: "electricity", name: "Listrik", description: "Utilitas", icon: "fas fa-bolt", color: "red" },
      { id: "fuel", name: "Bensin", description: "Transportasi", icon: "fas fa-gas-pump", color: "blue" },
      { id: "food", name: "Makan Minum", description: "Konsumsi", icon: "fas fa-utensils", color: "green" },
      { id: "stamps", name: "Salam Tempel", description: "Administrasi", icon: "fas fa-sticky-note", color: "purple" },
      { id: "deposits", name: "Titipan", description: "Dibawah Meja", icon: "fas fa-table", color: "yellow" },
      { id: "gratification", name: "Gratifikasi", description: "Hubungan", icon: "fas fa-handshake", color: "pink" },
      { id: "maintenance", name: "Maintenance", description: "Perawatan", icon: "fas fa-wrench", color: "gray" },
      { id: "others", name: "Lainnya", description: "Custom", icon: "fas fa-plus", color: "indigo" },
    ];

    categories.forEach(category => {
      this.expenseCategories.push({
        ...category,
        isActive: true,
        createdAt: new Date(),
      });
    });

    // Initialize some sample daily expenses
    const today = new Date();
    const sampleExpenses: InsertDailyExpense[] = [
      {
        id: "expense-1",
        categoryId: "electricity",
        amount: 150000,
        description: "Token PLN 100kWh",
        date: today,
        time: "10:30",
        userId: "admin",
      },
      {
        id: "expense-2",
        categoryId: "fuel",
        amount: 200000,
        description: "Pertalite 20 Liter",
        date: today,
        time: "14:15",
        userId: "admin",
      },
      {
        id: "expense-3",
        categoryId: "food",
        amount: 85000,
        description: "Konsumsi karyawan",
        date: today,
        time: "12:00",
        userId: "admin",
      },
      {
        id: "expense-4",
        categoryId: "gratification",
        amount: 50000,
        description: "Apresiasi client",
        date: today,
        time: "16:45",
        userId: "admin",
      },
    ];

    sampleExpenses.forEach(expense => {
      this.dailyExpenses.push({
        ...expense,
        createdAt: new Date(),
      });
    });
  }

  // Installation steps
  async getInstallationSteps(): Promise<InstallationStep[]> {
    return [...this.installationSteps];
  }

  async createInstallationStep(step: InsertInstallationStep): Promise<InstallationStep> {
    const newStep: InstallationStep = {
      ...step,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.installationSteps.push(newStep);
    return newStep;
  }

  async updateInstallationStep(id: string, updates: Partial<InstallationStep>): Promise<InstallationStep> {
    const index = this.installationSteps.findIndex(step => step.id === id);
    if (index === -1) throw new Error("Installation step not found");
    
    this.installationSteps[index] = {
      ...this.installationSteps[index],
      ...updates,
      updatedAt: new Date(),
    };
    return this.installationSteps[index];
  }

  // Discount configurations
  async getDiscountConfigs(): Promise<DiscountConfig[]> {
    return [...this.discountConfigs];
  }

  async createDiscountConfig(config: InsertDiscountConfig): Promise<DiscountConfig> {
    const newConfig: DiscountConfig = {
      ...config,
      id: `discount-${Date.now()}`,
      createdAt: new Date(),
    };
    this.discountConfigs.push(newConfig);
    return newConfig;
  }

  async updateDiscountConfig(id: string, updates: Partial<DiscountConfig>): Promise<DiscountConfig> {
    const index = this.discountConfigs.findIndex(config => config.id === id);
    if (index === -1) throw new Error("Discount config not found");
    
    this.discountConfigs[index] = { ...this.discountConfigs[index], ...updates };
    return this.discountConfigs[index];
  }

  // Tracking configuration
  async getTrackingConfig(): Promise<TrackingConfig | null> {
    return this.trackingConfig;
  }

  async createTrackingConfig(config: InsertTrackingConfig): Promise<TrackingConfig> {
    const newConfig: TrackingConfig = {
      ...config,
      id: `tracking-${Date.now()}`,
      createdAt: new Date(),
    };
    this.trackingConfig = newConfig;
    return newConfig;
  }

  async updateTrackingConfig(id: string, updates: Partial<TrackingConfig>): Promise<TrackingConfig> {
    if (!this.trackingConfig || this.trackingConfig.id !== id) {
      throw new Error("Tracking config not found");
    }
    
    this.trackingConfig = { ...this.trackingConfig, ...updates };
    return this.trackingConfig;
  }

  // WhatsApp configuration
  async getWhatsappConfig(): Promise<WhatsappConfig | null> {
    return this.whatsappConfig;
  }

  async createWhatsappConfig(config: InsertWhatsappConfig): Promise<WhatsappConfig> {
    const newConfig: WhatsappConfig = {
      ...config,
      id: `whatsapp-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.whatsappConfig = newConfig;
    return newConfig;
  }

  async updateWhatsappConfig(id: string, updates: Partial<WhatsappConfig>): Promise<WhatsappConfig> {
    if (!this.whatsappConfig || this.whatsappConfig.id !== id) {
      throw new Error("WhatsApp config not found");
    }
    
    this.whatsappConfig = {
      ...this.whatsappConfig,
      ...updates,
      updatedAt: new Date(),
    };
    return this.whatsappConfig;
  }

  // Print layouts
  async getPrintLayouts(): Promise<PrintLayout[]> {
    return [...this.printLayouts];
  }

  async createPrintLayout(layout: InsertPrintLayout): Promise<PrintLayout> {
    const newLayout: PrintLayout = {
      ...layout,
      id: `layout-${Date.now()}`,
      createdAt: new Date(),
    };
    this.printLayouts.push(newLayout);
    return newLayout;
  }

  async updatePrintLayout(id: string, updates: Partial<PrintLayout>): Promise<PrintLayout> {
    const index = this.printLayouts.findIndex(layout => layout.id === id);
    if (index === -1) throw new Error("Print layout not found");
    
    this.printLayouts[index] = { ...this.printLayouts[index], ...updates };
    return this.printLayouts[index];
  }

  // Expense categories
  async getExpenseCategories(): Promise<ExpenseCategory[]> {
    return [...this.expenseCategories];
  }

  async createExpenseCategory(category: InsertExpenseCategory): Promise<ExpenseCategory> {
    const newCategory: ExpenseCategory = {
      ...category,
      id: `category-${Date.now()}`,
      createdAt: new Date(),
    };
    this.expenseCategories.push(newCategory);
    return newCategory;
  }

  async updateExpenseCategory(id: string, updates: Partial<ExpenseCategory>): Promise<ExpenseCategory> {
    const index = this.expenseCategories.findIndex(category => category.id === id);
    if (index === -1) throw new Error("Expense category not found");
    
    this.expenseCategories[index] = { ...this.expenseCategories[index], ...updates };
    return this.expenseCategories[index];
  }

  // Daily expenses
  async getDailyExpenses(date?: Date): Promise<DailyExpense[]> {
    if (!date) {
      return [...this.dailyExpenses];
    }
    
    const targetDate = new Date(date);
    return this.dailyExpenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return (
        expenseDate.getFullYear() === targetDate.getFullYear() &&
        expenseDate.getMonth() === targetDate.getMonth() &&
        expenseDate.getDate() === targetDate.getDate()
      );
    });
  }

  async createDailyExpense(expense: InsertDailyExpense): Promise<DailyExpense> {
    const newExpense: DailyExpense = {
      ...expense,
      id: `expense-${Date.now()}`,
      createdAt: new Date(),
    };
    this.dailyExpenses.push(newExpense);
    return newExpense;
  }

  async updateDailyExpense(id: string, updates: Partial<DailyExpense>): Promise<DailyExpense> {
    const index = this.dailyExpenses.findIndex(expense => expense.id === id);
    if (index === -1) throw new Error("Daily expense not found");
    
    this.dailyExpenses[index] = { ...this.dailyExpenses[index], ...updates };
    return this.dailyExpenses[index];
  }

  async deleteDailyExpense(id: string): Promise<void> {
    const index = this.dailyExpenses.findIndex(expense => expense.id === id);
    if (index === -1) throw new Error("Daily expense not found");
    
    this.dailyExpenses.splice(index, 1);
  }
}

export const storage = new MemStorage();
