import { Router, Request, Response, NextFunction } from 'express';
import { db } from './db.js';
import {
  Product,
  BarcodeReceivingSession,
  BarcodeReceivingLine,
  InventoryReceivingTransaction,
  ScannedInvoice,
  User,
} from '../src/types.js';

export const barcodeReceivingRouter = Router();

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

function getAuthUser(req: Request): User {
  const userId = (req.headers['x-user-id'] as string) || 'usr-1';
  const user = db.users.find(u => u.id === userId && u.active);
  return user || db.users[0];
}

// ----------------------------------------------------------------------------
// List sessions
// ----------------------------------------------------------------------------
const listBarcodeSessions = asyncHandler(async (req: Request, res: Response) => {
  res.json(db.barcodeReceivingSessions || []);
});

barcodeReceivingRouter.get('/invoices/barcode-sessions', listBarcodeSessions);
barcodeReceivingRouter.get('/barcode-sessions', listBarcodeSessions);

// ----------------------------------------------------------------------------
// Create session
// ----------------------------------------------------------------------------
const createBarcodeSession = asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  const {
    vendorId,
    vendorName,
    invoiceNumber,
    invoiceDate,
    receivingLocation,
    expectedTotalUnits,
    notes,
    initialLines,
  } = req.body;

  if (!vendorName || !invoiceNumber) {
    return res.status(400).json({ error: 'Vendor name and Invoice number are required' });
  }

  // Check duplicate invoice (INV-14)
  const isDuplicate = db.invoices.some(
    i => i.invoiceNumber.trim().toLowerCase() === invoiceNumber.trim().toLowerCase() &&
         (i.vendorName.toLowerCase() === vendorName.toLowerCase() || (vendorId && i.vendorId === vendorId))
  );

  const sessionId = `mb-sess-${Date.now()}`;
  const receivingNumber = `RCV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const newSession: BarcodeReceivingSession = {
    id: sessionId,
    receivingNumber,
    vendorId: vendorId || undefined,
    vendorName,
    invoiceNumber,
    invoiceDate: invoiceDate || new Date().toISOString().slice(0, 10),
    status: 'draft',
    receivingLocation: receivingLocation || db.settings.defaultReceivingLocation || 'Main Liquor Storage',
    lines: initialLines || [],
    totalUniqueProducts: (initialLines || []).length,
    totalUnitsReceived: (initialLines || []).reduce((s: number, l: BarcodeReceivingLine) => s + l.receivedUnits, 0),
    totalCost: (initialLines || []).reduce((s: number, l: BarcodeReceivingLine) => s + l.extendedCost, 0),
    expectedTotalUnits: expectedTotalUnits ? Number(expectedTotalUnits) : undefined,
    notes: notes || (isDuplicate ? 'Note: Possible duplicate invoice number detected.' : ''),
    createdByUserId: currentUser.id,
    createdByUserName: currentUser.name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.barcodeReceivingSessions.unshift(newSession);
  db.addAudit(
    currentUser.id,
    currentUser.name,
    currentUser.role,
    'BARCODE_SESSION_START',
    'inventory',
    sessionId,
    `Started barcode receiving session ${receivingNumber} for Invoice #${invoiceNumber} (${vendorName})`
  );

  res.status(201).json(newSession);
});

barcodeReceivingRouter.post('/invoices/barcode-sessions', createBarcodeSession);
barcodeReceivingRouter.post('/barcode-sessions', createBarcodeSession);

// ----------------------------------------------------------------------------
// Get single session
// ----------------------------------------------------------------------------
const getBarcodeSession = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const session = db.barcodeReceivingSessions.find(s => s.id === id);
  if (!session) {
    return res.status(404).json({ error: 'Barcode receiving session not found' });
  }
  res.json(session);
});

barcodeReceivingRouter.get('/invoices/barcode-sessions/:id', getBarcodeSession);
barcodeReceivingRouter.get('/barcode-sessions/:id', getBarcodeSession);

