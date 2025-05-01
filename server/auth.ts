// auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { eq } from "drizzle-orm";

import { db } from "./db";
import { users } from "@shared/schema";
import type { InsertUser, User as SelectUser } from "@shared/schema";
import { insertUserSchema } from "@shared/schema";
import { upload } from "./utils/multer"; // adjust path as needed
import { generateOtp, otpStore, saveOtpToStore, verifyOtpFromStore } from "./utils/otp.ts";
import { sendEmailOtp } from "./utils/sendEmailOtp.ts";

declare global {
  namespace Express {
    interface User extends SelectUser { }
  }
}
import { aadhaarVerifications, insertAadhaarVerificationSchema } from "@shared/schema";
const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${derivedKey.toString("hex")}.${salt}`;
}

export async function comparePasswords(input: string, stored: string) {
  const [hash, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hash, "hex");
  const inputBuf = (await scryptAsync(input, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, inputBuf);
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (!req.user?.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "default_secret",
    resave: false,
    saveUninitialized: false,
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    sessionSettings.cookie = { secure: true };
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await db.query.users.findFirst({
          where: eq(users.username, username),
        });

        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, id),
      });
      done(null, user || false);
    } catch (err) {
      done(err);
    }
  });

  // Auth routes
  app.post("/api/register", async (req, res, next) => {
    try {
      req.body.username = req.body.email;
      const { isVerifyingOtp, otp, ...rest } = req.body;
      const validated = insertUserSchema.parse(rest);
      
      if (!isVerifyingOtp) {
        const existing = await db.query.users.findFirst({
          where: eq(users.username, validated.username),
        });
        if (existing) {
          console.log("Email already registered");
          
          return res.status(400).json({ message: "Email already registered" });
        }
        if(otpStore.get(validated.email)) {
          return res.status(400).json({ message: "OTP already sent" });
        }
        const generatedOtp = generateOtp(); // Only call once
        await saveOtpToStore(validated.email, generatedOtp); // Save to store
        console.log(`OTP (for console debug): ${generatedOtp}`);
        await sendEmailOtp(validated.email, generatedOtp); // Same OTP

        return res.status(200).json({ message: "OTP sent to your email" });
      }
      else {
        // Phase 2: Verify OTP and create user
        const isValidOtp = await verifyOtpFromStore(validated.email, otp);
        if (!isValidOtp) {
          return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        const { id, confirmPassword, ...dataWithoutId } = validated;
        const newUser: InsertUser = {
          ...dataWithoutId,
          password: await hashPassword(validated.password),
        };

        const inserted = await db.insert(users).values(newUser).returning();
        const user = inserted[0];

        req.login(user, (err) => {
          if (err) return next(err);
          res.status(201).json(user);
        });
      }
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.status(200).json({ message: "Logout successful" });
    });
  });


  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
  // Route with file uploads for front & back images
  app.patch("/api/profile-password", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
  
    const userId = Number(req.user?.id);
    const { currentPassword, newPassword } = req.body;
  
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Both current and new passwords are required" });
    }
  
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });
  
      if (!user || !(await comparePasswords(currentPassword, user.password))) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
  
      const hashed = await hashPassword(newPassword);
  
      const updated = await db
        .update(users)
        .set({ password: hashed })
        .where(eq(users.id, userId))
        .returning();
  
      res.status(200).json({ message: "Password updated successfully" });
    } catch (err) {
      console.error("Password update error:", err);
      res.status(500).json({ message: "Failed to update password" });
    }
  });
  

}
