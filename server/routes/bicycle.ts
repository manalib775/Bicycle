import { insertBicycleSchema, bicycles } from "@shared/schema";
import { upload } from "../utils/multer";
import { db } from '../db';
import { Express } from "express";

export function registerBicycleRoutes(app: Express) {
  app.post("/api/hey", upload.array("images", 5), async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    try {
      const sellerId = Number(req.user.id);
      delete req.body.isPremium;
      
      const imageUrls = req.files?.map((file: any) => file.path) ?? [];
      const parsed = insertBicycleSchema.parse({
        ...req.body,
        sellerId,
        images: imageUrls,
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

  app.get("/api/hey", async (req, res) => {
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const lon = req.query.lon ? parseFloat(req.query.lon as string) : undefined;
    const radius = req.query.radius ? parseFloat(req.query.radius as string) : 50000;

    if (lat === undefined || lon === undefined) {
      return res.status(400).json({ error: "Latitude and longitude are required." });
    }

    const allBicycles = await db.select().from(bicycles);
    const bicyclesWithinRadius = allBicycles.filter((bike) => {
      if (bike.lat == null || bike.lon == null) return false;
      const distance = getDistanceFromLatLonInMeters(lat, lon, bike.lat, bike.lon);
      return distance <= radius;
    });

    res.json(bicyclesWithinRadius);
  });

  // Utility function for distance
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
}
