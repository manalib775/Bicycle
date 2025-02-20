import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAdmin } from "./auth";
import { insertFaqSchema } from "@shared/schema";
import { generateSitemap } from "./services/sitemap";

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

  const httpServer = createServer(app);
  return httpServer;
}