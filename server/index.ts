import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { tenantMiddleware } from "./middleware/tenant";
import { createCorsMiddleware } from "./middleware/cors";
import saasRoutes from "./routes/saas";
import adminRoutes from "./routes/admin";
import { databaseContextMiddleware } from "./db";

const app = express();
import session from 'express-session';

// Setup session middleware BEFORE admin routes
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // set true jika pakai https
}));
app.use(createCorsMiddleware());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(databaseContextMiddleware);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Register SaaS routes first (no tenant middleware needed)
  app.use('/api/saas', saasRoutes);
  app.use('/api/admin', adminRoutes);
  
  // Register comprehensive SaaS management routes
  const saasCompleteRoutes = await import('./routes/saas-complete');
  app.use('/api/admin', saasCompleteRoutes.default);
  
  // Register Stripe payment and billing routes
  const stripeRoutes = await import('./routes/stripe-integration');
  app.use('/api/admin', stripeRoutes.default);
  
  // Register client onboarding routes
  const clientRoutes = await import('./routes/client');
  app.use('/api/client', clientRoutes.default);

  // Mobile API routes for Flutter integration
  const mobileRoutes = await import('./routes/mobile');
  app.use('/api/mobile', mobileRoutes.default);

  // Apply tenant middleware to remaining routes
  app.use(tenantMiddleware);

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 3000 for ngrok tunnel.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '3000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
