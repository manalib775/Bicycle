import { db } from "./db";
import { users, bicycles } from "@shared/schema";
import { sql } from "drizzle-orm";

async function seed() {
  try {
    // First clear existing data
    await db.delete(bicycles);
    await db.delete(users);

    console.log("Cleared existing data");

    // Insert sample users
    const [user1, user2] = await db.insert(users).values([
      {
        username: "certified_seller",
        password: "password",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        mobile: "9876543210",
        city: "Mumbai",
        subCity: "Andheri",
        cyclingProficiency: "professional",
        type: "certified",
        businessName: null,
        businessAddress: null,
        businessPhone: null,
        businessHours: null
      },
      {
        username: "casual_seller",
        password: "password",
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        mobile: "9876543211",
        city: "Mumbai",
        subCity: "Bandra",
        cyclingProficiency: "occasional",
        type: "individual",
        businessName: null,
        businessAddress: null,
        businessPhone: null,
        businessHours: null
      }
    ]).returning();

    console.log("Inserted sample users");

    // Insert sample bicycles with external placeholder images
    await db.insert(bicycles).values([
      {
        sellerId: user1.id,
        category: "Adult",
        brand: "Trek",
        model: "Marlin 7",
        purchaseYear: 2023,
        price: 85000,
        gearTransmission: "Multi-Speed",
        frameMaterial: "Aluminum",
        suspension: "Front",
        condition: "Like New",
        cycleType: "Mountain",
        wheelSize: "29",
        hasReceipt: true,
        additionalDetails: "Top-of-the-line mountain bike with premium components",
        images: [
          "https://via.placeholder.com/400x300.png?text=Mountain+Bike+1",
          "https://via.placeholder.com/400x300.png?text=Mountain+Bike+2"
        ],
        isPremium: true,
        status: "available",
        views: 0,
        inquiries: 0,
        createdAt: new Date()
      },
      {
        sellerId: user1.id,
        category: "Adult",
        brand: "Specialized",
        model: "Allez",
        purchaseYear: 2022,
        price: 95000,
        gearTransmission: "Multi-Speed",
        frameMaterial: "Carbon Fiber",
        suspension: "None",
        condition: "Good",
        cycleType: "Road",
        wheelSize: "27.5",
        hasReceipt: true,
        additionalDetails: "Professional road bike, perfect for racing",
        images: [
          "https://via.placeholder.com/400x300.png?text=Road+Bike+1",
          "https://via.placeholder.com/400x300.png?text=Road+Bike+2"
        ],
        isPremium: true,
        status: "available",
        views: 0,
        inquiries: 0,
        createdAt: new Date()
      }
    ]);

    console.log("Seed data inserted successfully");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

seed();