// Fallback authentication for development when database is not available
const FALLBACK_USERS = {
  'admin@finance.com': {
    id: 1,
    email: 'admin@finance.com',
    fullName: 'Admin User',
    role: 'admin',
    password: 'admin123' // In production, this would be hashed
  },
  'collector@finance.com': {
    id: 2,
    email: 'collector@finance.com',
    fullName: 'Collector User',
    role: 'collector',
    password: 'collector123'
  }
}

export async function verifyCredentialsFallback(email: string, password: string) {
  const user = FALLBACK_USERS[email as keyof typeof FALLBACK_USERS];
  
  if (!user || user.password !== password) {
    return null;
  }
  
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role as 'admin' | 'collector',
  };
}

export async function getUserByEmailFallback(email: string) {
  const user = FALLBACK_USERS[email as keyof typeof FALLBACK_USERS];
  if (!user) return null;
  
  return {
    id: user.id,
    email: user.email,
    full_name: user.fullName,
    role: user.role,
    phone: null,
    is_active: true,
  };
}
