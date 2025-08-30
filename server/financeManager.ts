import { db } from "./db";
import { 
  financialRecords, 
  employees, 
  payrollRecords, 
  attendanceRecords,
  type InsertFinancialRecord,
  type FinancialRecord,
  type InsertEmployee,
  type Employee,
  type InsertPayrollRecord,
  type PayrollRecord,
  type InsertAttendanceRecord,
  type AttendanceRecord
} from "@shared/schema";
import { eq, and, gte, lte, desc, sum, count } from "drizzle-orm";

export class FinanceManager {
  // Financial Transactions
  async createTransaction(data: {
    type: 'income' | 'expense' | 'transfer';
    category: string;
    subcategory?: string;
    amount: string;
    description: string;
    referenceType?: string;
    reference?: string;
    paymentMethod?: string;
    tags?: string[];
    userId: string;
  }): Promise<FinancialRecord> {
    const [record] = await db.insert(financialRecords).values({
      type: data.type,
      category: data.category,
      subcategory: data.subcategory,
      amount: data.amount,
      description: data.description,
      reference: data.reference,
      referenceType: data.referenceType,
      paymentMethod: data.paymentMethod,
      tags: data.tags,
      status: 'confirmed',
      userId: data.userId
    }).returning();
    return record;
  }

  async getTransactions(filters?: {
    type?: string;
    category?: string;
    startDate?: Date;
    endDate?: Date;
    referenceType?: string;
  }): Promise<FinancialRecord[]> {
    const conditions = [];
    if (filters?.type) conditions.push(eq(financialRecords.type, filters.type));
    if (filters?.category) conditions.push(eq(financialRecords.category, filters.category));
    if (filters?.referenceType) conditions.push(eq(financialRecords.referenceType, filters.referenceType));
    if (filters?.startDate) conditions.push(gte(financialRecords.createdAt, filters.startDate));
    if (filters?.endDate) conditions.push(lte(financialRecords.createdAt, filters.endDate));
    
    if (conditions.length > 0) {
      return await db
        .select()
        .from(financialRecords)
        .where(and(...conditions))
        .orderBy(desc(financialRecords.createdAt));
    }
    
    return await db
      .select()
      .from(financialRecords)
      .orderBy(desc(financialRecords.createdAt));
  }

  async getSummary(startDate?: Date, endDate?: Date): Promise<{
    totalIncome: string;
    totalExpense: string;
    netProfit: string;
    transactionCount: number;
    breakdown: {
      categories: { [key: string]: { income: number; expense: number } };
      paymentMethods: { [key: string]: number };
    };
  }> {
    const conditions = [];
    if (startDate) conditions.push(gte(financialRecords.createdAt, startDate));
    if (endDate) conditions.push(lte(financialRecords.createdAt, endDate));
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Total income
    const [incomeResult] = await db
      .select({ total: sum(financialRecords.amount) })
      .from(financialRecords)
      .where(and(eq(financialRecords.type, 'income'), whereClause));
    
    // Total expense
    const [expenseResult] = await db
      .select({ total: sum(financialRecords.amount) })
      .from(financialRecords)
      .where(and(eq(financialRecords.type, 'expense'), whereClause));
    
    // Count
    const [countResult] = await db
      .select({ count: count() })
      .from(financialRecords)
      .where(whereClause);
    
    const totalIncome = Number(incomeResult.total || 0);
    const totalExpense = Number(expenseResult.total || 0);
    
    return {
      totalIncome: totalIncome.toString(),
      totalExpense: totalExpense.toString(),
      netProfit: (totalIncome - totalExpense).toString(),
      transactionCount: countResult.count,
      breakdown: {
        categories: {},
        paymentMethods: {}
      }
    };
  }

  // Employee Management
  async createEmployee(data: InsertEmployee): Promise<Employee> {
    const employeeNumber = `EMP${Date.now().toString().slice(-6)}`;
    const [employee] = await db.insert(employees).values({
      ...data,
      employeeNumber
    }).returning();
    return employee;
  }

  async getEmployees(includeInactive = false): Promise<Employee[]> {
    if (!includeInactive) {
      return await db
        .select()
        .from(employees)
        .where(eq(employees.status, 'active'))
        .orderBy(employees.name);
    }
    
    return await db
      .select()
      .from(employees)
      .orderBy(employees.name);
  }

