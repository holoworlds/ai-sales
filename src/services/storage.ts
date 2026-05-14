
import { v4 as uuidv4 } from 'uuid';
import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  getDocFromServer,
  serverTimestamp
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);

// Test Connection as per critical directive
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const localDb = {
  getCollection: async (collectionName: string): Promise<any[]> => {
    try {
      const snap = await getDocs(collection(db, collectionName));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, collectionName);
      return [];
    }
  },

  getAll: async (collectionName: string) => {
    return localDb.getCollection(collectionName);
  },

  getOne: async (collectionName: string, id: string) => {
    try {
      const d = await getDoc(doc(db, collectionName, id));
      if (!d.exists()) return null;
      return { id: d.id, ...d.data() };
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `${collectionName}/${id}`);
      return null;
    }
  },

  getById: async (collectionName: string, id: string) => {
    return localDb.getOne(collectionName, id);
  },

  add: async (collectionName: string, data: any) => {
    try {
      const id = data.id || uuidv4();
      const newDoc = {
        ...data,
        id,
        createdAt: data.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      await setDoc(doc(db, collectionName, id), newDoc);
      return newDoc;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, collectionName);
      return null;
    }
  },

  update: async (collectionName: string, id: string, updates: any) => {
    try {
      const docRef = doc(db, collectionName, id);
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };
      await updateDoc(docRef, updateData);
      return { id, ...updateData };
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${collectionName}/${id}`);
      return null;
    }
  },

  delete: async (collectionName: string, id: string) => {
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${id}`);
    }
  },

  query: async (collectionName: string, filterFn: (item: any) => boolean) => {
    const items = await localDb.getCollection(collectionName);
    return items.filter(filterFn);
  }
};

export const localAuth = {
  getCurrentUserAsync: (): Promise<any> => {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        if (user) {
          resolve(user);
        } else {
          resolve(null);
        }
      });
    });
  },
  
  getCurrentUser: () => auth.currentUser,
  
  login: async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      return result.user;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  },

  logout: async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  }
};
