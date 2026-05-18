
import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs/promises';
import { existsSync, mkdirSync, readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  const DATA_DIR = path.join(process.cwd(), 'data');

  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }

  // Middlewares
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Global Request Logger
  app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
      console.log(`[API Request] ${req.method} ${req.url}`);
    }
    next();
  });

  // Diagnostic Endpoint
  app.get('/api/ping', (req, res) => {
    const rootFiles = existsSync('/') ? readdirSync('/') : [];
    const dataFiles = existsSync(DATA_DIR) ? readdirSync(DATA_DIR) : [];
    
    res.json({ 
      pong: true, 
      time: new Date().toISOString(), 
      dataDir: DATA_DIR,
      cwd: process.cwd(),
      dirname: __dirname,
      root: rootFiles,
      data: dataFiles,
      env: process.env.NODE_ENV
    });
  });

  // Data Explorer
  app.get('/api/admin/data-explorer', async (req, res) => {
    try {
      const files = existsSync(DATA_DIR) ? readdirSync(DATA_DIR) : [];
      const stats = await Promise.all(files.map(async f => {
        const s = await fs.stat(path.join(DATA_DIR, f));
        return { name: f, size: s.size, mtime: s.mtime };
      }));
      res.json({ dataDir: DATA_DIR, files: stats });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Database Locks ---
  const locks: { [key: string]: Promise<void> } = {};
  const withLock = async (collection: string, fn: () => Promise<any>) => {
    const prev = locks[collection] || Promise.resolve();
    const next = (async () => {
      try {
        await prev;
      } catch (err) {}
      return await fn();
    })();
    locks[collection] = next.then(() => {}, () => {});
    return next;
  };

  const getFilePath = (collection: string) => {
    // 强制按 / 分割，确保生成层级目录
    const parts = collection.split('/').filter(p => p.trim() !== '');
    const safeParts = parts.map(p => p.replace(/[^a-z0-9_\-\.]/gi, '_'));
    return path.join(DATA_DIR, ...safeParts) + '.json';
  };

  // 迁徙逻辑：仅用于将旧的扁平文件 (clients_ID_type) 搬运到新的层级目录 (clients/ID/type)
  const migrateToNestedPaths = async () => {
    try {
      if (!existsSync(DATA_DIR)) return;
      const files = readdirSync(DATA_DIR);
      for (const file of files) {
        // 只识别旧的 clients_... 格式
        if (file.startsWith('clients_') && file.endsWith('.json')) {
          const contentMatch = file.match(/^clients_(.+?)_(interactions|content|consultations|briefing)\.json$/);
          if (contentMatch) {
            const [, clientId, type] = contentMatch;
            const oldPath = path.join(DATA_DIR, file);
            const newDir = path.join(DATA_DIR, 'clients', clientId);
            const newPath = path.join(newDir, `${type}.json`);
            
            if (!existsSync(newDir)) mkdirSync(newDir, { recursive: true });
            
            if (!existsSync(newPath)) {
              await fs.rename(oldPath, newPath);
              console.log(`[Migration] Moved legacy file ${file} to ${newPath}`);
            } else {
              // 如果新旧文件都存在，则合并数据
              try {
                const oldData = JSON.parse(await fs.readFile(oldPath, 'utf-8'));
                const newData = JSON.parse(await fs.readFile(newPath, 'utf-8'));
                const merged = [...(Array.isArray(newData) ? newData : []), ...(Array.isArray(oldData) ? oldData : [])];
                const uniqueMap = new Map();
                merged.forEach(item => { if (item.id) uniqueMap.set(item.id, item); });
                await fs.writeFile(newPath, JSON.stringify(Array.from(uniqueMap.values()), null, 2), 'utf-8');
                await fs.unlink(oldPath);
                console.log(`[Migration] Merged legacy file ${file} into ${newPath}`);
              } catch (e) {
                console.error(`[Migration] Failed to merge ${file}`, e);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('[Migration Error]', err);
    }
  };

  // Run migration on start
  await migrateToNestedPaths();

  const readCollection = async (collection: string) => {
    const filePath = getFilePath(collection);
    try {
      if (existsSync(filePath)) {
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data || '[]');
      }
      return [];
    } catch (err: any) {
      console.error(`[DB READ ERROR] ${collection} (${filePath}):`, err.message);
      return [];
    }
  };

  const writeCollection = async (collection: string, data: any[]) => {
    const filePath = getFilePath(collection);
    const dirPath = path.dirname(filePath);
    try {
      if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
      }
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err: any) {
      console.error(`[DB WRITE ERROR] ${collection} (${filePath}):`, err.message);
      throw err;
    }
  };

  // --- LLM Proxy ---
  console.log('[LLM Route] Registering POST /api/llm');
  app.post(['/api/llm', '/api/llm/'], async (req, res) => {
    try {
      const { provider: rawProvider, modelId, apiKey, baseUrl, prompt, options } = req.body;
      const provider = (rawProvider || '').toString().toUpperCase();
      const model = (modelId || '').toString();

      console.log(`[LLM Proxy] ${provider} | ${model} | Len: ${prompt?.length}`);

      let finalPrompt = prompt;
      let finalSystemInstruction = options?.systemInstruction;

      if (options?.json) {
        const jsonHint = " (Response must be in valid JSON format)";
        if (!finalPrompt.toLowerCase().includes('json')) {
          finalPrompt += jsonHint;
        }
        if (finalSystemInstruction && !finalSystemInstruction.toLowerCase().includes('json')) {
          finalSystemInstruction += jsonHint;
        }
      }

      let effectiveProvider = provider;
      if (!effectiveProvider || effectiveProvider === 'CUSTOM') {
        const m = model.toLowerCase();
        if (m.includes('gemini')) effectiveProvider = 'GOOGLE';
        else if (m.includes('deepseek')) effectiveProvider = 'DEEPSEEK';
        else if (m.includes('gpt')) effectiveProvider = 'OPENAI';
      }

      if (effectiveProvider === 'GOOGLE' || effectiveProvider === 'GEMINI') {
        const key = apiKey || process.env.GEMINI_API_KEY;
        if (!key) throw new Error('GEMINI_API_KEY is missing');
        
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-2.0-flash-exp'}:generateContent?key=${key}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: finalPrompt }] }],
            systemInstruction: options?.systemInstruction ? { parts: [{ text: options.systemInstruction }] } : undefined,
            generationConfig: { responseMimeType: options?.json ? 'application/json' : undefined }
          })
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error?.message || `Google API Error ${response.status}`);
        }
        const data = await response.json();
        res.json({ content: data.candidates?.[0]?.content?.parts?.[0]?.text || '' });
      } else {
        let urlBase = (baseUrl || '').replace(/\/+$/, '');
        if (!urlBase) {
          if (effectiveProvider === 'OPENAI') urlBase = 'https://api.openai.com/v1';
          else if (effectiveProvider === 'DEEPSEEK') urlBase = 'https://api.deepseek.com';
          else if (effectiveProvider === 'KIMI') urlBase = 'https://api.moonshot.cn/v1';
        }
        
        if (!urlBase) throw new Error(`Missing Base URL for provider ${effectiveProvider}`);

        const url = `${urlBase}/chat/completions`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey || ''}`
          },
          body: JSON.stringify({
            model: model,
            messages: [
              ...(finalSystemInstruction ? [{ role: 'system', content: finalSystemInstruction }] : []),
              { role: 'user', content: finalPrompt }
            ],
            response_format: (options?.json && !model.toLowerCase().includes('reasoner')) ? { type: "json_object" } : undefined
          })
        });

        if (!response.ok) {
          const text = await response.text();
          console.error(`[LLM Upstream Error] ${effectiveProvider} (${response.status}):`, text);
          throw new Error(`Upstream ${effectiveProvider} Error (${response.status}): ${text.substring(0, 200)}`);
        }
        const data = await response.json();
        res.json({ content: data.choices?.[0]?.message?.content || '' });
      }
    } catch (err: any) {
      console.error('[LLM ERROR]', err.message);
      res.status(500).json({ error: true, message: err.message });
    }
  });

  // --- Auth ---
  app.get('/api/auth/me', (req, res) => {
    res.json({ uid: 'local-user', email: 'local@nexus.ai', displayName: '本地管理员' });
  });

  // --- Database ---
  app.get('/api/db/*', async (req, res) => {
    const data = await withLock(req.params[0], () => readCollection(req.params[0]));
    res.json(data);
  });

  app.post('/api/db/*', async (req, res) => {
    const coll = req.params[0];
    await withLock(coll, async () => {
      const items = await readCollection(coll);
      items.push(req.body);
      await writeCollection(coll, items);
      res.status(201).json(req.body);
    });
  });

  app.put('/api/db/*/:id', async (req, res) => {
    const coll = req.params[0];
    const id = req.params.id;
    await withLock(coll, async () => {
      const items = await readCollection(coll);
      const idx = items.findIndex((i: any) => i.id === id);
      if (idx !== -1) {
        items[idx] = { ...items[idx], ...req.body };
        await writeCollection(coll, items);
        res.json(items[idx]);
      } else {
        res.status(404).json({ error: 'Not Found' });
      }
    });
  });

  app.delete('/api/db/*/:id', async (req, res) => {
    const coll = req.params[0];
    const id = req.params.id;
    await withLock(coll, async () => {
      const items = await readCollection(coll);
      const filtered = items.filter((i: any) => i.id !== id);
      await writeCollection(coll, filtered);
      res.status(204).end();
    });
  });

  // Explicit 404 for unmatched /api routes
  app.all('/api/*', (req, res) => {
    console.warn(`[404] API Not Found: ${req.method} ${req.url}`);
    res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
  });

  // Frontend
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const dist = path.resolve(__dirname, 'dist');
    app.use(express.static(dist));
    app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[NEXUS] Server at http://0.0.0.0:${PORT}`);
  });
}

startServer();
