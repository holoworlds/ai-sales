
import { v4 as uuidv4 } from 'uuid';

// full-stack implementation using server-side local file storage
// as requested: "数据应该存储在本地，不要存储在浏览器里"

const API_BASE = '/api/db';

  const safeJson = async (res: Response) => {
    try {
      const text = await res.text();
      if (!text || text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) {
        return null;
      }
      return JSON.parse(text);
    } catch (err) {
      // Only log if it's actually supposed to be JSON but failed
      return null;
    }
  };

export const localDb = {
  getCollection: async (collectionName: string) => {
    try {
      const res = await fetch(`${API_BASE}/${collectionName}`);
      if (!res.ok) return [];
      const data = await safeJson(res);
      return data || [];
    } catch (err) {
      console.error(`[localDb] getCollection error for ${collectionName}:`, err);
      return [];
    }
  },

  getAll: async (collectionName: string) => {
    return localDb.getCollection(collectionName);
  },

  getOne: async (collectionName: string, id: string) => {
    const collection = await localDb.getCollection(collectionName);
    return collection.find((item: any) => item.id === id);
  },

  add: async (collectionName: string, doc: any) => {
    try {
      const newDoc = {
        ...doc,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const res = await fetch(`${API_BASE}/${collectionName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDoc)
      });
      
      return await safeJson(res);
    } catch (err) {
      console.error(`[localDb] add error for ${collectionName}:`, err);
      return null;
    }
  },

  update: async (collectionName: string, id: string, updates: any) => {
    try {
      const res = await fetch(`${API_BASE}/${collectionName}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updates,
          updatedAt: new Date().toISOString()
        })
      });
      
      if (!res.ok) return null;
      return await safeJson(res);
    } catch (err) {
      console.error(`[localDb] update error for ${collectionName}/${id}:`, err);
      return null;
    }
  },

  delete: async (collectionName: string, id: string) => {
    try {
      await fetch(`${API_BASE}/${collectionName}/${id}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.error(`[localDb] delete error for ${collectionName}/${id}:`, err);
    }
  },

  query: async (collectionName: string, filterFn: (item: any) => boolean) => {
    const collection = await localDb.getCollection(collectionName);
    return collection.filter(filterFn);
  }
};

// Auth replacement using server-side storage
export const localAuth = {
  getCurrentUserAsync: async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) return { uid: 'local-user', email: 'user@local.nexus', displayName: '本地用户' };
      const text = await res.text();
      return text ? JSON.parse(text) : { uid: 'local-user', email: 'user@local.nexus', displayName: '本地用户' };
    } catch (err) {
      console.error(`[localAuth] getCurrentUserAsync error:`, err);
      return { uid: 'local-user', email: 'user@local.nexus', displayName: '本地用户' };
    }
  },
  
  // For synchronous access we might need a fallback or state management
  // but since we are refactoring, we'll suggest components handle the async nature.
  getCurrentUser: () => {
    // Note: This is now a "stale" mock for parts of the app that expect sync access.
    // Ideally, the app should use a Provider or async pattern.
    return { uid: 'local-user', email: 'user@local.nexus', displayName: '本地用户' };
  },
  
  logout: async () => {
    try {
      // Potentially clear server session if implemented
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    } catch (err) {
      console.error("Logout failed:", err);
    }
  }
};