// ----------------------------------------------------------------------------
// Update session
// ----------------------------------------------------------------------------
const updateBarcodeSession = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const session = db.barcodeReceivingSessions.find(s => s.id === id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const { lines, notes, receivingLocation, expectedTotalUnits, invoiceNumber, vendorName } = req.body;
  if (lines !== undefined) {
    session.lines = lines;
    session.totalUniqueProducts = lines.length;
    session.totalUnitsReceived = lines.reduce((s: number, l: BarcodeReceivingLine) => s + (l.receivedUnits || 0), 0);
    session.totalCost = Number(lines.reduce((s: number, l: BarcodeReceivingLine) => s + (l.extendedCost || 0), 0).toFixed(2));
  }
  if (notes !== undefined) session.notes = notes;
  if (receivingLocation !== undefined) session.receivingLocation = receivingLocation;
  if (expectedTotalUnits !== undefined) session.expectedTotalUnits = Number(expectedTotalUnits);
  if (invoiceNumber !== undefined) session.invoiceNumber = invoiceNumber;
  if (vendorName !== undefined) session.vendorName = vendorName;
  session.updatedAt = new Date().toISOString();

  res.json(session);
});

barcodeReceivingRouter.put('/invoices/barcode-sessions/:id', updateBarcodeSession);
barcodeReceivingRouter.put('/barcode-sessions/:id', updateBarcodeSession);

// ----------------------------------------------------------------------------
// Scan barcode into session
// ----------------------------------------------------------------------------
const scanBarcode = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const session = db.barcodeReceivingSessions.find(s => s.id === id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const { barcode, isCaseBarcode, manualQuantity, packMultiplier } = req.body;
  if (!barcode) {
    return res.status(400).json({ error: 'Barcode string is required' });
  }

  const cleanCode = barcode.trim();
  const digitsOnly = cleanCode.replace(/\D/g, '');

  let matchedProduct: Product | undefined = db.products.find(p => {
    if (!p.active) return false;
    if (p.barcode && (p.barcode.trim() === cleanCode || (digitsOnly.length >= 8 && p.barcode.replace(/\D/g, '') === digitsOnly))) {
      return true;
    }
    if (p.sku && p.sku.trim().toLowerCase() === cleanCode.toLowerCase()) {
      return true;
    }
    return false;
  });

  if (!matchedProduct) {
    return res.json({
      found: false,
      barcode: cleanCode,
      message: `No catalog item found with barcode "${cleanCode}". Please link or create.`,
      session,
    });
  }

  let unitsToAdd = 1;
  let packSize = 1;

  if (manualQuantity && Number(manualQuantity) > 0) {
    unitsToAdd = Number(manualQuantity);
  } else if (isCaseBarcode || (packMultiplier && packMultiplier > 1)) {
    packSize = packMultiplier || 12;
    unitsToAdd = packSize;
  }

  let unitCost = matchedProduct.cost ?? matchedProduct.costPrice ?? (matchedProduct.price * 0.7);
  unitCost = Math.round(unitCost * 100) / 100;

  let existingLineIndex = session.lines.findIndex(l => l.productId === matchedProduct!.id || l.barcode === cleanCode);
  let affectedLine: BarcodeReceivingLine;

  if (existingLineIndex >= 0) {
    const line = session.lines[existingLineIndex];
    line.receivedUnits += unitsToAdd;
    line.newStock = line.currentStock + line.receivedUnits;
    line.extendedCost = Number((line.receivedUnits * line.unitCost).toFixed(2));
    affectedLine = line;
  } else {
    affectedLine = {
      id: `mbl-${Date.now()}`,
      barcode: cleanCode,
      productId: matchedProduct.id,
      productName: matchedProduct.name,
      sku: matchedProduct.sku,
      size: matchedProduct.size || '750ml',
      categoryName: matchedProduct.categoryName,
      currentStock: matchedProduct.stockQuantity,
      receivedUnits: unitsToAdd,
      packSize: packSize,
      newStock: matchedProduct.stockQuantity + unitsToAdd,
      unitCost,
      extendedCost: Number((unitsToAdd * unitCost).toFixed(2)),
      previousCost: unitCost,
      costDiff: 0,
      costDiffPercent: 0,
      currentPrice: matchedProduct.price,
      oldMargin: 30,
      newMargin: 30,
      updateCost: false,
      status: 'valid',
    };
    session.lines.unshift(affectedLine);
  }

  session.totalUniqueProducts = session.lines.length;
  session.totalUnitsReceived = session.lines.reduce((s, l) => s + l.receivedUnits, 0);
  session.totalCost = Number(session.lines.reduce((s, l) => s + l.extendedCost, 0).toFixed(2));
  session.updatedAt = new Date().toISOString();

  res.json({
    found: true,
    scannedLine: affectedLine,
    session,
    message: `Scanned "${matchedProduct.name}" (+${unitsToAdd} units)`,
  });
});

