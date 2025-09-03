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
    createTableIfMissing: false,
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
      secure: false, // Set to true in production with HTTPS
      maxAge: sessionTtl,
    },
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
    }
  } catch (error) {
    console.error('Error creating default admin user:', error);
  }
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
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