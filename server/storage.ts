import type { Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { users, visits, faqs, type User, type InsertUser, type Visit, type FAQ, type InsertFAQ } from "@shared/schema";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

declare module "express-session" {
  interface SessionData {
    userId?: number;
    isAdmin?: boolean;
  }
}

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  recordVisit(visit: Omit<Visit, "id" | "timestamp">): Promise<Visit>;
  getVisitAnalytics(filters: {
    startDate?: Date;
    endDate?: Date;
    groupBy?: "device" | "platform" | "browser" | "path";
  }): Promise<{ [key: string]: string | number }[]>;
  getFaqs(category?: string): Promise<FAQ[]>;
  createFaq(faq: InsertFAQ): Promise<FAQ>;
  updateFaq(id: number, updates: Partial<FAQ>): Promise<FAQ>;
  deleteFaq(id: number): Promise<void>;
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return result[0];
  }

  async recordVisit(visitData: Omit<Visit, "id" | "timestamp">): Promise<Visit> {
    const result = await db
      .insert(visits)
      .values(visitData)
      .returning();
    return result[0];
  }

  async getVisitAnalytics(filters: {
    startDate?: Date;
    endDate?: Date;
    groupBy?: "device" | "platform" | "browser" | "path";
  }): Promise<{ [key: string]: string | number }[]> {
    const conditions: SQL[] = [];

    if (filters.startDate) {
      conditions.push(sql`${visits.timestamp} >= ${filters.startDate}`);
    }
    if (filters.endDate) {
      conditions.push(sql`${visits.timestamp} <= ${filters.endDate}`);
    }

    const groupByColumn = 
      filters.groupBy === "device" ? visits.deviceType :
      filters.groupBy === "platform" ? visits.platform :
      filters.groupBy === "browser" ? visits.browser :
      filters.groupBy === "path" ? visits.path :
      visits.deviceType;

    let query = db.select({
      groupKey: groupByColumn,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(visits);

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query.groupBy(groupByColumn);

    return results.map(result => ({
      [filters.groupBy || 'device']: result.groupKey || 'Unknown',
      count: result.count
    }));
  }

  async getFaqs(category?: string): Promise<FAQ[]> {
    let query = db.select().from(faqs);
    if (category) {
      query = query.where(eq(faqs.category, category));
    }
    return query.orderBy(faqs.order);
  }

  async createFaq(faq: InsertFAQ): Promise<FAQ> {
    const [newFaq] = await db
      .insert(faqs)
      .values(faq)
      .returning();
    return newFaq;
  }

  async updateFaq(id: number, updates: Partial<FAQ>): Promise<FAQ> {
    const [updated] = await db
      .update(faqs)
      .set({ 
        ...updates, 
        updatedAt: new Date() 
      })
      .where(eq(faqs.id, id))
      .returning();
    return updated;
  }

  async deleteFaq(id: number): Promise<void> {
    await db
      .update(faqs)
      .set({ isActive: false })
      .where(eq(faqs.id, id));
  }
}

export const storage = new DatabaseStorage();