import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAdmin } from "./auth";
import { insertFaqSchema } from "@shared/schema";
import { generateSitemap } from "./services/sitemap";
import { db } from './db.ts';
import { insertBicycleSchema, bicycles } from "@shared/schema";
import { upload } from "./utils/multer"; // adjust path as needed
// ... existing imports ...
import { eq, gte, lte, and, asc, desc, not, or } from "drizzle-orm"; // Add asc and desc to imports
import { z } from "zod";

// ... existing code ...
import { insertAadhaarVerificationSchema, aadhaarVerifications } from "@shared/schema";
export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Analytics Routes
  app.get("/api/admin/analytics/visits", requireAdmin, async (req, res) => {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const groupBy = req.query.groupBy as "device" | "platform" | "browser" | "path" | undefined;

    const analytics = await storage.getVisitAnalytics({ startDate, endDate, groupBy });
    res.json(analytics);
  });

  // Sitemap Route
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const baseUrl = process.env.NODE_ENV === 'production'
        ? `https://${process.env.DOMAIN}`
        : `http://${req.headers.host}`;

      const sitemap = await generateSitemap(baseUrl);
      res.header('Content-Type', 'application/xml');
      res.send(sitemap);
    } catch (error) {
      console.error('Error generating sitemap:', error);
      res.status(500).send('Error generating sitemap');
    }
  });

  // FAQ Routes
  app.get("/api/faqs", async (req, res) => {
    const category = req.query.category as string | undefined;
    const faqs = await storage.getFaqs(category);
    res.json(faqs);
  });

  app.post("/api/admin/faqs", requireAdmin, async (req, res) => {
    try {
      const faqData = insertFaqSchema.parse(req.body);
      const faq = await storage.createFaq(faqData);
      res.json(faq);
    } catch (error) {
      res.status(400).json(error);
    }
  });

  app.patch("/api/admin/faqs/:id", requireAdmin, async (req, res) => {
    try {
      const faq = await storage.updateFaq(parseInt(req.params.id), req.body);
      res.json(faq);
    } catch (error) {
      res.status(400).json(error);
    }
  });

  app.delete("/api/admin/faqs/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteFaq(parseInt(req.params.id));
      res.sendStatus(200);
    } catch (error) {
      res.status(400).json(error);
    }
  });
  //verify aadhaar

  app.post(
    "/api/verify-aadhaar",
    upload.fields([
      { name: "aadhaarFront", maxCount: 1 },
      { name: "aadhaarBack", maxCount: 1 },
    ]),
    async (req, res) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      try {
        console.log("Processing Aadhaar verification");

        const userId = Number(req.user?.id); // ensure it's a number
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

        // Check if the combination of userId and aadhaarNumber already exists
        const existingAadhaar = await db
          .select()
          .from(aadhaarVerifications)
          .where(
            or(
              eq(aadhaarVerifications.userId, userId),
              eq(aadhaarVerifications.aadhaarNumber, aadhaarNumber)
            )
          )
          .limit(1);

        if (existingAadhaar.length > 0) {
          return res.status(400).json({ message: "Aadhaar already submitted for this user" });
        }

        // Insert the new record into the database
        try {
          const inserted = await db.insert(aadhaarVerifications).values(parsed).returning();
          res.status(201).json({ success: true, data: inserted[0] });
        } catch (insertError: any) {
          if (insertError.code === '23505') {
            // This is a unique constraint violation error for aadhaar_number
            return res.status(400).json({ message: "Aadhaar number already exists in the system" });
          }
          console.error(insertError);
          res.status(500).json({ message: "Something went wrong" });
        }

      } catch (err: any) {
        if (err instanceof z.ZodError) {
          return res.status(400).json({ success: false, errors: err.errors });
        }
        console.error(err);
        res.status(500).json({ message: "Something went wrong" });
      }
    }
  );

  app.get("/api/aadhaar-verification-status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userId = Number(req.user?.id);
      if (!userId) {
        return res.status(400).json({ message: "User not found" });
      }

      console.log("Fetching Aadhaar verification status for user:", userId);

      const result = await db
        .select()
        .from(aadhaarVerifications)
        .where(eq(aadhaarVerifications.userId, userId))
        .limit(1);

      console.log("Query result:", result);

      if (result.length === 0) {
        return res.status(404).json({ message: "Aadhaar verification record not found" });
      }

      res.status(200).json({
        status: result[0].status,
        message: "Aadhaar verification status fetched successfully",
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  //bICYCLE ROUTES //upload bicycle
  app.post("/api/hey", upload.array("images", 5), async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    try {
      const sellerId = Number(req.user.id);
      delete req.body.isPremium;

      // 👇 Extract secure URLs from Cloudinary-uploaded files
      const imageUrls = req.files?.map((file: any) => file.path) ?? [];

      const parsed = insertBicycleSchema.parse({
        ...req.body,
        sellerId,
        images: imageUrls, // inject uploaded image URLs
      });

      const inserted = await db.insert(bicycles).values(parsed).returning();
      res.status(201).json({ success: true, data: inserted[0] });
    } catch (err) {
      if (err.name === "ZodError") {
        return res.status(400).json({ success: false, errors: err.errors });
      }
      console.error(err);
      res.status(500).json({ success: false, message: "Something went wrong." });
    }
  });
  // Get all bicycles
  app.get("/api/hey", async (req, res) => {
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const lon = req.query.lon ? parseFloat(req.query.lon as string) : undefined;
    const radius = req.query.radius ? parseFloat(req.query.radius as string) : 50000;

    console.log(`Lat: ${lat}, Lon: ${lon}, Radius: ${radius}`);

    if (lat === undefined || lon === undefined) {
      return res.status(400).json({ error: "Latitude and longitude are required." });
    }

    const allBicycles = await db.select().from(bicycles);
    console.log(`Found ${allBicycles.length} bicycles`);

    const bicyclesWithinRadius = allBicycles.filter((bike) => {
      if (bike.lat == null || bike.lon == null) return false;
      const distance = getDistanceFromLatLonInMeters(lat, lon, bike.lat, bike.lon);
      return distance <= radius;
    });

    console.log(`Found ${bicyclesWithinRadius.length} bicycles within radius`);
    res.json(allBicycles);
  });

  // Haversine Formula
  function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // Earth radius in meters
    const toRad = (x: number) => (x * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  //bicycle details using Id
  app.get("/api/bicycle/details/:id", async (req, res) => {
    const bicycleId = req.params.id;
    try {
      const result = await db
        .select()
        .from(bicycles)
        .where(eq(bicycles.id, bicycleId))
        .then(rows => rows[0]); // equivalent to `.first()`

      if (!result) {
        return res.status(404).json({ success: false, message: "Bicycle not found" });
      }

      res.status(200).json({ success: true, data: result });
    } catch (err) {
      console.error("Error fetching bicycle details:", err);
      res.status(500).json({ success: false, message: "Something went wrong." });
    }
  });

  //Bicycles
  app.get("/api/bicycles", async (req, res) => {
    try {
      const {
        isPremium,
        brand,
        yearOfPurchase,
        condition,
        gearTransmission,
        frameMaterial,
        suspension,
        wheelSize,
        minPrice,
        maxPrice,
        sortBy
      } = req.query;

      const conditions = [];

      if (isPremium === "true") {
        conditions.push(eq(bicycles.isPremium, true));
      }
      if (brand) {
        conditions.push(eq(bicycles.brand, String(brand)));
      }
      if (yearOfPurchase) {
        conditions.push(eq(bicycles.purchaseYear, integer(purchaseYear)));
      }
      if (condition) {
        conditions.push(eq(bicycles.condition, String(condition)));
      }
      if (gearTransmission) {
        conditions.push(eq(bicycles.gearTransmission, String(gearTransmission)));
      }
      if (frameMaterial) {
        conditions.push(eq(bicycles.frameMaterial, String(frameMaterial)));
      }
      if (suspension) {
        conditions.push(eq(bicycles.suspension, String(suspension)));
      }
      if (wheelSize) {
        conditions.push(eq(bicycles.wheelSize, String(wheelSize)));
      }
      if (minPrice) {
        conditions.push(gte(bicycles.price, String(minPrice)));
      }
      if (maxPrice) {
        conditions.push(lte(bicycles.price, String(maxPrice)));
      }

      let query = db.select().from(bicycles).where(and(...conditions));

      // 🔥 Added sorting
      if (sortBy === "price_asc") {
        query = query.orderBy(asc(bicycles.price));
      } else if (sortBy === "price_desc") {
        query = query.orderBy(desc(bicycles.price));
      } else if (sortBy === "newest") {
        query = query.orderBy(desc(bicycles.createdAt)); // Assuming createdAt exists
      }

      const bicycleList = await query;

      res.status(200).json(bicycleList);
    } catch (error) {
      console.error("Error fetching bicycles:", error);
      res.status(500).json({ message: "Something went wrong" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}