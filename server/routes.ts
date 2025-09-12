import { Express } from "express";
import { z } from "zod";

export async function registerRoutes(app: Express) {
  // Existing warranty claims endpoint (unchanged)
  app.get("/api/warranty-claims", (req, res) => {
    // This would typically fetch from database
    // For now, return empty array - this should be implemented based on existing warranty system
    res.json([]);
  });

  // New endpoint for damaged goods - warranty claims with refund status
  app.get("/api/warranty-claims/damaged", (req, res) => {
    try {
      // Mock data for damaged goods from warranty claims with refund status
      // In real implementation, this would query warranty claims table
      // filtering by returnCondition = 'damaged_stock' and status = 'approved' for refunds
      const damagedClaims = [
        {
          id: "claim-dmg-001",
          claimNumber: "WC-2024-001",
          customerName: "Budi Santoso",
          customerPhone: "0812-3456-7890",
          productName: "Laptop ASUS X455L",
          productCode: "ASU-X455L-001",
          claimDate: "2024-01-15",
          refundStatus: "approved",
          damageType: "Kerusakan Hardware",
          damageDescription: "Motherboard rusak akibat liquid damage, tidak dapat diperbaiki",
          purchaseDate: "2023-10-20",
          warrantyPeriod: "12 Bulan"
        },
        {
          id: "claim-dmg-002",
          claimNumber: "WC-2024-002",
          customerName: "Siti Nurhaliza",
          customerPhone: "0856-1234-5678",
          productName: "Laptop HP Pavilion 14",
          productCode: "HP-PAV-14-002",
          claimDate: "2024-01-20",
          refundStatus: "approved",
          damageType: "Kerusakan Display",
          damageDescription: "LCD panel pecah total, biaya perbaikan melebihi 70% harga unit",
          purchaseDate: "2023-11-05",
          warrantyPeriod: "12 Bulan"
        },
        {
          id: "claim-dmg-003",
          claimNumber: "WC-2024-003",
          customerName: "Ahmad Rizki",
          customerPhone: "0821-9876-5432",
          productName: "Laptop Lenovo IdeaPad 3",
          productCode: "LEN-IP3-003",
          claimDate: "2024-02-10",
          refundStatus: "pending",
          damageType: "Kerusakan System",
          damageDescription: "Bootloop permanen, HDD dan RAM sudah dicoba diganti namun masih bermasalah",
          purchaseDate: "2023-12-15",
          warrantyPeriod: "12 Bulan"
        }
      ];
      
      res.json(damagedClaims);
    } catch (error) {
      console.error("Error fetching damaged goods claims:", error);
      res.status(500).json({ 
        error: "Failed to fetch damaged goods claims",
        message: "Internal server error"
      });
    }
  });

  // Endpoint to get damaged goods statistics
  app.get("/api/warranty-claims/damaged/stats", (req, res) => {
    try {
      // Mock statistics based on sample damaged claims data
      // In real implementation, this would aggregate from the database
      const stats: { total: number; approved: number; pending: number; rejected: number } = {
        total: 3,
        approved: 2,
        pending: 1,
        rejected: 0
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching damaged goods statistics:", error);
      res.status(500).json({
        error: "Failed to fetch statistics",
        message: "Internal server error"
      });
    }
  });
}
