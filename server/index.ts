import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import session from "express-session";
import { storage } from "./storage";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from 'express-rate-limit';
import MemoryStore from 'memorystore';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupVite, serveStatic } from "./vite";
import http from "http";

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Enable trust proxy for proper header handling behind reverse proxy
app.set('trust proxy', 1);

console.log('Initializing Express application...');

// Production security middleware
console.log('Configuring security middleware...');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:", "http:"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:", "http:"],
      imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
      connectSrc: ["'self'", "https:", "http:", "ws:", "wss:"],
      fontSrc: ["'self'", "data:", "https:", "http:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "https:", "http:"],
      frameSrc: ["'self'", "https:", "http:"]
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// Rate limiting
console.log('Setting up rate limiting...');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all routes
app.use(limiter);

// Rest of middleware configuration
app.use(compression());

// Request size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Configure CORS
console.log('Configuring CORS...');
const corsOptions = {
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// Session configuration with MemoryStore for testing
console.log('Setting up session management...');
const MemoryStoreSession = MemoryStore(session);
const sessionConfig = {
  store: new MemoryStoreSession({
    checkPeriod: 86400000 // prune expired entries every 24h
  }),
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    sameSite: (process.env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax',
    domain: process.env.NODE_ENV === 'production' ? process.env.DOMAIN : undefined
  }
};

app.use(session(sessionConfig));

// Simple logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
  });
  next();
});

// Serve static files from the dist/public directory (Vite's output)
app.use(express.static(path.join(__dirname, '../dist/public')));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Test endpoint
app.get('/test', (_req, res) => {
  res.json({ message: 'Server is running correctly' });
});

// Global error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);

  if (res.headersSent) {
    return next(err);
  }

  const status = (err as any).status || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal Server Error'
    : err.message || 'Internal Server Error';

  res.status(status).json({
    error: {
      message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    }
  });
});

const startServer = async () => {
  try {
    console.log('Starting server initialization...');

    // Create HTTP server first
    const server = http.createServer(app);

    try {
      // Register API routes before Vite middleware
      console.log('Registering API routes...');
      await registerRoutes(app);
      console.log('API routes registered successfully');

      // Setup Vite or static serving based on environment
      if (process.env.NODE_ENV !== 'production') {
        console.log('Setting up Vite development server...');
        await setupVite(app, server);
        console.log('Vite development server setup complete');
      } else {
        console.log('Setting up static file serving...');
        serveStatic(app);
        console.log('Static file serving setup complete');
      }

      // Get port from environment or use fallback ports
      const port = process.env.PORT || 5000;

      server.listen(port, '0.0.0.0', () => {
        console.log(`Server started successfully on port ${port}`);
        console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode`);
        console.log(`Application is ready to accept requests`);
      });

    } catch (setupError) {
      console.error('Failed to setup server components:', setupError);
      throw setupError;
    }

  } catch (error) {
    console.error('Fatal server startup error:', error);
    process.exit(1);
  }
};

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();