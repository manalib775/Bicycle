import { db } from './db.ts';
import {
  users,
  visits,
  faqs,
  type User,
  type InsertUser,
  type Visit,
  type FAQ,
  type InsertFAQ,
} from '@shared/schema';
import { eq, and, gte, lte, count, asc } from 'drizzle-orm';

const now = () => new Date().toISOString(); // Helper for consistent date formatting

const handleError = (error: any, context: string) => {
  console.error(`${context} - DB Error:`, error.message || error);
  throw new Error(`DB Error in ${context}: ${error.message || error}`);
};

export class DrizzleStorage {
  async getUser(id: number): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return result[0];
    } catch (error) {
      handleError(error, 'getUser');
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
      return result[0];
    } catch (error) {
      handleError(error, 'getUserByUsername');
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      const result = await db.insert(users).values(user).returning();
      return result[0];
    } catch (error) {
      handleError(error, 'createUser');
      return undefined as unknown as User;
    }
  }

  async recordVisit(visit: Omit<Visit, 'id' | 'timestamp'>): Promise<Visit> {
    try {
      const result = await db
        .insert(visits)
        .values({ ...visit, timestamp: new Date() })
        .returning();
      return result[0];
    } catch (error) {
      handleError(error, 'recordVisit');
      return undefined as unknown as Visit;
    }
  }

  async getVisitAnalytics(filters: {
    startDate?: Date;
    endDate?: Date;
    groupBy?: 'device' | 'platform' | 'browser' | 'path';
  }): Promise<{ [key: string]: string | number }[]> {
    const groupBy = filters.groupBy || 'device';

    try {
      let conditions = [];

      if (filters.startDate) {
        conditions.push(gte(visits.timestamp, filters.startDate));
      }
      if (filters.endDate) {
        conditions.push(lte(visits.timestamp, filters.endDate));
      }

      const result = await db
        .select({
          [groupBy]: visits[groupBy],
          count: count(visits.id),
        })
        .from(visits)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(visits[groupBy]);

      return result.map((item: any) => ({
        [groupBy]: item[groupBy] ?? 'Unknown',
        count: item.count ?? 0,
      }));
    } catch (error) {
      handleError(error, 'getVisitAnalytics');
      return [];
    }
  }

  async getFaqs(category?: string): Promise<FAQ[]> {
    try {
      const query = db.select().from(faqs).orderBy(asc(faqs.order));
      if (category) {
        return await query.where(eq(faqs.category, category));
      }
      return await query;
    } catch (error) {
      handleError(error, 'getFaqs');
      return [];
    }
  }

  async createFaq(faq: InsertFAQ): Promise<FAQ> {
    try {
      const result = await db.insert(faqs).values(faq).returning();
      return result[0];
    } catch (error) {
      handleError(error, 'createFaq');
      return undefined as unknown as FAQ;
    }
  }

  async updateFaq(id: number, updates: Partial<FAQ>): Promise<FAQ> {
    try {
      const result = await db
        .update(faqs)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(faqs.id, id))
        .returning();
      return result[0];
    } catch (error) {
      handleError(error, 'updateFaq');
      return undefined as unknown as FAQ;
    }
  }

  async deleteFaq(id: number): Promise<void> {
    try {
      await db
        .update(faqs)
        .set({ isActive: false, deletedAt: new Date() })
        .where(eq(faqs.id, id));
    } catch (error) {
      handleError(error, 'deleteFaq');
    }
  }
}

export const storage = new DrizzleStorage();
