import crypto from 'crypto';
import { query } from './db';

// Hash password using PBKDF2
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, 'salt', 100000, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      resolve(derivedKey.toString('hex'));
    });
  });
}

// Verify password
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, 'salt', 100000, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      resolve(derivedKey.toString('hex') === hash);
    });
  });
}

// Get user by email
export async function getUserByEmail(email: string) {
  try {
    const result = await query(
      'SELECT id, email, full_name, role, phone, is_active FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    throw error;
  }
}

// Get user with password hash (for login)
export async function getUserWithPassword(email: string) {
  try {
    const result = await query(
      'SELECT id, email, full_name, role, password_hash, is_active FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}

// Create new user
export async function createUser(
  email: string,
  password: string,
  fullName: string,
  role: 'admin' | 'collector',
  phone?: string
) {
  try {
    const hashedPassword = await hashPassword(password);
    const result = await query(
      'INSERT INTO users (email, password_hash, full_name, role, phone) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, full_name, role',
      [email, hashedPassword, fullName, role, phone || null]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

// Generate session token
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Session management (in-memory for now, can be upgraded to database or Redis)
const sessions = new Map<string, { userId: number; email: string; role: string; expiresAt: number }>();

export function createSession(userId: number, email: string, role: string): string {
  const token = generateSessionToken();
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  sessions.set(token, { userId, email, role, expiresAt });
  return token;
}

export function getSession(token: string) {
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session;
}

export function deleteSession(token: string) {
  sessions.delete(token);
}

// Verify user credentials
export async function verifyCredentials(email: string, password: string) {
  try {
    const user = await getUserWithPassword(email);
    if (!user || !user.is_active) {
      return null;
    }

    const passwordMatch = await verifyPassword(password, user.password_hash);
    if (!passwordMatch) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
    };
  } catch (error) {
    console.error('Error verifying credentials:', error);
    throw error;
  }
}
