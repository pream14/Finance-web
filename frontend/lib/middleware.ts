import { getSession } from './auth';
import { cookies } from 'next/headers';

export async function getAuthUser() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  
  if (!sessionToken) {
    return null;
  }

  const session = getSession(sessionToken);
  if (!session) {
    return null;
  }

  return {
    id: session.userId,
    email: session.email,
    role: session.role,
  };
}

export async function requireAuth() {
  const user = await getAuthUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function requireAdmin() {
  const user = await getAuthUser();
  if (!user || user.role !== 'admin') {
    throw new Error('Admin access required');
  }
  return user;
}

export async function requireCollector() {
  const user = await getAuthUser();
  if (!user || user.role !== 'collector') {
    throw new Error('Collector access required');
  }
  return user;
}

export async function requireRole(requiredRole: string) {
  const user = await getAuthUser();
  if (!user || user.role !== requiredRole) {
    throw new Error(`${requiredRole} access required`);
  }
  return user;
}
