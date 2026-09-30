import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/api.js';

const BRIDGE_BASE_URL = 'http://127.0.0.1:5055';
const BRIDGE_TOKEN_PATH = path.join(
    process.env.PROGRAMDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
    'KaBiRa POS',
    'bridge.token'
);

function readBridgeToken(): string {
    try {
        const token = fs.readFileSync(BRIDGE_TOKEN_PATH, 'utf8').trim();
        if (!token || token.length < 16) {
            throw new Error('Bridge token is empty or invalid.');
        }
        return token;
    } catch (error: any) {
        throw new Error(
            `KaBiRa Hardware Bridge authentication is not available. ` +
            `Verify that the KaBiRaPOSBridge Windows service is installed and running. ` +
            `(${error?.message || 'bridge.token could not be read'})`
        );
    }
}

function isAllowedBridgePath(rawPath: string): boolean {
    const pathname = rawPath.split('?')[0];

    if (pathname === '/api/bridge/health') return true;
    if (pathname === '/api/bridge/version') return true;
    if (pathname === '/api/hardware/scan') return true;
    if (pathname === '/api/hardware/devices') return true;
    if (pathname === '/api/hardware/summary') return true;
    if (pathname === '/api/printers') return true;
    if (/^\/api\/printers\/[^/]+\/test-print$/.test(pathname)) return true;
    if (/^\/api\/printers\/[^/]+\/print$/.test(pathname)) return true;
    if (pathname === '/api/drawer/open') return true;
    if (pathname === '/api/displays') return true;
    if (/^\/api\/displays\/[^/]+\/test$/.test(pathname)) return true;

    return false;
}

async function startServer() {
    const app = express();
    const PORT = 3000;

    app.disable('x-powered-by');
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    /*
     * Secure local Hardware Bridge proxy.
     *
     * Browser:
     *   http://127.0.0.1:3000/bridge/api/...
     *
     * Local Node backend:
     *   reads %ProgramData%\KaBiRa POS\bridge.token
     *   and forwards to http://127.0.0.1:5055/api/...
     *
     * The Bridge token is never returned to browser JavaScript or localStorage.
     */
    app.use('/bridge', async (req, res) => {
        try {
            const bridgePath = req.originalUrl.substring('/bridge'.length);

            if (!isAllowedBridgePath(bridgePath)) {
                return res.status(404).json({
                    success: false,
                    error: 'Unsupported Hardware Bridge endpoint.',
                });
            }

            const method = req.method.toUpperCase();
            if (method !== 'GET' && method !== 'POST') {
                return res.status(405).json({
                    success: false,
                    error: 'Method not allowed.',
                });
            }

            const token = readBridgeToken();
            const headers: Record<string, string> = {
                'X-Bridge-Token': token,
                'X-Client': 'Kabira-POS-Local-Backend',
            };

            let body: string | undefined;
            if (method !== 'GET') {
                if (typeof req.body === 'string') {
                    body = req.body;
                    headers['Content-Type'] = req.get('content-type') || 'text/plain; charset=utf-8';
                } else if (req.body !== undefined && req.body !== null) {
                    body = JSON.stringify(req.body);
                    headers['Content-Type'] = 'application/json';
                }
            }

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            try {
                const bridgeResponse = await fetch(`${BRIDGE_BASE_URL}${bridgePath}`, {
                    method,
                    headers,
                    body,
                    signal: controller.signal,
                });

                const responseBody = await bridgeResponse.text();
                res.status(bridgeResponse.status);

                const contentType = bridgeResponse.headers.get('content-type');
                if (contentType) {
                    res.setHeader('Content-Type', contentType);
                }

                return res.send(responseBody);
            } finally {
                clearTimeout(timeout);
            }
        } catch (error: any) {
            const timedOut = error?.name === 'AbortError';
            console.error('[Bridge Proxy]', error);

            return res.status(timedOut ? 504 : 503).json({
                success: false,
                error: timedOut
                    ? 'KaBiRa Hardware Bridge request timed out.'
                    : error?.message || 'KaBiRa Hardware Bridge is unavailable.',
            });
        }
    });

    // Mount POS Backend REST API
    app.use('/api', apiRouter);

    // Health check endpoint
    app.get('/api/health', (_req, res) => {
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
        // Installer places index.html and assets directly in the Client working directory.
        const distPath = process.cwd();
const assetsPath = path.join(distPath, 'assets');

// Serve Vite CSS/JS assets before the SPA fallback
app.use(
  '/assets',
  express.static(assetsPath, {
    fallthrough: false,
    index: false,
    maxAge: '1y',
    immutable: true,
  })
);

// Serve remaining static files
app.use(express.static(distPath, { index: false }));

// SPA fallback only for application routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/assets/')) {
    return res.status(404).type('text/plain').send('Asset not found');
  }

  if (path.extname(req.path)) {
    return next();
  }

  return res.sendFile(path.join(distPath, 'index.html'));
});
    }

    // Global error handler middleware
    app.use(
        (
            err: any,
            _req: express.Request,
            res: express.Response,
            _next: express.NextFunction
        ) => {
            console.error('API Error:', err);
            if (!res.headersSent) {
                res.status(err.status || 500).json({
                    error: err.message || 'Internal server error occurred',
                    timestamp: new Date().toISOString(),
                });
            }
        }
    );

    // Local-only POS server. Do not expose the register backend to the LAN.
    const server = app.listen(PORT, '127.0.0.1', () => {
        console.log(`[POS Server] Running on http://127.0.0.1:${PORT}`);
        console.log(`[Bridge Proxy] Using token file: ${BRIDGE_TOKEN_PATH}`);
    });

    server.on('upgrade', (_req, socket) => {
        socket.destroy();
    });
}

startServer().catch((error) => {
    console.error('[POS Server] Fatal startup error:', error);
    process.exit(1);
});
