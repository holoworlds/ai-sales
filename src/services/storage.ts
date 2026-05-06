
import { v4 as uuidv4 } from 'uuid';

// full-stack implementation using server-side local file storage
// as requested: "数据应该存储在本地，不要存储在浏览器里"

const API_BASE = '/api/db';

  const safeJson = async (res: Response) => {
    try {
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    } catch (err) {
      console.error('JSON parsing failed:', err);
      return null;
    }
  };

export const localDb = {
  getCollection: async (collectionName: string) => {
    const res = await fetch(`${API_BASE}/${collectionName}`);
    if (!res.ok) return [];
    const data = await safeJson(res);
    return data || [];
  },

  getAll: async (collectionName: string) => {
    return localDb.getCollection(collectionName);
  },

  getOne: async (collectionName: string, id: string) => {
    const collection = await localDb.getCollection(collectionName);
    return collection.find((item: any) => item.id === id);
  },

  add: async (collectionName: string, doc: any) => {
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
  },

  update: async (collectionName: string, id: string, updates: any) => {
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
  },

  delete: async (collectionName: string, id: string) => {
    await fetch(`${API_BASE}/${collectionName}/${id}`, {
      method: 'DELETE'
    });
  },

  query: async (collectionName: string, filterFn: (item: any) => boolean) => {
    const collection = await localDb.getCollection(collectionName);
    return collection.filter(filterFn);
  }
};

// Auth replacement using server-side storage
export const localAuth = {
  getCurrentUserAsync: async () => {
    const res = await fetch('/api/auth/me');
    if (!res.ok) return { uid: 'local-user', email: 'user@local.nexus', displayName: '本地用户' };
    try {
      const text = await res.text();
      return text ? JSON.parse(text) : { uid: 'local-user', email: 'user@local.nexus', displayName: '本地用户' };
    } catch (err) {
      return { uid: 'local-user', email: 'user@local.nexus', displayName: '本地用户' };
    }
  },
  
  // For synchronous access we might need a fallback or state management
  // but since we are refactoring, we'll suggest components handle the async nature.
  getCurrentUser: () => {
    // Note: This is now a "stale" mock for parts of the app that expect sync access.
    // Ideally, the app should use a Provider or async pattern.
    return { uid: 'local-user', email: 'user@local.nexus', displayName: '本地用户' };
  }
};
