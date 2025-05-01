import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "../storage";
import { setupAuth, requireAdmin } from "../auth";
import { insertFaqSchema } from "@shared/schema";
import { generateSitemap } from "../services/sitemap";
import { db } from '../db.ts';
import { insertBicycleSchema } from "@shared/schema";
import { upload } from "../utils/multer"; // adjust path as needed
// ... existing imports ...
import { eq, gte, lte, and, asc, desc, not, or } from "drizzle-orm"; // Add asc and desc to imports
import { z } from "zod";

import { users, bicycles } from "@shared/schema";
// ... existing code ...
import { insertAadhaarVerificationSchema, aadhaarVerifications } from "@shared/schema";
export function userProfileRoutes(app: Express): Server {
    setupAuth(app);


    app.get("/api/userlisted/bicycle", async (req, res) => {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const sellerId = Number(req.user?.id);
        const bicycle = await db
            .select()
            .from(bicycles)
            .where(eq(bicycles.sellerId, sellerId));
        res.json(bicycle);
    });

    app.patch("/api/profile-image", upload.single("image"), async (req, res) => {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (!imageUrl) {
            return res.status(400).json({ message: "Image upload failed" });
        }

        try {
            const updated = await db
                .update(users)
                .set({ profileImage: imageUrl })
                .where(eq(users.id, req.user.id))
                .returning();

            res.status(200).json({ imageUrl: updated[0].profileImage });
        } catch (err) {
            console.error("Error updating profile image:", err);
            res.status(500).json({ message: "Failed to update profile image" });
        }
    });


    const httpServer = createServer(app);
    return httpServer;
}