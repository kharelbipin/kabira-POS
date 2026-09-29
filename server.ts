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
