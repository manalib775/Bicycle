import { insertAadhaarVerificationSchema, aadhaarVerifications } from "@shared/schema";
import { db } from '../db';
import { upload } from "../utils/multer";
import { Express } from "express";
import { z } from "zod";

export function registerAadhaarRoutes(app: Express) {
  app.post("/api/verify-aadhaar", upload.fields([{ name: "aadhaarFront", maxCount: 1 }, { name: "aadhaarBack", maxCount: 1 }]), async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userId = Number(req.user?.id); 
      const { aadhaarNumber } = req.body;

      if (!aadhaarNumber) {
        return res.status(400).json({ message: "Aadhaar number is required" });
      }

      const frontImageUrl = (req.files as any)?.aadhaarFront?.[0]?.path;
      const backImageUrl = (req.files as any)?.aadhaarBack?.[0]?.path;

      if (!frontImageUrl || !backImageUrl) {
        return res.status(400).json({ message: "Both images are required" });
      }

      const parsed = insertAadhaarVerificationSchema.parse({
        userId,
        aadhaarNumber,
        frontImageUrl,
        backImageUrl,
      });

      // Check for existing Aadhaar
      const existingAadhaar = await db
        .select()
        .from(aadhaarVerifications)
        .where(eq(aadhaarVerifications.userId, userId))
        .or(eq(aadhaarVerifications.aadhaarNumber, aadhaarNumber))
        .limit(1);

      if (existingAadhaar.length > 0) {
        return res.status(400).json({ message: "Aadhaar already submitted for this user" });
      }

      const inserted = await db.insert(aadhaarVerifications).values(parsed).returning();
      res.status(201).json({ success: true, data: inserted[0] });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ success: false, errors: err.errors });
      }
      console.error(err);
      res.status(500).json({ message: "Something went wrong" });
    }
  });

  app.get("/api/aadhaar-verification-status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userId = Number(req.user?.id);
      const result = await db
        .select()
        .from(aadhaarVerifications)
        .where(eq(aadhaarVerifications.userId, userId))
        .limit(1);

      if (result.length === 0) {
        return res.status(404).json({ message: "Aadhaar verification record not found" });
      }

      res.status(200).json({ status: result[0].status, message: "Aadhaar verification status fetched successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}
