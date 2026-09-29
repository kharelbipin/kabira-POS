import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/api.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Mount POS Backend REST API
  app.use('/api', apiRouter);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = process.cwd();
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global error handler middleware (mounted after all routes and handlers)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('API Error:', err);
    if (!res.headersSent) {
      res.status(err.status || 500).json({
        error: err.message || 'Internal server error occurred',
        timestamp: new Date().toISOString(),
      });
    }
  });

  const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`[POS Server] Running on http://127.0.0.1:${PORT}`);
});

  server.on('upgrade', (req, socket) => {
    socket.destroy();
  });
}

startServer();