  async getEmployeeById(id: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee;
  }

  async updateEmployee(id: string, data: Partial<InsertEmployee>): Promise<Employee> {
    const [employee] = await db
      .update(employees)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(employees.id, id))
      .returning();
    return employee;
  }

  // Payroll Management
  async createPayroll(data: {
    employeeId: string;
    periodStart: Date;
    periodEnd: Date;
    baseSalary: string;
    overtime?: string;
    bonus?: string;
    allowances?: string;
    taxDeduction?: string;
    socialSecurity?: string;
    healthInsurance?: string;
    otherDeductions?: string;
    userId: string;
  }): Promise<PayrollRecord> {
    const payrollNumber = `PAY${Date.now().toString().slice(-8)}`;
    
    const baseSalary = Number(data.baseSalary);
    const overtime = Number(data.overtime || 0);
    const bonus = Number(data.bonus || 0);
    const allowances = Number(data.allowances || 0);
    const grossPay = baseSalary + overtime + bonus + allowances;
    
    const taxDeduction = Number(data.taxDeduction || 0);
    const socialSecurity = Number(data.socialSecurity || 0);
    const healthInsurance = Number(data.healthInsurance || 0);
    const otherDeductions = Number(data.otherDeductions || 0);
    const totalDeductions = taxDeduction + socialSecurity + healthInsurance + otherDeductions;
    
    const netPay = grossPay - totalDeductions;
    
    const [payroll] = await db.insert(payrollRecords).values({
      employeeId: data.employeeId,
      payrollNumber,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      baseSalary: data.baseSalary,
      overtime: data.overtime || "0",
      bonus: data.bonus || "0",
      allowances: data.allowances || "0",
      grossPay: grossPay.toString(),
      taxDeduction: data.taxDeduction || "0",
      socialSecurity: data.socialSecurity || "0",
      healthInsurance: data.healthInsurance || "0",
      otherDeductions: data.otherDeductions || "0",
      netPay: netPay.toString(),
      status: 'draft',
      userId: data.userId
    }).returning();
    
    return payroll;
  }

  async getPayrollRecords(employeeId?: string): Promise<PayrollRecord[]> {
    if (employeeId) {
      return await db
        .select()
        .from(payrollRecords)
        .where(eq(payrollRecords.employeeId, employeeId))
        .orderBy(desc(payrollRecords.createdAt));
    }
    
    return await db
      .select()
      .from(payrollRecords)
      .orderBy(desc(payrollRecords.createdAt));
  }

  async updatePayrollStatus(id: string, status: 'draft' | 'approved' | 'paid'): Promise<PayrollRecord> {
    const [payroll] = await db
      .update(payrollRecords)
      .set({ 
        status, 
        paidDate: status === 'paid' ? new Date() : null,
        updatedAt: new Date() 
      })
      .where(eq(payrollRecords.id, id))
      .returning();
    
    // Create financial record when marked as paid
    if (status === 'paid' && payroll) {
      const existingRecord = await db
        .select()
        .from(financialRecords)
        .where(and(
          eq(financialRecords.referenceType, 'payroll'),
          eq(financialRecords.reference, payroll.id)
        ));
      
      if (existingRecord.length === 0) {
        await this.createTransaction({
          type: 'expense',
          category: 'Payroll',
          subcategory: 'Salary',
          amount: payroll.netPay,
          description: `Gaji ${payroll.payrollNumber}`,
          referenceType: 'payroll',
          reference: payroll.id,
          paymentMethod: 'bank_transfer',
          userId: payroll.userId || '46332812'
        });
      }
    }
    
    return payroll;
  }

  // Attendance Management
  async createAttendance(data: InsertAttendanceRecord): Promise<AttendanceRecord> {
    const [attendance] = await db.insert(attendanceRecords).values(data).returning();
    return attendance;
  }

  async getAttendanceRecords(employeeId?: string, startDate?: Date, endDate?: Date): Promise<AttendanceRecord[]> {
    const conditions = [];
    if (employeeId) conditions.push(eq(attendanceRecords.employeeId, employeeId));
    if (startDate) conditions.push(gte(attendanceRecords.date, startDate));
    if (endDate) conditions.push(lte(attendanceRecords.date, endDate));
    
    if (conditions.length > 0) {
      return await db
        .select()
        .from(attendanceRecords)
        .where(and(...conditions))
        .orderBy(desc(attendanceRecords.date));
    }
    
    return await db
      .select()
      .from(attendanceRecords)
      .orderBy(desc(attendanceRecords.date));
  }

  // Service Integration
  async recordServiceIncome(serviceId: string, amount: string, description: string, userId: string): Promise<void> {
    // Check if record already exists
    const existingRecord = await db
      .select()
      .from(financialRecords)
      .where(and(
        eq(financialRecords.referenceType, 'service'),
        eq(financialRecords.reference, serviceId),
        eq(financialRecords.type, 'income')
      ));
    
    if (existingRecord.length === 0) {
      await this.createTransaction({
        type: 'income',
        category: 'Service Revenue',
        subcategory: 'Repair Service',
        amount,
        description,
        referenceType: 'service',
        reference: serviceId,
        paymentMethod: 'cash',
        userId
      });
    }
  }

  async recordPartsCost(serviceId: string, partName: string, quantity: number, modalPrice: string, sellingPrice: string, userId: string): Promise<void> {
    // Record parts cost (modal/purchase price) as expense
    const modalAmount = (Number(modalPrice) * quantity).toString();
    const existingModalRecord = await db
      .select()
      .from(financialRecords)
      .where(and(
        eq(financialRecords.referenceType, 'service_parts_cost'),
        eq(financialRecords.reference, serviceId),
        eq(financialRecords.description, `Biaya modal ${partName} (${quantity}x)`)
      ));

    if (existingModalRecord.length === 0) {
      await this.createTransaction({
        type: 'expense',
        category: 'Cost of Goods Sold',
        subcategory: 'Parts Cost',
        amount: modalAmount,
        description: `Biaya modal ${partName} (${quantity}x)`,
        referenceType: 'service_parts_cost',
        reference: serviceId,
        paymentMethod: 'inventory',
        userId
      });
    }

    // Record parts revenue (selling price) as income
    const sellingAmount = (Number(sellingPrice) * quantity).toString();
    const existingSellingRecord = await db
      .select()
      .from(financialRecords)
      .where(and(
        eq(financialRecords.referenceType, 'service_parts_revenue'),
        eq(financialRecords.reference, serviceId),
        eq(financialRecords.description, `Penjualan ${partName} (${quantity}x)`)
      ));

    if (existingSellingRecord.length === 0) {
      await this.createTransaction({
        type: 'income',
        category: 'Service Revenue',
        subcategory: 'Parts Sales',
        amount: sellingAmount,
        description: `Penjualan ${partName} (${quantity}x)`,
        referenceType: 'service_parts_revenue',
        reference: serviceId,
        paymentMethod: 'cash',
        userId
      });
    }
  }

  async recordLaborCost(serviceId: string, laborCost: string, description: string, userId: string): Promise<void> {
    // Check if record already exists
    const existingRecord = await db
      .select()
      .from(financialRecords)
      .where(and(
        eq(financialRecords.referenceType, 'service_labor'),
        eq(financialRecords.reference, serviceId),
        eq(financialRecords.type, 'income')
      ));
    
    if (existingRecord.length === 0 && Number(laborCost) > 0) {
      await this.createTransaction({
        type: 'income',
        category: 'Service Revenue',
        subcategory: 'Labor Charge',
        amount: laborCost,
        description: `Ongkos tenaga kerja - ${description}`,
        referenceType: 'service_labor',
        reference: serviceId,
        paymentMethod: 'cash',
        userId
      });
    }
  }

  // Categories and Analytics
  async getFinancialCategories(): Promise<{
    incomeCategories: string[];
    expenseCategories: string[];
  }> {
    const records = await db.select().from(financialRecords);
    
    const incomeSet = new Set<string>();
    const expenseSet = new Set<string>();
    
    records.forEach(r => {
      if (r.type === 'income') {
        incomeSet.add(r.category);
      } else if (r.type === 'expense') {
        expenseSet.add(r.category);
      }
    });
    
    return { 
      incomeCategories: Array.from(incomeSet),
      expenseCategories: Array.from(expenseSet)
    };
  }
}

export const financeManager = new FinanceManager();