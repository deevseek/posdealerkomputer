import bcrypt from 'bcryptjs';
import session from 'express-session';
import type { Express, RequestHandler } from 'express';
import connectPg from 'connect-pg-simple';
import { storage } from './storage';
import type { User, LoginUser } from '@shared/schema';

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true, // Auto-create table during fresh setup
    ttl: sessionTtl,
    tableName: 'sessions',
  });
  return session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: 'auto', // Auto-detect HTTPS for deployment compatibility
      sameSite: 'lax', // Better compatibility with modern browsers
      maxAge: sessionTtl,
    },
    name: 'laptoppos.session', // Custom session name
    proxy: true, // Trust proxy for deployment
  });
}

export async function setupAuth(app: Express) {
  app.set('trust proxy', 1);
  app.use(getSession());
  
  // Create default admin user if it doesn't exist (for local deployment)
  await createDefaultAdminUser();
}

async function createDefaultAdminUser() {
  try {
    const adminUsername = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@laptoppos.com';
    
    // Check if admin user exists
    const existingUser = await storage.getUserByUsername(adminUsername);
    
    if (!existingUser) {
      // Create default admin user
      const hashedPassword = await hashPassword(adminPassword);
      
      await storage.createUser({
        id: 'admin-' + Date.now(),
        username: adminUsername,
        email: adminEmail,
        firstName: 'System',
        lastName: 'Administrator',
        password: hashedPassword,
        role: 'admin',
        isActive: true,
        profileImageUrl: null
      });
      
      console.log(`✅ Default admin user created: ${adminUsername}/${adminPassword}`);
    } else {
      // Ensure existing admin has correct password (for deployment consistency)
      const isValidPassword = await verifyPassword(adminPassword, existingUser.password || '');
      if (!isValidPassword) {
        const hashedPassword = await hashPassword(adminPassword);
        await storage.updateUser(existingUser.id, { password: hashedPassword });
        console.log(`✅ Admin password reset to default: ${adminUsername}/${adminPassword}`);
      }
    }
  } catch (error) {
    console.error('Error creating default admin user:', error);
  }
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  console.log("Auth check:", {
    hasSession: !!req.session,
    hasUser: !!req.session?.user,
    userId: req.session?.user?.id,
    sessionId: req.sessionID,
    path: req.path,
    method: req.method
  });
  
  if (req.session && req.session.user) {
    return next();
  }
  
  console.error("Authentication failed:", {
    sessionExists: !!req.session,
    userExists: !!req.session?.user,
    path: req.path
  });
  return res.status(401).json({ message: 'Unauthorized' });
};

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function authenticateUser(credentials: LoginUser): Promise<User | null> {
  try {
    const user = await storage.getUserByUsername(credentials.username);
    if (!user || !user.password) {
      return null;
    }

    const isValidPassword = await verifyPassword(credentials.password, user.password);
    if (!isValidPassword) {
      return null;
    }

    // Don't return password in user object
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

// Extend session interface
declare module 'express-session' {
  interface SessionData {
    user: User;
  }
}