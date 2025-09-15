import { z } from "zod";

// Service cancellation type enum for validation
export const cancellationTypeEnum = z.enum(['before_completed', 'after_completed', 'warranty_refund']);

// Main cancellation request validation schema
export const serviceCancellationSchema = z.object({
  cancellationFee: z.string()
    .min(1, "Biaya pembatalan diperlukan")
    .regex(/^\d+(\.\d{1,2})?$/, "Format biaya pembatalan tidak valid")
    .transform(val => {
      const num = parseFloat(val);
      if (isNaN(num) || num < 0) {
        throw new Error("Biaya pembatalan harus berupa angka positif");
      }
      return val;
    }),
    
  cancellationReason: z.string()
    .min(5, "Alasan pembatalan minimal 5 karakter")
    .max(500, "Alasan pembatalan maksimal 500 karakter")
    .trim(),
    
  cancellationType: cancellationTypeEnum,
  
  userId: z.string().min(1, "User ID diperlukan")
});

// Business rule validation result
export interface CancellationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  serviceTicket?: any;
  serviceParts?: any[];
}

// Type inference for the schema
export type ServiceCancellationRequest = z.infer<typeof serviceCancellationSchema>;

// Additional business rule validations
export const validateCancellationBusinessRules = {
  // Check if service ticket exists and not already cancelled
  async validateTicketEligibility(ticketId: string, ticket: any): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    if (!ticket) {
      errors.push("Service ticket tidak ditemukan");
      return { isValid: false, errors };
    }
    
    if (ticket.status === 'cancelled') {
      errors.push("Service ticket sudah dibatalkan sebelumnya");
      return { isValid: false, errors };
    }
    
    // Additional business rules can be added here
    if (ticket.status === 'delivered' && ticket.deliveredAt) {
      const deliveredDate = new Date(ticket.deliveredAt);
      const now = new Date();
      const daysDifference = Math.floor((now.getTime() - deliveredDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Example: Cannot cancel service after 30 days of delivery
      if (daysDifference > 30) {
        errors.push("Service tidak dapat dibatalkan setelah 30 hari dari pengiriman");
      }
    }
    
    return { isValid: errors.length === 0, errors };
  },
  
  // Validate warranty claims eligibility
  async validateWarrantyEligibility(ticketId: string, ticket: any): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    if (!ticket.warrantyEndDate) {
      errors.push("Service tidak memiliki garansi");
      return { isValid: false, errors };
    }
    
    const warrantyEndDate = new Date(ticket.warrantyEndDate);
    const now = new Date();
    
    if (now > warrantyEndDate) {
      errors.push("Garansi service sudah berakhir");
      return { isValid: false, errors };
    }
    
    return { isValid: errors.length === 0, errors };
  },
  
  // Validate parts availability for returns
  async validatePartsAvailability(serviceParts: any[]): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    // Check if any parts were used that need to be returned to stock
    if (serviceParts.length === 0) {
      return { isValid: true, errors }; // No parts to validate
    }
    
    // Additional validations can be added here
    // For example, checking if parts are still in stock system, etc.
    
    return { isValid: errors.length === 0, errors };
  }
};