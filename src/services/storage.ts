
import { v4 as uuidv4 } from 'uuid';

// This file now acts as a proxy for the server-side JSON storage in /data
export const localDb = {
  getAll: async (collectionName: string): Promise<any[]> => {
    try {
      const res = await fetch(`/api/db/${collectionName}`);
      if (!res.ok) throw new Error(`Fetch failed: ${res.statusText}`);
      const serverData = await res.json();
      
      // MIGRATION: If server is empty but localStorage has data, sync to server
      if (Array.isArray(serverData) && serverData.length === 0) {
        const localDataRaw = localStorage.getItem(`nexus_${collectionName}`);
        if (localDataRaw) {
          try {
            const localData = JSON.parse(localDataRaw);
            if (Array.isArray(localData) && localData.length > 0) {
              console.log(`[Migration] Detected ${localData.length} items for ${collectionName} in localStorage. Syncing...`);
              // Sync sequentially to avoid server-side pressure even with locks
              for (const item of localData) {
                await localDb.add(collectionName, item).catch(e => {
                  console.warn(`[Migration] Failed to sync item to ${collectionName}:`, e);
                });
              }
              console.log(`[Migration] Completed sync for ${collectionName}`);
              return localData;
            }
          } catch (parseErr) {
            console.error(`[Migration] Failed to parse local data for ${collectionName}:`, parseErr);
          }
        }
      }
      
      return serverData;
    } catch (err) {
      console.error(`Error getting all from ${collectionName}:`, err);
      // Fallback to localStorage if server fails
      const localDataRaw = localStorage.getItem(`nexus_${collectionName}`);
      return localDataRaw ? JSON.parse(localDataRaw) : [];
    }
  },

  getOne: async (collectionName: string, id: string) => {
    try {
      const items = await localDb.getAll(collectionName);
      return items.find((i: any) => i.id === id);
    } catch (err) {
      console.error(`Error getting one from ${collectionName}:`, err);
      return null;
    }
  },

  getById: async (collectionName: string, id: string) => {
    return localDb.getOne(collectionName, id);
  },

  add: async (collectionName: string, data: any) => {
    try {
      const id = data.id || uuidv4();
      const now = new Date().toISOString();
      const newDoc = {
        ...data,
        id,
        timestamp: data.timestamp || now,
        createdAt: data.createdAt || now,
        updatedAt: now
      };
      
      const res = await fetch(`/api/db/${collectionName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDoc)
      });
      
      if (!res.ok) throw new Error(`Add failed: ${res.statusText}`);
      return await res.json();
    } catch (err) {
      console.error(`Error adding to ${collectionName}:`, err);
      throw err;
    }
  },

  update: async (collectionName: string, id: string, updates: any) => {
    try {
      const res = await fetch(`/api/db/${collectionName}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (!res.ok) throw new Error(`Update failed: ${res.statusText}`);
      return await res.json();
    } catch (err) {
      console.error(`Error updating ${collectionName}:`, err);
      throw err;
    }
  },

  delete: async (collectionName: string, id: string) => {
    try {
      const res = await fetch(`/api/db/${collectionName}/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error(`Delete failed: ${res.statusText}`);
    } catch (err) {
      console.error(`Error deleting from ${collectionName}:`, err);
      throw err;
    }
  },

  query: async (collectionName: string, filterFn: (item: any) => boolean) => {
    const items = await localDb.getAll(collectionName);
    return items.filter(filterFn);
  }
};

// Simplified local-first auth via server
export const localAuth = {
  getCurrentUserAsync: async (): Promise<any> => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) throw new Error('Auth fetch failed');
      return await res.json();
    } catch (err) {
      return null;
    }
  },
  
  getCurrentUser: () => {
    return null; // Handled by loading the async version on init in components
  },
  
  login: async () => {
    return localAuth.getCurrentUserAsync();
  },

  logout: async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
  }
};
