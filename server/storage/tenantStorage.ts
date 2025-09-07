import { DatabaseStorage } from '../storage';
import { Request } from 'express';
import { eq, and } from 'drizzle-orm';
import * as schema from '../../shared/schema';

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

  async createUser(data: any) {
    return await this.db
      .insert(schema.users)
      .values({
        ...data,
        clientId: this.clientId
      })
      .returning();
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

  async createProduct(data: any) {
    return await this.db
      .insert(schema.products)
      .values({
        ...data,
        clientId: this.clientId
      })
      .returning();
  }

  // Override transaction operations to include tenant filtering
  async getTransactions() {
    return await this.db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.clientId, this.clientId));
  }

  async createTransaction(data: any) {
    return await this.db
      .insert(schema.transactions)
      .values({
        ...data,
        clientId: this.clientId
      })
      .returning();
  }

  // Override customer operations to include tenant filtering
  async getCustomers() {
    return await this.db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.clientId, this.clientId));
  }

  async createCustomer(data: any) {
    return await this.db
      .insert(schema.customers)
      .values({
        ...data,
        clientId: this.clientId
      })
      .returning();
  }

  // Override service operations to include tenant filtering
  async getServiceTickets() {
    return await this.db
      .select()
      .from(schema.serviceTickets)
      .where(eq(schema.serviceTickets.clientId, this.clientId));
  }

  async createServiceTicket(data: any) {
    return await this.db
      .insert(schema.serviceTickets)
      .values({
        ...data,
        clientId: this.clientId
      })
      .returning();
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

  async upsertStoreConfig(data: any) {
    const existing = await this.getStoreConfig();
    
    if (existing) {
      return await this.db
        .update(schema.storeConfig)
        .set({
          ...data,
          clientId: this.clientId,
          updatedAt: new Date()
        })
        .where(eq(schema.storeConfig.id, existing.id))
        .returning();
    } else {
      return await this.db
        .insert(schema.storeConfig)
        .values({
          ...data,
          clientId: this.clientId
        })
        .returning();
    }
  }
}

// Helper function to get tenant-aware storage from request
export function getTenantStorage(req: Request): TenantStorage {
  if (!req.tenant?.id) {
    throw new Error('No tenant context found in request');
  }
  return new TenantStorage(req.tenant.id);
}