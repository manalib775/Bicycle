import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("firstName").notNull(),
  lastName: text("lastName").notNull(),
  email: text("email").notNull(),
  mobile: text("mobile").notNull(),
  city: text("city").notNull(),
  subCity: text("subCity").notNull(),
  cyclingProficiency: text("cyclingProficiency").notNull(),
  type: text("type").notNull(),
  businessName: text("businessName"),
  businessAddress: text("businessAddress"),
  businessPhone: text("businessPhone"),
  businessHours: text("businessHours"),
  isAdmin: boolean("isAdmin").default(false),
});

export const bicycles = pgTable("bicycles", {
  id: serial("id").primaryKey(),
  sellerId: integer("sellerId").notNull(),
  category: text("category").notNull(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  purchaseYear: integer("purchaseYear").notNull(),
  price: integer("price").notNull(),
  gearTransmission: text("gearTransmission").notNull(),
  frameMaterial: text("frameMaterial").notNull(),
  suspension: text("suspension").notNull(),
  condition: text("condition").notNull(),
  cycleType: text("cycleType").notNull(),
  wheelSize: text("wheelSize").notNull(),
  hasReceipt: boolean("hasReceipt").notNull(),
  additionalDetails: text("additionalDetails"),
  images: text("images").array().notNull(),
  isPremium: boolean("isPremium").default(false),
  status: text("status").notNull().default('available'),
  views: integer("views").notNull().default(0),
  inquiries: integer("inquiries").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow(),
});

export const visits = pgTable("visits", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").defaultNow(),
  path: text("path").notNull(),
  deviceType: text("deviceType").notNull(),
  platform: text("platform").notNull(),
  browser: text("browser").notNull(),
  userId: integer("userId"),
  sessionId: text("sessionId").notNull(),
});

export const faqs = pgTable("faqs", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: text("category").notNull(),
  order: integer("order").notNull(),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow()
});

export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content").notNull(),
  excerpt: text("excerpt").notNull(),
  featuredImage: text("featuredImage").notNull(),
  authorId: integer("authorId").notNull(),
  readTime: integer("readTime").notNull(),
  categoryId: integer("categoryId").notNull(),
  tags: text("tags").array().notNull(),
  isPublished: boolean("isPublished").default(false),
  seoTitle: text("seoTitle").notNull(),
  seoDescription: text("seoDescription").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export const blogCategories = pgTable("blog_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow(),
});

export const blogTags = pgTable("blog_tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow(),
});


export const insertBicycleSchema = createInsertSchema(bicycles)
  .omit({ id: true, createdAt: true, views: true, inquiries: true })
  .extend({
    images: z.array(z.string()),
    price: z.number().min(0, "Price must be positive"),
    purchaseYear: z.number().min(2000).max(new Date().getFullYear()),
    category: z.enum(["Adult", "Kids"]),
    condition: z.enum(["Fair", "Good", "Like New"]),
    gearTransmission: z.enum(["Non-Geared", "Multi-Speed"]),
    frameMaterial: z.enum(["Steel", "Aluminum", "Carbon Fiber"]),
    suspension: z.enum(["None", "Front", "Full"]),
    cycleType: z.enum(["Mountain", "Road", "Hybrid", "BMX", "Other"]),
    wheelSize: z.enum(["12", "16", "20", "24", "26", "27.5", "29"]),
  });

export const insertUserSchema = createInsertSchema(users).extend({
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

export const insertFaqSchema = createInsertSchema(faqs).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertBlogPostSchema = createInsertSchema(blogPosts)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    tags: z.array(z.string()),
    readTime: z.number().min(1, "Read time must be at least 1 minute"),
  });

export const insertBlogCategorySchema = createInsertSchema(blogCategories)
  .omit({ id: true, createdAt: true });

export const insertBlogTagSchema = createInsertSchema(blogTags).omit({ id: true, createdAt: true });


export type InsertBicycle = z.infer<typeof insertBicycleSchema>;
export type Bicycle = typeof bicycles.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Visit = typeof visits.$inferSelect;
export type FAQ = typeof faqs.$inferSelect;
export type InsertFAQ = z.infer<typeof insertFaqSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogCategory = typeof blogCategories.$inferSelect;
export type InsertBlogCategory = z.infer<typeof insertBlogCategorySchema>;
export type BlogTag = typeof blogTags.$inferSelect;
export type InsertBlogTag = z.infer<typeof insertBlogTagSchema>;