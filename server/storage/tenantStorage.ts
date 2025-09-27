import { DatabaseStorage } from '../storage';
import { Request } from 'express';
import { eq, and } from 'drizzle-orm';
import * as schema from '../../shared/schema';
import type {
  InsertUser,
  InsertProduct,
  InsertTransaction,
  InsertTransactionItem,
  InsertCustomer,
  InsertServiceTicket,
  InsertStoreConfig,
} from '../../shared/schema';

// Tenant-aware storage wrapper that adds client_id filtering to all operations
export class TenantStorage extends DatabaseStorage {
  private clientId: string;

  constructor(clientId: string) {
    super();
    this.clientId = clientId;
  }

  // Override user operations to include tenant filtering
  async getUserByUsername(username: string) {
    const users = await this.db
      .select()
      .from(schema.users)
      .where(
        and(
          eq(schema.users.username, username),
          eq(schema.users.clientId, this.clientId)
        )
      )
      .limit(1);
    
    return users[0] || null;
  }

  async getUserById(id: string) {
    const users = await this.db
      .select()
      .from(schema.users)
      .where(
        and(
          eq(schema.users.id, id),
          eq(schema.users.clientId, this.clientId)
        )
      )
      .limit(1);
    
    return users[0] || null;
  }

  async createUser(data: InsertUser) {
    return super.createUser(data, this.clientId);
  }

  async getUsers() {
    return await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.clientId, this.clientId));
  }

  // Override product operations to include tenant filtering
  async getProducts() {
    return await this.db
      .select()
      .from(schema.products)
      .where(eq(schema.products.clientId, this.clientId));
  }

  async getProductById(id: string) {
    const products = await this.db
      .select()
      .from(schema.products)
      .where(
        and(
          eq(schema.products.id, id),
          eq(schema.products.clientId, this.clientId)
        )
      )
      .limit(1);
    
    return products[0] || null;
  }

  async createProduct(data: InsertProduct) {
    return super.createProduct({ ...data, clientId: this.clientId });
  }

  // Override transaction operations to include tenant filtering
  async getTransactions() {
    return await this.db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.clientId, this.clientId));
  }

  async createTransaction(data: InsertTransaction, items: InsertTransactionItem[]) {
    const transactionWithClient: InsertTransaction = {
      ...data,
      clientId: this.clientId,
    };

    const itemsWithClient = items.map(item => ({
      ...item,
      clientId: this.clientId,
    }));

    return super.createTransaction(transactionWithClient, itemsWithClient);
  }

  // Override customer operations to include tenant filtering
  async getCustomers() {
    return await this.db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.clientId, this.clientId));
  }

  async createCustomer(data: InsertCustomer) {
    return super.createCustomer({ ...data, clientId: this.clientId });
  }

  // Override service operations to include tenant filtering
  async getServiceTickets() {
    return await this.db
      .select()
      .from(schema.serviceTickets)
      .where(eq(schema.serviceTickets.clientId, this.clientId));
  }

  async createServiceTicket(data: InsertServiceTicket) {
    return super.createServiceTicket({ ...data, clientId: this.clientId });
  }

  // Get store config (tenant-specific)
  async getStoreConfig() {
    const configs = await this.db
      .select()
      .from(schema.storeConfig)
      .where(eq(schema.storeConfig.clientId, this.clientId))
      .limit(1);
    
    return configs[0] || null;
  }

  async upsertStoreConfig(data: InsertStoreConfig) {
    return super.upsertStoreConfig(data, this.clientId);
  }
}

// Helper function to get tenant-aware storage from request
export function getTenantStorage(req: Request): TenantStorage {
  if (!req.tenant?.id) {
    throw new Error('No tenant context found in request');
  }
  return new TenantStorage(req.tenant.id);
}