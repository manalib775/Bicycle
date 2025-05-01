import { insertFaqSchema } from "@shared/schema";
import { storage } from "./storage";
import { requireAdmin } from "./auth";
import { Express } from "express";

export function registerFaqRoutes(app: Express) {
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
}
