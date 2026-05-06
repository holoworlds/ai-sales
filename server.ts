
import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  const DATA_DIR = path.join(__dirname, 'data');

  // Ensure data directory exists
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create data directory:', err);
  }

  app.use(express.json());

  // API Routes for Local Storage (on the server disk)
  
  const getFilePath = (collection: string) => path.join(DATA_DIR, `${collection}.json`);

  const readData = async (collection: string) => {
    try {
      const filePath = getFilePath(collection);
      const data = await fs.readFile(filePath, 'utf-8');
      if (!data || data.trim() === '') return [];
      return JSON.parse(data);
    } catch (err) {
      // If file doesn't exist, it's fine, return empty array
      return [];
    }
  };

  const writeData = async (collection: string, data: any[]) => {
    await fs.writeFile(getFilePath(collection), JSON.stringify(data, null, 2), 'utf-8');
  };

  app.get('/api/db/:collection', async (req, res) => {
    const data = await readData(req.params.collection);
    res.json(data);
  });

  app.post('/api/db/:collection', async (req, res) => {
    const { collection } = req.params;
    const items = await readData(collection);
    const newItem = req.body;
    items.push(newItem);
    await writeData(collection, items);
    res.status(201).json(newItem);
  });

  app.put('/api/db/:collection/:id', async (req, res) => {
    const { collection, id } = req.params;
    const items = await readData(collection);
    const index = items.findIndex((i: any) => i.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...req.body };
      await writeData(collection, items);
      res.json(items[index]);
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  });

  app.delete('/api/db/:collection/:id', async (req, res) => {
    const { collection, id } = req.params;
    const items = await readData(collection);
    const filtered = items.filter((i: any) => i.id !== id);
    await writeData(collection, filtered);
    res.status(204).end();
  });

  // Mock User Identity persistent store
  app.get('/api/auth/me', async (req, res) => {
     try {
       const userData = await fs.readFile(path.join(DATA_DIR, 'user_identity.json'), 'utf-8');
       res.json(JSON.parse(userData));
     } catch (err) {
       const defaultUser = { uid: 'local-user', email: 'user@local.nexus', displayName: '本地用户' };
       await fs.writeFile(path.join(DATA_DIR, 'user_identity.json'), JSON.stringify(defaultUser, null, 2));
       res.json(defaultUser);
     }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