barcodeReceivingRouter.post('/invoices/barcode-sessions/:id/scan', scanBarcode);
barcodeReceivingRouter.post('/barcode-sessions/:id/scan', scanBarcode);

// ----------------------------------------------------------------------------
// Link unknown barcode
// ----------------------------------------------------------------------------
const linkUnknown = asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  const { id } = req.params;
  const session = db.barcodeReceivingSessions.find(s => s.id === id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const { barcode, productId, newProductData, receivedUnits } = req.body;
  let targetProduct: Product | undefined;

  if (newProductData) {
    const cat = db.categories.find(c => c.id === newProductData.categoryId) || db.categories[0];
    const newProd: Product = {
      id: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: newProductData.name,
      sku: newProductData.sku || `SKU-${Date.now().toString().slice(-6)}`,
      barcode,
      categoryId: cat.id,
      categoryName: cat.name,
      price: Number(newProductData.price) || 29.99,
      cost: Number(newProductData.cost) || 19.99,
      costPrice: Number(newProductData.cost) || 19.99,
      taxRate: db.settings.defaultTaxRate || 0.0825,
      size: newProductData.size || '750ml',
      stockQuantity: 0,
      lowStockThreshold: 6,
      active: true,
      imageUrl: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=500&auto=format&fit=crop&q=60',
      description: `Created during receiving session for Invoice #${session.invoiceNumber}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.products.push(newProd);
    targetProduct = newProd;

    db.addAudit(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'PRODUCT_CREATE',
      'product',
      newProd.id,
      `Created product "${newProd.name}" from unknown barcode ${barcode}`
    );
  } else if (productId) {
    targetProduct = db.products.find(p => p.id === productId);
    if (targetProduct && (!targetProduct.barcode || targetProduct.barcode !== barcode)) {
      targetProduct.barcode = barcode;
    }
  }

  if (!targetProduct) {
    return res.status(400).json({ error: 'Valid product or new product data is required' });
  }

  const qty = Number(receivedUnits) || 1;
  const unitCost = targetProduct.cost ?? targetProduct.costPrice ?? (targetProduct.price * 0.7);

  const newLine: BarcodeReceivingLine = {
    id: `mbl-${Date.now()}`,
    barcode,
    productId: targetProduct.id,
    productName: targetProduct.name,
    sku: targetProduct.sku,
    size: targetProduct.size || '750ml',
    categoryName: targetProduct.categoryName,
    currentStock: targetProduct.stockQuantity,
    receivedUnits: qty,
    packSize: 1,
    newStock: targetProduct.stockQuantity + qty,
    unitCost,
    extendedCost: Number((qty * unitCost).toFixed(2)),
    previousCost: unitCost,
    costDiff: 0,
    costDiffPercent: 0,
    currentPrice: targetProduct.price,
    oldMargin: 30,
    newMargin: 30,
    updateCost: false,
    status: 'valid',
  };

  session.lines.unshift(newLine);
  session.totalUniqueProducts = session.lines.length;
  session.totalUnitsReceived = session.lines.reduce((s, l) => s + l.receivedUnits, 0);
  session.totalCost = Number(session.lines.reduce((s, l) => s + l.extendedCost, 0).toFixed(2));
  session.updatedAt = new Date().toISOString();

  res.json({ success: true, product: targetProduct, session });
});

barcodeReceivingRouter.post('/invoices/barcode-sessions/:id/link-unknown', linkUnknown);
barcodeReceivingRouter.post('/barcode-sessions/:id/link-unknown', linkUnknown);

// ----------------------------------------------------------------------------
// Receive & commit all inventory
// ----------------------------------------------------------------------------
const receiveSession = asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  const { id } = req.params;
  const session = db.barcodeReceivingSessions.find(s => s.id === id);

  if (!session) {
    return res.status(404).json({ error: 'Receiving session not found' });
  }

  if (session.status === 'completed') {
    return res.status(400).json({ error: 'This receiving session has already been completed and received.' });
  }

  if (session.lines.length === 0) {
    return res.status(400).json({ error: 'Cannot receive empty session. Please scan at least one product.' });
  }

  const { approveAllCosts } = req.body;
  const receivingTransactions: InventoryReceivingTransaction[] = [];
  const now = new Date().toISOString();

  // ATOMIC DATABASE TRANSACTION
  for (const line of session.lines) {
    const product = db.products.find(p => p.id === line.productId);
    if (!product) continue;

    const previousQty = product.stockQuantity;
    const receivedQty = line.receivedUnits;
    const newQty = previousQty + receivedQty;

    product.stockQuantity = newQty;
    product.updatedAt = now;

    const shouldUpdateCost = approveAllCosts || line.updateCost || db.settings.autoUpdateProductCost;
    if (shouldUpdateCost && line.unitCost > 0) {
      product.cost = line.unitCost;
      product.costPrice = line.unitCost;
    }

    const tx: InventoryReceivingTransaction = {
      id: `rcv-tx-${Date.now()}-${receivingTransactions.length + 1}`,
      invoiceId: session.id,
      invoiceNumber: session.invoiceNumber,
      vendorId: session.vendorId || 'vnd-multi',
      vendorName: session.vendorName,
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      receivedQuantity: receivedQty,
      previousQuantity: previousQty,
      newQuantity: newQty,
      unitCost: line.unitCost,
      totalCost: line.extendedCost,
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      receivingLocation: session.receivingLocation,
      timestamp: now,
    };

    db.receivingTransactions.unshift(tx);
    receivingTransactions.push(tx);
  }

  const finalizedInvoice: ScannedInvoice = {
    id: session.id,
    invoiceNumber: session.invoiceNumber,
    invoiceDate: session.invoiceDate,
    receivedDate: now,
    vendorId: session.vendorId,
    vendorName: session.vendorName,
    vendorStatus: 'existing',
    subtotal: session.totalCost,
    taxAmount: 0,
    totalAmount: session.totalCost,
    status: 'confirmed',
    notes: session.notes,
    receivingLocation: session.receivingLocation,
    receivedByUserId: currentUser.id,
    receivedByUserName: currentUser.name,
    extractedConfidence: 100,
    lineItems: session.lines.map(l => ({
      id: l.id,
      description: l.productName,
      upc: l.barcode,
      sku: l.sku,
      quantity: l.receivedUnits,
      unitSize: l.size,
      packSize: l.packSize,
      totalInventoryUnits: l.receivedUnits,
      unitCost: l.unitCost,
      extendedCost: l.extendedCost,
      lineTotal: l.extendedCost,
      matchedProductId: l.productId,
      matchedProductName: l.productName,
      matchedProductSku: l.sku,
      matchType: 'upc',
      confidence: 100,
      status: 'matched',
      currentCost: l.previousCost,
      costDiff: l.costDiff,
      currentPrice: l.currentPrice,
      oldMargin: l.oldMargin,
      newMargin: l.newMargin,
      updateMasterCost: l.updateCost || approveAllCosts,
    })),
    createdAt: session.createdAt,
    updatedAt: now,
  };

  db.invoices.unshift(finalizedInvoice);

  session.status = 'completed';
  session.completedAt = now;
  session.updatedAt = now;

  db.addAudit(
    currentUser.id,
    currentUser.name,
    currentUser.role,
    'BARCODE_RECEIVE_CONFIRM',
    'inventory',
    session.id,
    `Completed bulk barcode receiving (${session.receivingNumber}) for Invoice #${session.invoiceNumber} - ${session.totalUnitsReceived} units ($${session.totalCost.toFixed(2)}) updated into inventory`
  );

  res.json({
    success: true,
    receivingNumber: session.receivingNumber,
    session,
    receivingTransactions,
    updatedProductCount: receivingTransactions.length,
    totalUnitsReceived: session.totalUnitsReceived,
  });
});

barcodeReceivingRouter.post('/invoices/barcode-sessions/:id/receive', receiveSession);
barcodeReceivingRouter.post('/barcode-sessions/:id/receive', receiveSession);
