import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import net from 'net';
import { db } from './db.js';
import {
  Product,
  CartItem,
  Order,
  User,
  InventoryAdjustment,
  Vendor,
  ScannedInvoice,
  VendorPurchaseStats,
  InvoiceUploadSession,
  BarcodeReceivingSession,
  BarcodeReceivingLine,
  InventoryReceivingTransaction,
  Shift,
  ShiftCashMovement,
  ShiftDenominationCount,
  ShiftReconciliation,
  ShiftSummarySnapshot,
  BankAccount,
  IssuedCheck,
  CheckStubAllocation,
  CheckIssuer,
  CheckFeeRule,
  CheckCashingTransaction,
  DepositBatch,
  CheckQrSession,
  InventoryReservation,
  OmnichannelCartTransfer,
} from '../src/types.js';
import { extractInvoiceFromData, confirmAndReceiveInvoice, normalizeText, parsePackSize } from './invoiceService.js';
import { shiftAndCheckRouter } from './shiftAndCheckRoutes.js';
import { barcodeReceivingRouter } from './barcodeReceivingRoutes.js';
import { onlineStoreRouter } from './onlineStoreRoutes.js';
import { inventoryAiRouter } from './inventoryAiService.js';
import { paymentFallbackService } from './paymentFallbackService.js';

export const apiRouter = express.Router();
apiRouter.use(express.json());

// Persistent Database Auto-Save Middleware
// Automatically debounces writes to disk whenever data is created, modified, or deleted
apiRouter.use((req: Request, res: Response, next: NextFunction) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        db.scheduleSave();
      }
    });
  }
  next();
});

// Database Management Endpoints
apiRouter.get('/database/status', (req: Request, res: Response) => {
  res.json(db.getStats());
});

apiRouter.post('/database/save', (req: Request, res: Response) => {
  const success = db.saveToDiskSync();
  res.json({
    success,
    message: success ? 'Database successfully flushed to persistent disk' : 'Failed to write to disk',
    stats: db.getStats(),
  });
});

apiRouter.get('/database/export', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=pos_database_backup_${Date.now()}.json`);
  res.json(db.serialize());
});

apiRouter.get('/database/schema-sql', (req: Request, res: Response) => {
  const schemaPath = path.join(process.cwd(), 'server', 'database', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const sql = fs.readFileSync(schemaPath, 'utf8');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(sql);
  } else {
    res.status(404).json({ error: 'SQL Schema file not found' });
  }
});

apiRouter.get('/database/status', (req: Request, res: Response) => {
  res.json({
    engine: 'Microsoft SQL Server 2022 / Azure SQL compatible & JSON persistence engine',
    schemaVersion: '1.0.0-production',
    lastSavedAt: db.lastSavedAt,
    tables: {
      users: { count: db.users.length, active: db.users.filter(u => u.active).length },
