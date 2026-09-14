import express, { Request, Response, NextFunction } from 'express';
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

apiRouter.use(shiftAndCheckRouter);
apiRouter.use(barcodeReceivingRouter);
apiRouter.use(onlineStoreRouter);
apiRouter.use(inventoryAiRouter);

// Registers and Terminals
apiRouter.get('/registers', (req: Request, res: Response) => {
  const registers = [
    {
      id: 'reg-1',
      name: 'Terminal #01 (Front Register)',
      location: 'Main Checkout Counter',
      status: 'active',
      currentCashier: 'Elena Rostova',
      activeShiftId: db.shifts.find(s => s.status === 'open' && s.registerId === 'reg-1')?.id || null,
    },
    {
      id: 'reg-2',
      name: 'Terminal #02 (Express / Drive-Thru)',
      location: 'Secondary Express Counter',
      status: 'active',
      currentCashier: null,
      activeShiftId: db.shifts.find(s => s.status === 'open' && s.registerId === 'reg-2')?.id || null,
    },
  ];
  res.json({ registers });
});

// Helper to authenticate request role from headers or payload (simple token/session simulation)
function getAuthUser(req: Request): User {
  const userId = (req.headers['x-user-id'] as string) || 'usr-3'; // Default to Elena (Cashier) or Sarah (Admin)
  const user = db.users.find(u => u.id === userId && u.active);
  return user || db.users[0]; // fallback to admin
}

// Centralized error handler helper
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ----------------------------------------------------
// AU-01 & BE-01: Authentication & User Management
// ----------------------------------------------------
apiRouter.post('/auth/login', asyncHandler(async (req: Request, res: Response) => {
  const { email, password, pin } = req.body;

  let user: User | undefined;
  if (pin) {
    user = db.users.find(u => u.pin === pin && u.active);
  } else if (email) {
    // Simple verification (accepts standard demo passwords or pin)
    user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.active);
  }

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials or account is deactivated.' });
  }

  const token = `token-${user.id}-${Date.now()}`;
  db.addAudit(user.id, user.name, user.role, 'LOGIN', 'user', user.id, `User logged in via ${pin ? 'PIN' : 'Email/Password'}`);

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      pin: user.pin,
      active: user.active,
    },
  });
}));

apiRouter.get('/auth/me', asyncHandler(async (req: Request, res: Response) => {
  const user = getAuthUser(req);
  res.json({ user });
}));

apiRouter.get('/users', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  // Manager and Admin can view users; Cashier blocked
  if (currentUser.role !== 'Admin' && currentUser.role !== 'Manager') {
    return res.status(403).json({ error: 'Access denied: Requires Manager or Admin role' });
  }
  res.json(db.users);
}));

apiRouter.post('/users', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  if (currentUser.role !== 'Admin') {
    return res.status(403).json({ error: 'Only Admins can create new users' });
  }

  const { name, email, role, pin } = req.body;
  if (!name || !email || !role || !pin) {
    return res.status(400).json({ error: 'Name, email, role, and 4-digit PIN are required' });
  }

  if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: 'A user with this email already exists' });
  }

  const newUser: User = {
    id: `usr-${Date.now()}`,
    name,
    email,
    role,
    pin,
    active: true,
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  db.addAudit(currentUser.id, currentUser.name, currentUser.role, 'USER_CREATE', 'user', newUser.id, `Created ${role} account for ${name}`, null, newUser);

  res.status(201).json(newUser);
}));

apiRouter.put('/users/:id', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  if (currentUser.role !== 'Admin') {
    return res.status(403).json({ error: 'Only Admins can edit users' });
  }

  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const before = { ...user };
  const { name, email, role, pin, active } = req.body;
  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email;
  if (role !== undefined) user.role = role;
  if (pin !== undefined) user.pin = pin;
  if (active !== undefined) user.active = active;

  db.addAudit(currentUser.id, currentUser.name, currentUser.role, 'USER_UPDATE', 'user', user.id, `Updated user ${user.name}`, before, user);
  res.json(user);
}));

apiRouter.patch('/users/:id/status', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  if (currentUser.role !== 'Admin') {
    return res.status(403).json({ error: 'Only Admins can modify user status' });
  }

  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.active = !user.active;
  db.addAudit(currentUser.id, currentUser.name, currentUser.role, user.active ? 'USER_REACTIVATE' : 'USER_DEACTIVATE', 'user', user.id, `${user.active ? 'Reactivated' : 'Deactivated'} account for ${user.name}`);
  res.json(user);
}));

// ----------------------------------------------------
// Categories & Brands API (AP-CT-01 to AP-CT-05)
// ----------------------------------------------------
apiRouter.get('/categories', (req: Request, res: Response) => {
  const { all } = req.query;
  if (all === 'true') {
    res.json(db.categories.sort((a, b) => a.order - b.order));
  } else {
    res.json(db.categories.filter(c => c.active).sort((a, b) => a.order - b.order));
  }
});

apiRouter.post('/categories', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  if (currentUser.role !== 'Admin') {
    return res.status(403).json({ error: 'Only Admins can create categories' });
  }

  const { name, slug, icon, parentId } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name is required' });

  const parent = parentId ? db.categories.find(c => c.id === parentId) : undefined;
  const newCategory: any = {
    id: `cat-${Date.now()}`,
    name,
    slug: slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    icon: icon || 'Tag',
    order: db.categories.length + 1,
    active: true,
    parentId: parentId || undefined,
    parentName: parent?.name || undefined,
  };
  db.categories.push(newCategory);
  db.addAudit(currentUser.id, currentUser.name, currentUser.role, 'CATEGORY_CREATE', 'category' as any, newCategory.id, `Created category "${newCategory.name}"`);
  res.status(201).json(newCategory);
}));

apiRouter.put('/categories/:id', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  if (currentUser.role !== 'Admin') {
    return res.status(403).json({ error: 'Only Admins can update categories' });
  }

  const cat = db.categories.find(c => c.id === req.params.id);
  if (!cat) return res.status(404).json({ error: 'Category not found' });

  const { name, slug, active, order, parentId } = req.body;
  if (name !== undefined) cat.name = name;
  if (slug !== undefined) cat.slug = slug;
  if (active !== undefined) cat.active = Boolean(active);
  if (order !== undefined) cat.order = Number(order);
  if (parentId !== undefined) {
    cat.parentId = parentId || undefined;
    const parent = parentId ? db.categories.find(c => c.id === parentId) : undefined;
    cat.parentName = parent?.name || undefined;
  }

  db.addAudit(currentUser.id, currentUser.name, currentUser.role, 'CATEGORY_UPDATE', 'category' as any, cat.id, `Updated category "${cat.name}"`);
  res.json(cat);
}));

apiRouter.delete('/categories/:id', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  if (currentUser.role !== 'Admin') {
    return res.status(403).json({ error: 'Only Admins can delete categories' });
  }

  const cat = db.categories.find(c => c.id === req.params.id);
  if (!cat) return res.status(404).json({ error: 'Category not found' });

  // Soft deactivation
  cat.active = false;
  db.addAudit(currentUser.id, currentUser.name, currentUser.role, 'CATEGORY_DEACTIVATE', 'category' as any, cat.id, `Deactivated category "${cat.name}"`);
  res.json({ message: 'Category deactivated successfully', category: cat });
}));

apiRouter.patch('/categories/reorder', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  if (currentUser.role !== 'Admin') {
    return res.status(403).json({ error: 'Only Admins can reorder categories' });
  }

  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) {
    return res.status(400).json({ error: 'orderedIds array is required' });
  }

  orderedIds.forEach((id: string, index: number) => {
    const cat = db.categories.find(c => c.id === id);
    if (cat) cat.order = index + 1;
  });

  db.addAudit(currentUser.id, currentUser.name, currentUser.role, 'CATEGORY_REORDER', 'category' as any, 'bulk', 'Updated category display order');
  res.json(db.categories.sort((a, b) => a.order - b.order));
}));

// Brands API (AP-CT-05)
apiRouter.get('/brands', (req: Request, res: Response) => {
  res.json(db.brands.filter(b => b.active));
});

apiRouter.post('/brands', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  if (currentUser.role !== 'Admin') {
    return res.status(403).json({ error: 'Only Admins can add brands' });
  }

  const { name, country, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Brand name is required' });

  if (db.brands.some(b => b.name.toLowerCase() === name.toLowerCase())) {
    return res.status(400).json({ error: `Brand "${name}" already exists` });
  }

  const newBrand: any = {
    id: `br-${Date.now()}`,
    name,
    country: country || 'United States',
    description: description || '',
    active: true,
  };
  db.brands.push(newBrand);
  db.addAudit(currentUser.id, currentUser.name, currentUser.role, 'BRAND_CREATE', 'product', newBrand.id, `Created brand "${newBrand.name}"`);
  res.status(201).json(newBrand);
}));

apiRouter.put('/brands/:id', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  if (currentUser.role !== 'Admin') {
    return res.status(403).json({ error: 'Only Admins can update brands' });
  }

  const brand = db.brands.find(b => b.id === req.params.id);
  if (!brand) return res.status(404).json({ error: 'Brand not found' });

  const { name, country, description, active } = req.body;
  if (name !== undefined) brand.name = name;
  if (country !== undefined) brand.country = country;
  if (description !== undefined) brand.description = description;
  if (active !== undefined) brand.active = Boolean(active);

  db.addAudit(currentUser.id, currentUser.name, currentUser.role, 'BRAND_UPDATE', 'product', brand.id, `Updated brand "${brand.name}"`);
  res.json(brand);
}));

apiRouter.delete('/brands/:id', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  if (currentUser.role !== 'Admin') {
    return res.status(403).json({ error: 'Only Admins can delete brands' });
  }

  const brand = db.brands.find(b => b.id === req.params.id);
  if (!brand) return res.status(404).json({ error: 'Brand not found' });

  brand.active = false;
  db.addAudit(currentUser.id, currentUser.name, currentUser.role, 'BRAND_DEACTIVATE', 'product', brand.id, `Deactivated brand "${brand.name}"`);
  res.json({ message: 'Brand deactivated', brand });
}));

// ----------------------------------------------------
// PR-01 to PR-07 & BE-02 to BE-04: Products & Catalog
// ----------------------------------------------------
apiRouter.get('/products', (req: Request, res: Response) => {
  const { categoryId, brandId, search, barcode, activeOnly } = req.query;

  let results = [...db.products];

  if (activeOnly !== 'false') {
    results = results.filter(p => p.active);
  }

  if (categoryId && categoryId !== 'all') {
    results = results.filter(p => p.categoryId === categoryId);
  }

  if (brandId && brandId !== 'all') {
    results = results.filter(p => p.brandId === brandId);
  }

  if (barcode) {
    const code = (barcode as string).trim().toLowerCase();
    results = results.filter(p => {
      if (p.barcode.toLowerCase() === code || p.sku.toLowerCase() === code) return true;
      if (p.barcodes && p.barcodes.some(b => b.barcode.toLowerCase() === code)) return true;
      return false;
    });
  } else if (search) {
    const q = (search as string).toLowerCase().trim();
    results = results.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.barcode.toLowerCase().includes(q) ||
      (p.barcodes && p.barcodes.some(b => b.barcode.toLowerCase().includes(q))) ||
      (p.categoryName && p.categoryName.toLowerCase().includes(q)) ||
      (p.brandName && p.brandName.toLowerCase().includes(q)) ||
      (p.vendor && p.vendor.toLowerCase().includes(q)) ||
      (p.aisle && p.aisle.toLowerCase().includes(q))
    );
  }

  res.json(results);
});

apiRouter.get('/products/:id', (req: Request, res: Response) => {
  const product = db.products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

apiRouter.post('/products', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  if (currentUser.role !== 'Admin' && currentUser.role !== 'Manager' && currentUser.role !== 'Cashier') {
    return res.status(403).json({ error: 'Unauthorized to add products' });
  }

  const {
    name,
    sku,
    barcode,
    barcodes,
    categoryId,
    brandId,
    subcategory,
    price,
    cost,
    promotionalPrice,
    taxRate,
    taxCategory,
    size,
    unitType,
    packSize,
    stockQuantity,
    lowStockThreshold,
    reorderLevel,
    reorderQuantity,
    imageUrl,
    description,
    vendor,
    vendorSku,
    inventoryTracking,
    channelAvailability,
    sellOnline,
    sellInStore,
    ageRestriction,
    aisle,
    bay,
    shelf,
    position,
  } = req.body;

  if (!name || !sku || !barcode || !price) {
    return res.status(400).json({ error: 'Name, SKU, Barcode, and Price are required fields' });
  }

  // Duplicate checks
  if (db.products.some(p => p.sku.toLowerCase() === sku.toLowerCase())) {
    return res.status(400).json({ error: `Product SKU "${sku}" already exists` });
  }
  if (db.products.some(p => p.barcode === barcode)) {
    return res.status(400).json({ error: `Product Barcode/UPC "${barcode}" already exists` });
  }

  const category = db.categories.find(c => c.id === categoryId);
  const brand = brandId ? db.brands.find(b => b.id === brandId) : undefined;
  const now = new Date().toISOString();

  const newProduct: Product = {
    id: `prod-${Date.now()}`,
    name,
    sku,
    barcode,
    barcodes: Array.isArray(barcodes) ? barcodes : [],
    categoryId: categoryId || 'cat-1',
    categoryName: category?.name || 'General',
    subcategory: subcategory || undefined,
    brandId: brandId || undefined,
    brandName: brand?.name || undefined,
    brand: brand?.name || undefined,
    price: Number(price),
    cost: Number(cost || 0),
    promotionalPrice: promotionalPrice !== undefined ? Number(promotionalPrice) : undefined,
    taxRate: taxRate !== undefined ? Number(taxRate) : db.settings.defaultTaxRate,
    taxCategory: taxCategory || 'Standard Liquor',
    size: size || 'Standard',
    unitType: unitType || 'Bottle',
    packSize: packSize !== undefined ? Number(packSize) : 1,
    stockQuantity: Number(stockQuantity || 0),
    lowStockThreshold: Number(lowStockThreshold || 5),
    reorderLevel: reorderLevel !== undefined ? Number(reorderLevel) : 5,
    reorderQuantity: reorderQuantity !== undefined ? Number(reorderQuantity) : 12,
    imageUrl: imageUrl || 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=500&auto=format&fit=crop&q=60',
    description: description || '',
    vendor: vendor || undefined,
    vendorSku: vendorSku || undefined,
    inventoryTracking: inventoryTracking !== false,
    channelAvailability: channelAvailability || {
      pos: sellInStore !== false,
      website: sellOnline !== false,
      mobile: true,
      delivery: true,
    },
    sellOnline: sellOnline !== false,
    sellInStore: sellInStore !== false,
    ageRestriction: ageRestriction !== undefined ? Number(ageRestriction) : 21,
    aisle: aisle || undefined,
    bay: bay || undefined,
    shelf: shelf || undefined,
    position: position || undefined,
    location: {
      aisle: aisle || undefined,
      bay: bay || undefined,
      shelf: shelf || undefined,
      position: position || undefined,
    },
    active: true,
    createdAt: now,
    updatedAt: now,
  };

  db.products.unshift(newProduct);

  // US-004: Record initial ledger entry if stock > 0
  if (newProduct.stockQuantity > 0) {
    db.recordLedgerMovement(
      newProduct.id,
      'backoffice',
      currentUser.id,
      currentUser.name,
      newProduct.stockQuantity,
      'vendor_receive',
      'INITIAL-CATALOG',
      `Initial stock upon catalog creation: ${newProduct.name}`
    );
  }

  db.addAudit(currentUser.id, currentUser.name, currentUser.role, 'PRODUCT_CREATE', 'product', newProduct.id, `Created product "${newProduct.name}" (${newProduct.sku})`, null, newProduct);

  res.status(201).json(newProduct);
}));

apiRouter.put('/products/:id', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  if (currentUser.role !== 'Admin' && currentUser.role !== 'Manager') {
    return res.status(403).json({ error: 'Only Admins and Managers can update products' });
  }

  const product = db.products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  // US-001: Product ID is system-generated and immutable
  if (req.body.id && req.body.id !== product.id) {
    return res.status(400).json({ error: 'Product ID is immutable and cannot be changed' });
  }

  const before = { ...product };
  const data = req.body;

  // Check duplicate SKU/Barcode if changed
  if (data.sku && data.sku !== product.sku) {
    if (db.products.some(p => p.id !== product.id && p.sku.toLowerCase() === data.sku.toLowerCase())) {
      return res.status(400).json({ error: `Product SKU "${data.sku}" already in use` });
    }
    product.sku = data.sku;
  }

  if (data.barcode && data.barcode !== product.barcode) {
    if (db.products.some(p => p.id !== product.id && p.barcode === data.barcode)) {
      return res.status(400).json({ error: `Product Barcode "${data.barcode}" already in use` });
    }
    product.barcode = data.barcode;
  }

  if (data.name !== undefined) product.name = data.name;
  if (data.barcodes !== undefined) product.barcodes = data.barcodes;
  if (data.categoryId !== undefined) {
    product.categoryId = data.categoryId;
    const cat = db.categories.find(c => c.id === data.categoryId);
    product.categoryName = cat?.name || product.categoryName;
  }
  if (data.brandId !== undefined) {
    product.brandId = data.brandId || undefined;
    const brand = data.brandId ? db.brands.find(b => b.id === data.brandId) : undefined;
    product.brandName = brand?.name || undefined;
    product.brand = brand?.name || undefined;
  }
  if (data.subcategory !== undefined) product.subcategory = data.subcategory;
  if (data.price !== undefined) product.price = Number(data.price);
  if (data.cost !== undefined) product.cost = Number(data.cost);
  if (data.promotionalPrice !== undefined) product.promotionalPrice = data.promotionalPrice !== null ? Number(data.promotionalPrice) : undefined;
  if (data.taxRate !== undefined) product.taxRate = Number(data.taxRate);
  if (data.taxCategory !== undefined) product.taxCategory = data.taxCategory;
  if (data.size !== undefined) product.size = data.size;
  if (data.unitType !== undefined) product.unitType = data.unitType;
  if (data.packSize !== undefined) product.packSize = Number(data.packSize);
  if (data.lowStockThreshold !== undefined) product.lowStockThreshold = Number(data.lowStockThreshold);
  if (data.reorderLevel !== undefined) product.reorderLevel = Number(data.reorderLevel);
  if (data.reorderQuantity !== undefined) product.reorderQuantity = Number(data.reorderQuantity);
  if (data.imageUrl !== undefined) product.imageUrl = data.imageUrl;
  if (data.description !== undefined) product.description = data.description;
  if (data.vendor !== undefined) product.vendor = data.vendor;
  if (data.vendorSku !== undefined) product.vendorSku = data.vendorSku;
  if (data.inventoryTracking !== undefined) product.inventoryTracking = Boolean(data.inventoryTracking);
  if (data.channelAvailability !== undefined) product.channelAvailability = data.channelAvailability;
  if (data.sellOnline !== undefined) product.sellOnline = Boolean(data.sellOnline);
  if (data.sellInStore !== undefined) product.sellInStore = Boolean(data.sellInStore);
  if (data.ageRestriction !== undefined) product.ageRestriction = Number(data.ageRestriction);
  if (data.aisle !== undefined) product.aisle = data.aisle;
  if (data.bay !== undefined) product.bay = data.bay;
  if (data.shelf !== undefined) product.shelf = data.shelf;
  if (data.position !== undefined) product.position = data.position;
  if (data.active !== undefined) product.active = Boolean(data.active);

  // If stock quantity was modified via edit, record ledger adjustment (US-004: Never silently modify)
  if (data.stockQuantity !== undefined && Number(data.stockQuantity) !== product.stockQuantity) {
    const newQty = Number(data.stockQuantity);
    const delta = newQty - product.stockQuantity;
    db.recordLedgerMovement(
      product.id,
      'backoffice',
      currentUser.id,
      currentUser.name,
      delta,
      'manual_adjustment',
      'PRODUCT-EDIT',
      `Manual stock correction on product edit from ${product.stockQuantity} to ${newQty}`
    );
  }

  product.updatedAt = new Date().toISOString();

  db.addAudit(currentUser.id, currentUser.name, currentUser.role, 'PRODUCT_UPDATE', 'product', product.id, `Updated product "${product.name}"`, before, product);
  res.json(product);
}));

apiRouter.delete('/products/:id', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  if (currentUser.role !== 'Admin') {
    return res.status(403).json({ error: 'Only Admins can deactivate products' });
  }

  const product = db.products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  // Soft deactivation preserving order and reporting history
  product.active = false;
  product.updatedAt = new Date().toISOString();

  db.addAudit(currentUser.id, currentUser.name, currentUser.role, 'PRODUCT_DEACTIVATE', 'product', product.id, `Deactivated product "${product.name}"`);
  res.json({ message: 'Product deactivated successfully', product });
}));

// PR-07: CSV Bulk Import
apiRouter.post('/products/import', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  if (currentUser.role !== 'Admin') {
    return res.status(403).json({ error: 'Only Admins can import products' });
  }

  const { csvData } = req.body;
  if (!csvData || typeof csvData !== 'string') {
    return res.status(400).json({ error: 'Valid CSV content string is required' });
  }

  const lines = csvData.trim().split('\n');
  if (lines.length < 2) {
    return res.status(400).json({ error: 'CSV file must have a header line and at least one data row' });
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const imported: Product[] = [];
  const errors: { row: number; data: string; reason: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    const values = rawLine.split(',').map(v => v.trim());
    const rowObj: any = {};
    headers.forEach((h, index) => {
      rowObj[h] = values[index] || '';
    });

    const name = rowObj['name'] || rowObj['product_name'] || values[0];
    const sku = rowObj['sku'] || values[1];
    const barcode = rowObj['barcode'] || rowObj['upc'] || values[2];
    const price = parseFloat(rowObj['price'] || values[3]);
    const cost = parseFloat(rowObj['cost'] || values[4] || '0');
    const categoryName = rowObj['category'] || values[5] || 'General';
    const size = rowObj['size'] || values[6] || 'Standard';
    const stock = parseInt(rowObj['stock'] || rowObj['quantity'] || values[7] || '0', 10);

    if (!name || !sku || !barcode || isNaN(price)) {
      errors.push({ row: i + 1, data: rawLine, reason: 'Missing required field (Name, SKU, Barcode, or Price)' });
      continue;
    }

    if (db.products.some(p => p.sku.toLowerCase() === sku.toLowerCase())) {
      errors.push({ row: i + 1, data: rawLine, reason: `Duplicate SKU: "${sku}" already exists` });
      continue;
    }

    if (db.products.some(p => p.barcode === barcode)) {
      errors.push({ row: i + 1, data: rawLine, reason: `Duplicate Barcode: "${barcode}" already exists` });
      continue;
    }

    let category = db.categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
    if (!category) {
      category = {
        id: `cat-${Date.now()}-${i}`,
        name: categoryName,
        slug: categoryName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        order: db.categories.length + 1,
        active: true,
      };
      db.categories.push(category);
    }

    const now = new Date().toISOString();
    const newProduct: Product = {
      id: `prod-${Date.now()}-${i}`,
      name,
      sku,
      barcode,
      categoryId: category.id,
      categoryName: category.name,
      price,
      cost: isNaN(cost) ? 0 : cost,
      taxRate: db.settings.defaultTaxRate,
      size,
      stockQuantity: isNaN(stock) ? 0 : stock,
      lowStockThreshold: 5,
      imageUrl: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=500&auto=format&fit=crop&q=60',
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    db.products.unshift(newProduct);
    imported.push(newProduct);
  }

  db.addAudit(currentUser.id, currentUser.name, currentUser.role, 'PRODUCT_IMPORT', 'product', 'bulk', `Bulk imported ${imported.length} products via CSV (${errors.length} failed)`);

  res.json({
    successCount: imported.length,
    failedCount: errors.length,
    imported,
    errors,
  });
}));

// ----------------------------------------------------
// CA-01 to CA-11 & BE-06, BE-08: Cart, Checkout & Orders
// ----------------------------------------------------
apiRouter.post('/orders', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  const { items, customerId, discountTotal, payment, pointsRedeemed, pointsDiscountAmount } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order must have at least one line item' });
  }

  if (!payment || !payment.method) {
    return res.status(400).json({ error: 'Payment information is required' });
  }

  // Customer attachment & loyalty handling setup
  let customer = customerId ? db.customers.find(c => c.id === customerId) : undefined;
  let validatedPointsRedeemed = 0;
  let validatedPointsDiscount = 0;

  if (pointsRedeemed && Number(pointsRedeemed) > 0) {
    if (!customer) {
      return res.status(400).json({ error: 'A customer must be attached to redeem loyalty points' });
    }
    const requestedPts = Math.floor(Number(pointsRedeemed));
    if (requestedPts > customer.loyaltyPoints) {
      return res.status(400).json({
        error: `Customer only has ${customer.loyaltyPoints} points, cannot redeem ${requestedPts} points`,
      });
    }

    const minPoints = db.settings.loyaltyMinPointsToRedeem ?? 50;
    if (requestedPts < minPoints) {
      return res.status(400).json({
        error: `Minimum ${minPoints} loyalty points required to redeem (requested: ${requestedPts})`,
      });
    }

    const redemptionRate = db.settings.loyaltyPointsPerDollarDiscount || 20; // 20 pts = $1
    validatedPointsRedeemed = requestedPts;
    validatedPointsDiscount = pointsDiscountAmount !== undefined
      ? Number(pointsDiscountAmount)
      : Math.round((requestedPts / redemptionRate) * 100) / 100;
  }

  // BA-01 & BA-03: Centralized Server Validation & Atomic Database Transactions
  let calculatedSubtotal = 0;
  let calculatedTax = 0;
  const processedItems: CartItem[] = [];

  for (const item of items) {
    const product = db.products.find(p => p.id === item.product.id);
    if (!product) {
      return res.status(400).json({ error: `Product ${item.product.name} no longer exists` });
    }
    if (!product.active) {
      return res.status(400).json({ error: `Product ${product.name} is deactivated and cannot be sold` });
    }
    if (product.stockQuantity < item.quantity) {
      return res.status(400).json({
        error: `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}, Requested: ${item.quantity}`,
      });
    }

    const itemPrice = product.price;
    const itemDiscount = Number(item.discountAmount || 0);
    const lineSubtotal = (itemPrice * item.quantity) - itemDiscount;
    const itemTax = lineSubtotal * (product.taxRate || db.settings.defaultTaxRate);

    calculatedSubtotal += itemPrice * item.quantity;
    calculatedTax += itemTax;

    processedItems.push({
      product: { ...product },
      quantity: item.quantity,
      unitPrice: itemPrice,
      discountAmount: itemDiscount,
      discountReason: item.discountReason,
      taxAmount: Math.round(itemTax * 100) / 100,
      lineTotal: Math.round((lineSubtotal + itemTax) * 100) / 100,
    });
  }

  // The base order discount includes promo/manual discounts.
  // If pointsDiscount is separate, we subtract it as well
  const baseOrderDiscount = Number(discountTotal || 0);
  const totalOrderDiscount = baseOrderDiscount + (discountTotal?.toString().includes(String(validatedPointsDiscount)) ? 0 : validatedPointsDiscount);
  const grandTotal = Math.max(0, Math.round((calculatedSubtotal - totalOrderDiscount + calculatedTax) * 100) / 100);

  // CA-07: Cash payment verification
  if (payment.method === 'cash') {
    const tendered = Number(payment.cashTendered || 0);
    if (tendered < grandTotal) {
      return res.status(400).json({
        error: `Cash received ($${tendered.toFixed(2)}) is less than grand total ($${grandTotal.toFixed(2)})`,
      });
    }
    payment.changeDue = Math.round((tendered - grandTotal) * 100) / 100;
  }

  const now = new Date().toISOString();
  const orderNumber = `ORD-${1000 + db.orders.length + 1}`;

  // Process Loyalty Points (Redeem & Earn)
  let pointsEarnedThisOrder = 0;

  if (customer) {
    customer.orderCount += 1;
    customer.totalSpent = Math.round((customer.totalSpent + grandTotal) * 100) / 100;

    // 1. Deduct redeemed points if any
    if (validatedPointsRedeemed > 0) {
      customer.loyaltyPoints = Math.max(0, customer.loyaltyPoints - validatedPointsRedeemed);
      db.loyaltyTransactions.unshift({
        id: `ltxn-${Date.now()}-red`,
        customerId: customer.id,
        type: 'redeemed',
        points: -validatedPointsRedeemed,
        orderId: `ord-${Date.now()}`,
        orderNumber,
        reason: `Redeemed ${validatedPointsRedeemed} pts for $${validatedPointsDiscount.toFixed(2)} discount on Order #${orderNumber}`,
        balanceAfter: customer.loyaltyPoints,
        createdAt: now,
      });
    }

    // 2. Earn points based on configurable points-per-dollar rate
    const isProgramEnabled = db.settings.loyaltyProgramEnabled !== false;
    if (isProgramEnabled && grandTotal > 0) {
      const earnRate = db.settings.loyaltyPointsPerDollar !== undefined ? Number(db.settings.loyaltyPointsPerDollar) : 1;
      pointsEarnedThisOrder = Math.floor(grandTotal * earnRate);
      if (pointsEarnedThisOrder > 0) {
        customer.loyaltyPoints += pointsEarnedThisOrder;
        db.loyaltyTransactions.unshift({
          id: `ltxn-${Date.now()}-earn`,
          customerId: customer.id,
          type: 'earned',
          points: pointsEarnedThisOrder,
          orderId: `ord-${Date.now()}`,
          orderNumber,
          reason: `Earned ${pointsEarnedThisOrder} pts on Order #${orderNumber} ($${grandTotal.toFixed(2)} @ ${earnRate} pt/$1)`,
          balanceAfter: customer.loyaltyPoints,
          createdAt: now,
        });
      }
    }

    // Update loyalty tier based on balance
    if (customer.loyaltyPoints >= 1000) customer.loyaltyTier = 'Platinum';
    else if (customer.loyaltyPoints >= 500) customer.loyaltyTier = 'Gold';
    else if (customer.loyaltyPoints >= 250) customer.loyaltyTier = 'Silver';
    else customer.loyaltyTier = 'Bronze';
  }

  // IN-02: Atomically reduce inventory
  for (const item of processedItems) {
    const product = db.products.find(p => p.id === item.product.id)!;
    const oldQty = product.stockQuantity;
    product.stockQuantity -= item.quantity;

    db.inventoryAdjustments.unshift({
      id: `adj-${Date.now()}-${item.product.id}`,
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      oldQuantity: oldQty,
      newQuantity: product.stockQuantity,
      changeAmount: -item.quantity,
      type: 'sale',
      reason: `Sold on Order #${orderNumber}`,
      userId: currentUser.id,
      userName: currentUser.name,
      createdAt: now,
    });

    // US-004: Centralized Immutable Inventory Ledger
    db.recordLedgerMovement(
      product.id,
      'pos',
      currentUser.id,
      currentUser.name,
      -item.quantity,
      'pos_sale',
      orderNumber,
      `POS checkout sale on register`
    );
  }

  const newOrder: Order = {
    id: `ord-${Date.now()}`,
    orderNumber,
    cashierId: currentUser.id,
    cashierName: currentUser.name,
    customerId: customer?.id,
    customerName: customer?.name,
    customerPhone: customer?.phone,
    items: processedItems,
    subtotal: Math.round(calculatedSubtotal * 100) / 100,
    discountTotal: totalOrderDiscount,
    taxTotal: Math.round(calculatedTax * 100) / 100,
    grandTotal,
    payment: {
      method: payment.method,
      amount: grandTotal,
      cashTendered: payment.cashTendered,
      changeDue: payment.changeDue,
      cardLast4: payment.cardLast4 || '8392',
      cardBrand: payment.cardBrand || (payment.method === 'contactless' ? 'Apple Pay' : 'Visa'),
      authCode: payment.authCode || `APX-${Math.floor(10000 + Math.random() * 90000)}`,
      fallbackMethod: payment.fallbackMethod,
      processorTxId: payment.processorTxId,
      fallbackReason: payment.fallbackReason,
      paymentSessionId: payment.paymentSessionId,
      splitDetails: payment.splitDetails,
    },
    status: 'completed',
    pointsEarned: pointsEarnedThisOrder,
    pointsRedeemed: validatedPointsRedeemed,
    pointsDiscountAmount: validatedPointsDiscount,
    customerLoyaltyBalance: customer?.loyaltyPoints,
    createdAt: now,
    updatedAt: now,
  };

  db.orders.unshift(newOrder);
  db.addAudit(
    currentUser.id,
    currentUser.name,
    currentUser.role,
    'ORDER_CREATE',
    'order',
    newOrder.id,
    `Completed Order ${newOrder.orderNumber} ($${grandTotal.toFixed(2)}) via ${payment.method}${
      pointsEarnedThisOrder > 0 ? ` (+${pointsEarnedThisOrder} pts earned)` : ''
    }${validatedPointsRedeemed > 0 ? ` (-${validatedPointsRedeemed} pts redeemed for -$${validatedPointsDiscount.toFixed(2)})` : ''}`
  );

  res.status(201).json(newOrder);
}));

// BE-07: Order History & Search
apiRouter.get('/orders', (req: Request, res: Response) => {
  const { search, cashierId, status, paymentMethod, startDate, endDate } = req.query;

  let results = [...db.orders];

  if (search) {
    const q = (search as string).toLowerCase().trim();
    results = results.filter(o =>
      o.orderNumber.toLowerCase().includes(q) ||
      (o.customerName && o.customerName.toLowerCase().includes(q)) ||
      (o.customerPhone && o.customerPhone.includes(q)) ||
      o.cashierName.toLowerCase().includes(q)
    );
  }

  if (cashierId && cashierId !== 'all') {
    results = results.filter(o => o.cashierId === cashierId);
  }

  if (status && status !== 'all') {
    results = results.filter(o => o.status === status);
  }

  if (paymentMethod && paymentMethod !== 'all') {
    results = results.filter(o => o.payment.method === paymentMethod);
  }

  if (startDate) {
    results = results.filter(o => o.createdAt >= (startDate as string));
  }

  if (endDate) {
    results = results.filter(o => o.createdAt <= (endDate as string));
  }

  res.json(results);
});

apiRouter.get('/orders/:id', (req: Request, res: Response) => {
  const order = db.orders.find(o => o.id === req.params.id || o.orderNumber === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

// OR-04: Void Order
apiRouter.post('/orders/:id/void', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  if (currentUser.role !== 'Admin' && currentUser.role !== 'Manager') {
    return res.status(403).json({ error: 'Only Managers and Admins can void transactions' });
  }

  const { reason } = req.body;
  if (!reason) {
    return res.status(400).json({ error: 'Reason is required to void a transaction' });
  }

  const order = db.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status === 'voided') {
    return res.status(400).json({ error: 'Order has already been voided' });
  }

  // Restore inventory
  for (const item of order.items) {
    const product = db.products.find(p => p.id === item.product.id);
    if (product) {
      const oldQty = product.stockQuantity;
      product.stockQuantity += item.quantity;

      db.inventoryAdjustments.unshift({
        id: `adj-${Date.now()}-${product.id}`,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        oldQuantity: oldQty,
        newQuantity: product.stockQuantity,
        changeAmount: item.quantity,
        type: 'void_restore',
        reason: `Void Order ${order.orderNumber}: ${reason}`,
        userId: currentUser.id,
        userName: currentUser.name,
        createdAt: new Date().toISOString(),
      });
    }
  }

  // Restore/reverse customer loyalty points
  if (order.customerId) {
    const customer = db.customers.find(c => c.id === order.customerId);
    if (customer) {
      const now = new Date().toISOString();
      if (order.pointsEarned && order.pointsEarned > 0) {
        customer.loyaltyPoints = Math.max(0, customer.loyaltyPoints - order.pointsEarned);
        db.loyaltyTransactions.unshift({
          id: `ltxn-${Date.now()}-void-rev`,
          customerId: customer.id,
          type: 'refund_reversal',
          points: -order.pointsEarned,
          orderId: order.id,
          orderNumber: order.orderNumber,
          reason: `Points reversed due to Voided Order #${order.orderNumber}`,
          balanceAfter: customer.loyaltyPoints,
          createdAt: now,
        });
      }
      if (order.pointsRedeemed && order.pointsRedeemed > 0) {
        customer.loyaltyPoints += order.pointsRedeemed;
        db.loyaltyTransactions.unshift({
          id: `ltxn-${Date.now()}-void-rest`,
          customerId: customer.id,
          type: 'adjustment',
          points: order.pointsRedeemed,
          orderId: order.id,
          orderNumber: order.orderNumber,
          reason: `Restored ${order.pointsRedeemed} redeemed points from Voided Order #${order.orderNumber}`,
          balanceAfter: customer.loyaltyPoints,
          createdAt: now,
        });
      }
    }
  }

  order.status = 'voided';
  order.voidReason = reason;
  order.voidedBy = currentUser.name;
  order.updatedAt = new Date().toISOString();

  db.addAudit(currentUser.id, currentUser.name, currentUser.role, 'ORDER_VOID', 'order', order.id, `Voided Order ${order.orderNumber}. Reason: ${reason}`);

  res.json({ message: 'Order voided successfully', order });
}));

// OR-05: Refund Order
apiRouter.post('/orders/:id/refund', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  if (currentUser.role !== 'Admin' && currentUser.role !== 'Manager') {
    return res.status(403).json({ error: 'Only Managers and Admins can process refunds' });
  }

  const { reason, amount } = req.body;
  if (!reason) {
    return res.status(400).json({ error: 'Refund reason is required' });
  }

  const order = db.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status === 'voided') {
    return res.status(400).json({ error: 'Cannot refund a voided order' });
  }

  const refundAmt = amount !== undefined ? Number(amount) : order.grandTotal;

  // Restore inventory for returned items
  for (const item of order.items) {
    const product = db.products.find(p => p.id === item.product.id);
    if (product) {
      const oldQty = product.stockQuantity;
      product.stockQuantity += item.quantity;

      db.inventoryAdjustments.unshift({
        id: `adj-${Date.now()}-${product.id}`,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        oldQuantity: oldQty,
        newQuantity: product.stockQuantity,
        changeAmount: item.quantity,
        type: 'return',
        reason: `Customer Refund for Order ${order.orderNumber}: ${reason}`,
        userId: currentUser.id,
        userName: currentUser.name,
        createdAt: new Date().toISOString(),
      });
    }
  }

  // Restore/reverse customer loyalty points on refund
  if (order.customerId) {
    const customer = db.customers.find(c => c.id === order.customerId);
    if (customer) {
      const now = new Date().toISOString();
      if (order.pointsEarned && order.pointsEarned > 0) {
        // Proportionally reverse earned points
        const reversedPts = Math.floor(order.pointsEarned * (refundAmt / order.grandTotal));
        if (reversedPts > 0) {
          customer.loyaltyPoints = Math.max(0, customer.loyaltyPoints - reversedPts);
          db.loyaltyTransactions.unshift({
            id: `ltxn-${Date.now()}-ref-rev`,
            customerId: customer.id,
            type: 'refund_reversal',
            points: -reversedPts,
            orderId: order.id,
            orderNumber: order.orderNumber,
            reason: `Points deducted due to Refund on Order #${order.orderNumber} ($${refundAmt.toFixed(2)})`,
            balanceAfter: customer.loyaltyPoints,
            createdAt: now,
          });
        }
      }
    }
  }

  order.status = 'refunded';
  order.refundReason = reason;
  order.refundAmount = refundAmt;
  order.refundedBy = currentUser.name;
  order.updatedAt = new Date().toISOString();

  db.addAudit(currentUser.id, currentUser.name, currentUser.role, 'ORDER_REFUND', 'order', order.id, `Refunded $${refundAmt.toFixed(2)} on Order ${order.orderNumber}. Reason: ${reason}`);

  res.json({ message: 'Order refunded successfully', order });
}));

// ----------------------------------------------------
// CA-09 & CA-10: Held Orders API
// ----------------------------------------------------
apiRouter.get('/orders/held', (req: Request, res: Response) => {
  res.json(db.heldOrders);
});

apiRouter.post('/orders/hold', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  const { items, customer, orderDiscountPercent, orderDiscountAmount, notes } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Cannot put an empty cart on hold' });
  }

  const holdNumber = `HOLD-${Math.floor(100 + Math.random() * 900)}`;
  const heldOrder = {
    id: `hold-${Date.now()}`,
    holdNumber,
    cashierId: currentUser.id,
    cashierName: currentUser.name,
    customer,
    items,
    orderDiscountPercent: orderDiscountPercent || 0,
    orderDiscountAmount: orderDiscountAmount || 0,
    notes: notes || '',
    createdAt: new Date().toISOString(),
  };

  db.heldOrders.push(heldOrder);
  db.addAudit(currentUser.id, currentUser.name, currentUser.role, 'ORDER_HOLD', 'order', heldOrder.id, `Put order on hold (#${holdNumber}) with ${items.length} items`);

  res.status(201).json(heldOrder);
}));

apiRouter.delete('/orders/held/:id', asyncHandler(async (req: Request, res: Response) => {
  const index = db.heldOrders.findIndex(h => h.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Held order not found' });

  const removed = db.heldOrders.splice(index, 1)[0];
  res.json({ message: 'Held order retrieved and removed from queue', heldOrder: removed });
}));

// ----------------------------------------------------
// CU-01 to CU-03 & BE-09: Customer Management
// ----------------------------------------------------
apiRouter.get('/customers', (req: Request, res: Response) => {
  const { search } = req.query;
  let list = db.customers.filter(c => c.active);

  if (search) {
    const q = (search as string).toLowerCase().trim();
    list = list.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  }

  res.json(list);
});

apiRouter.get('/customers/:id', (req: Request, res: Response) => {
  const customer = db.customers.find(c => c.id === req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const customerOrders = db.orders.filter(o => o.customerId === customer.id);
  res.json({ customer, orders: customerOrders });
});

apiRouter.post('/customers', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  const { name, phone, email, notes } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Customer name and phone number are required' });
  }

  // Duplicate check
  if (db.customers.some(c => c.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''))) {
    return res.status(400).json({ error: 'A customer with this phone number already exists' });
  }

  const bonusPoints = (db.settings.loyaltyProgramEnabled !== false && db.settings.loyaltySignupBonusPoints) ? Number(db.settings.loyaltySignupBonusPoints) : 0;
  const now = new Date().toISOString();

  const newCustomer = {
    id: `cust-${Date.now()}`,
    name,
    phone,
    email: email || '',
    loyaltyPoints: bonusPoints,
    loyaltyTier: (bonusPoints >= 250 ? 'Silver' : 'Bronze') as 'Bronze' | 'Silver' | 'Gold' | 'Platinum',
    totalSpent: 0,
    orderCount: 0,
    notes: notes || '',
    active: true,
    createdAt: now,
  };

  db.customers.unshift(newCustomer);

  if (bonusPoints > 0) {
    db.loyaltyTransactions.unshift({
      id: `ltxn-${Date.now()}-bonus`,
      customerId: newCustomer.id,
      type: 'bonus',
      points: bonusPoints,
      reason: 'Welcome / Sign-up Bonus',
      balanceAfter: bonusPoints,
      createdAt: now,
    });
  }

  db.addAudit(
    currentUser.id,
    currentUser.name,
    currentUser.role,
    'CUSTOMER_CREATE',
    'customer',
    newCustomer.id,
    `Added new customer: ${name} (${phone})${bonusPoints > 0 ? ` with ${bonusPoints} welcome bonus points` : ''}`
  );

  res.status(201).json(newCustomer);
}));

apiRouter.put('/customers/:id', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  const customer = db.customers.find(c => c.id === req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const { name, phone, email, notes, active } = req.body;
  if (name !== undefined) customer.name = name;
  if (phone !== undefined) customer.phone = phone;
  if (email !== undefined) customer.email = email;
  if (notes !== undefined) customer.notes = notes;
  if (active !== undefined) customer.active = active;

  db.addAudit(currentUser.id, currentUser.name, currentUser.role, 'CUSTOMER_UPDATE', 'customer', customer.id, `Updated customer record for ${customer.name}`);
  res.json(customer);
}));

// Loyalty History & Summary for Customer
apiRouter.get('/customers/:id/loyalty-history', (req: Request, res: Response) => {
  const customer = db.customers.find(c => c.id === req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const history = db.loyaltyTransactions
    .filter(t => t.customerId === customer.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const rate = db.settings.loyaltyPointsPerDollarDiscount || 20;
  const redemptionDollarValue = Math.round((customer.loyaltyPoints / rate) * 100) / 100;

  res.json({
    customer,
    history,
    summary: {
      currentBalance: customer.loyaltyPoints,
      loyaltyTier: customer.loyaltyTier || 'Bronze',
      redemptionDollarValue,
      pointsPerDollarSpent: db.settings.loyaltyPointsPerDollar ?? 1,
      redemptionRateText: `${rate} points = $1.00 store credit`,
      minPointsToRedeem: db.settings.loyaltyMinPointsToRedeem ?? 50,
      totalEarned: history
        .filter(t => t.points > 0)
        .reduce((sum, t) => sum + t.points, 0),
      totalRedeemed: history
        .filter(t => t.type === 'redeemed')
        .reduce((sum, t) => sum + Math.abs(t.points), 0),
    },
  });
});

// Manual Loyalty Points Adjustment (Admins and Managers)
apiRouter.post('/customers/:id/loyalty-adjust', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  if (currentUser.role !== 'Admin' && currentUser.role !== 'Manager') {
    return res.status(403).json({ error: 'Only Managers and Admins can adjust customer loyalty points' });
  }

  const customer = db.customers.find(c => c.id === req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const { points, reason } = req.body;
  const numPoints = parseInt(points, 10);
  if (isNaN(numPoints) || numPoints === 0) {
    return res.status(400).json({ error: 'A valid non-zero points adjustment value is required' });
  }

  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'A reason must be provided for loyalty points adjustment' });
  }

  if (customer.loyaltyPoints + numPoints < 0) {
    return res.status(400).json({
      error: `Cannot deduct ${Math.abs(numPoints)} points: Customer currently has ${customer.loyaltyPoints} points`,
    });
  }

  customer.loyaltyPoints += numPoints;
  if (customer.loyaltyPoints >= 1000) customer.loyaltyTier = 'Platinum';
  else if (customer.loyaltyPoints >= 500) customer.loyaltyTier = 'Gold';
  else if (customer.loyaltyPoints >= 250) customer.loyaltyTier = 'Silver';
  else customer.loyaltyTier = 'Bronze';

  const now = new Date().toISOString();
  const transaction = {
    id: `ltxn-${Date.now()}-adj`,
    customerId: customer.id,
    type: (numPoints > 0 ? 'adjustment' : 'adjustment') as any,
    points: numPoints,
    reason: `Manual adjustment by ${currentUser.name}: ${reason.trim()}`,
    balanceAfter: customer.loyaltyPoints,
    createdAt: now,
  };

  db.loyaltyTransactions.unshift(transaction);
  db.addAudit(
    currentUser.id,
    currentUser.name,
    currentUser.role,
    'CUSTOMER_LOYALTY_ADJUST',
    'customer',
    customer.id,
    `${numPoints > 0 ? 'Granted' : 'Deducted'} ${Math.abs(numPoints)} loyalty points for ${customer.name}. Reason: ${reason.trim()}`
  );

  res.json({ customer, transaction });
}));

// ----------------------------------------------------
// IN-01 to IN-06 & BE-10: Inventory Management
// ----------------------------------------------------
apiRouter.get('/inventory', (req: Request, res: Response) => {
  const { lowStockOnly } = req.query;
  let list = db.products.filter(p => p.active);

  if (lowStockOnly === 'true') {
    list = list.filter(p => p.stockQuantity <= p.lowStockThreshold);
  }

  res.json(list);
});

apiRouter.get('/inventory/adjustments', (req: Request, res: Response) => {
  res.json(db.inventoryAdjustments);
});

apiRouter.post('/inventory/adjust', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  if (currentUser.role !== 'Admin' && currentUser.role !== 'Manager') {
    return res.status(403).json({ error: 'Only Managers and Admins can perform manual inventory adjustments' });
  }

  const { productId, newQuantity, reason, type } = req.body;
  if (!productId || newQuantity === undefined || !reason) {
    return res.status(400).json({ error: 'Product ID, new quantity, and adjustment reason are required' });
  }

  const product = db.products.find(p => p.id === productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const oldQuantity = product.stockQuantity;
  const targetQuantity = Math.max(0, parseInt(newQuantity, 10));
  const changeAmount = targetQuantity - oldQuantity;

  product.stockQuantity = targetQuantity;
  product.updatedAt = new Date().toISOString();

  const adjustment: InventoryAdjustment = {
    id: `adj-${Date.now()}`,
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    oldQuantity,
    newQuantity: targetQuantity,
    changeAmount,
    type: type || 'recount',
    reason,
    userId: currentUser.id,
    userName: currentUser.name,
    createdAt: new Date().toISOString(),
  };

  db.inventoryAdjustments.unshift(adjustment);
  db.addAudit(currentUser.id, currentUser.name, currentUser.role, 'INVENTORY_ADJUST', 'inventory', product.id, `Manual stock adjustment for "${product.name}": ${oldQuantity} -> ${targetQuantity} (${reason})`);

  res.json({ message: 'Stock adjusted successfully', product, adjustment });
}));

apiRouter.post('/inventory/receive', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  if (currentUser.role !== 'Admin' && currentUser.role !== 'Manager') {
    return res.status(403).json({ error: 'Only Managers and Admins can receive stock' });
  }

  const { productId, quantityReceived, poNumber, notes } = req.body;
  if (!productId || !quantityReceived || quantityReceived <= 0) {
    return res.status(400).json({ error: 'Valid Product ID and positive quantity are required' });
  }

  const product = db.products.find(p => p.id === productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const oldQuantity = product.stockQuantity;
  const added = parseInt(quantityReceived, 10);
  product.stockQuantity += added;
  product.updatedAt = new Date().toISOString();

  const adjustment: InventoryAdjustment = {
    id: `adj-${Date.now()}`,
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    oldQuantity,
    newQuantity: product.stockQuantity,
    changeAmount: added,
    type: 'receive',
    reason: `PO / Shipment: ${poNumber || 'Walk-in delivery'} - ${notes || 'Stock received'}`,
    userId: currentUser.id,
    userName: currentUser.name,
    createdAt: new Date().toISOString(),
  };

  db.inventoryAdjustments.unshift(adjustment);
  db.addAudit(currentUser.id, currentUser.name, currentUser.role, 'INVENTORY_RECEIVE', 'inventory', product.id, `Received ${added} units of "${product.name}" (PO: ${poNumber || 'N/A'})`);

  res.json({ message: 'Stock received and logged successfully', product, adjustment });
}));

// ----------------------------------------------------
// RP-01 to RP-05 & BE-11: Reports & Analytics API
// ----------------------------------------------------
apiRouter.get('/reports/sales', (req: Request, res: Response) => {
  const { period, startDate, endDate } = req.query; // 'today', 'week', 'month', 'custom', 'all'

  let filtered = db.orders.filter(o => o.status === 'completed');

  const now = new Date();
  if (startDate && endDate) {
    const startStr = typeof startDate === 'string' ? `${startDate.slice(0, 10)}T00:00:00.000Z` : '';
    const endStr = typeof endDate === 'string' ? `${endDate.slice(0, 10)}T23:59:59.999Z` : '';
    filtered = filtered.filter(o => o.createdAt >= startStr && o.createdAt <= endStr);
  } else if (startDate) {
    const startStr = typeof startDate === 'string' ? `${startDate.slice(0, 10)}T00:00:00.000Z` : '';
    filtered = filtered.filter(o => o.createdAt >= startStr);
  } else if (period === 'today') {
    const todayStr = now.toISOString().slice(0, 10);
    filtered = filtered.filter(o => o.createdAt.startsWith(todayStr));
  } else if (period === 'week') {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    filtered = filtered.filter(o => o.createdAt >= sevenDaysAgo);
  } else if (period === 'month') {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    filtered = filtered.filter(o => o.createdAt >= thirtyDaysAgo);
  }

  const grossSales = filtered.reduce((sum, o) => sum + o.subtotal, 0);
  const discountTotal = filtered.reduce((sum, o) => sum + o.discountTotal, 0);
  const taxTotal = filtered.reduce((sum, o) => sum + o.taxTotal, 0);
  const netSales = grossSales - discountTotal;
  const grandTotal = filtered.reduce((sum, o) => sum + o.grandTotal, 0);
  const orderCount = filtered.length;
  const averageOrderValue = orderCount > 0 ? grandTotal / orderCount : 0;

  // Payment breakdown
  const paymentBreakdown: Record<string, { count: number; total: number }> = {};
  const salesByPaymentMethod: Record<string, number> = {};
  filtered.forEach(o => {
    const method = o.payment?.method || 'cash';
    if (!paymentBreakdown[method]) {
      paymentBreakdown[method] = { count: 0, total: 0 };
    }
    paymentBreakdown[method].count += 1;
    paymentBreakdown[method].total += o.grandTotal;
    salesByPaymentMethod[method] = (salesByPaymentMethod[method] || 0) + o.grandTotal;
  });

  // Top products
  const productStats: Record<string, { name: string; sku: string; units: number; revenue: number; categoryName: string }> = {};
  filtered.forEach(o => {
    o.items.forEach(item => {
      const id = item.product.id;
      if (!productStats[id]) {
        productStats[id] = {
          name: item.product.name,
          sku: item.product.sku,
          units: 0,
          revenue: 0,
          categoryName: item.product.categoryName || 'General',
        };
      }
      productStats[id].units += item.quantity;
      productStats[id].revenue += item.lineTotal;
    });
  });

  const topProducts = Object.values(productStats).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  const topSellingProducts = topProducts.map(p => ({
    name: p.name,
    quantitySold: p.units,
    revenue: Math.round(p.revenue * 100) / 100,
  }));

  // Cashier stats
  const cashierStats: Record<string, { name: string; orders: number; revenue: number }> = {};
  filtered.forEach(o => {
    if (!cashierStats[o.cashierId]) {
      cashierStats[o.cashierId] = { name: o.cashierName, orders: 0, revenue: 0 };
    }
    cashierStats[o.cashierId].orders += 1;
    cashierStats[o.cashierId].revenue += o.grandTotal;
  });

  const cashierPerformance = Object.values(cashierStats).map(c => ({
    cashierName: c.name,
    orderCount: c.orders,
    totalSales: Math.round(c.revenue * 100) / 100,
    averageTicket: c.orders > 0 ? Math.round((c.revenue / c.orders) * 100) / 100 : 0,
  }));

  // Refunds calculation
  const refundedOrders = db.orders.filter(o => o.status === 'refunded');
  const refundsTotal = refundedOrders.reduce((sum, o) => sum + (o.refundAmount || o.grandTotal || 0), 0);

  // Inventory valuation summary
  const totalStockItems = db.products.reduce((sum, p) => sum + p.stockQuantity, 0);
  const retailValuation = db.products.reduce((sum, p) => sum + (p.price * p.stockQuantity), 0);
  const costValuation = db.products.reduce((sum, p) => sum + (p.cost * p.stockQuantity), 0);
  const lowStockCount = db.products.filter(p => p.active && p.stockQuantity <= p.lowStockThreshold).length;

  const inventoryValuation = {
    totalUnitsOnHand: totalStockItems,
    inventoryCostValue: Math.round(costValuation * 100) / 100,
    inventoryRetailValue: Math.round(retailValuation * 100) / 100,
    lowStockItemCount: lowStockCount,
    totalItems: totalStockItems,
    retailValuation: Math.round(retailValuation * 100) / 100,
    costValuation: Math.round(costValuation * 100) / 100,
    potentialProfit: Math.round((retailValuation - costValuation) * 100) / 100,
  };

  res.json({
    period: period || 'all',
    totalSales: Math.round(grandTotal * 100) / 100,
    completedOrdersCount: orderCount,
    averageOrderValue: Math.round(averageOrderValue * 100) / 100,
    discountsTotal: Math.round(discountTotal * 100) / 100,
    taxTotal: Math.round(taxTotal * 100) / 100,
    refundsTotal: Math.round(refundsTotal * 100) / 100,
    salesByPaymentMethod,
    topSellingProducts,
    cashierPerformance,
    inventoryValuation,
    // Backward compatibility
    grossSales: Math.round(grossSales * 100) / 100,
    netSales: Math.round(netSales * 100) / 100,
    discountTotal: Math.round(discountTotal * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100,
    orderCount,
    paymentBreakdown,
    topProducts,
    cashierStats: Object.values(cashierStats),
  });
});

// ----------------------------------------------------
// Settings & Audit Logs
// ----------------------------------------------------
apiRouter.get('/settings', (req: Request, res: Response) => {
  res.json(db.settings);
});

apiRouter.put('/settings', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  if (currentUser.role !== 'Admin' && currentUser.role !== 'Manager') {
    return res.status(403).json({ error: 'Only Admins and Managers can modify store settings' });
  }

  const before = { ...db.settings };
  db.settings = { ...db.settings, ...req.body };

  // Synchronize payment fallback service configuration
  if (paymentFallbackService) {
    paymentFallbackService.updateConfig({
      fallbackEnabled: db.settings.paymentFallbackEnabled !== false,
      tapToPayPhoneEnabled: db.settings.tapToPayPhoneEnabled !== false,
      customerQrEnabled: db.settings.customerQrPaymentEnabled !== false,
      customerSelfEntryAllowed: db.settings.customerSelfEnterCard !== 'disabled',
      manualEntryAllowed: db.settings.cashierManualCardEntry !== 'disabled',
      sessionExpiryMinutes: db.settings.paymentSessionExpiryMinutes || 10,
    });
  }

  db.addAudit(currentUser.id, currentUser.name, currentUser.role, 'SETTINGS_UPDATE', 'settings', 'global', 'Updated store configuration & payment fallback settings', before, db.settings);

  res.json(db.settings);
}));

apiRouter.get('/audit-logs', (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  if (currentUser.role !== 'Admin' && currentUser.role !== 'Manager') {
    return res.status(403).json({ error: 'Only Managers and Admins can view audit logs' });
  }

  res.json(db.auditLogs);
});

// ----------------------------------------------------
// AP-DS-01 to AP-DS-04: Promotions & Discount Rules
// ----------------------------------------------------
apiRouter.get('/promotions', (req: Request, res: Response) => {
  res.json(db.promotions);
});

apiRouter.post('/promotions', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  if (currentUser.role !== 'Admin') {
    return res.status(403).json({ error: 'Only Admins can create promotions' });
  }

  const { name, code, type, value, startDate, endDate, targetType, targetId, minSpend, maxDiscount } = req.body;
  if (!name || !code || value === undefined) {
    return res.status(400).json({ error: 'Promotion name, code, and discount value are required' });
  }

  const formattedCode = code.trim().toUpperCase();
  if (db.promotions.some(p => p.code === formattedCode)) {
    return res.status(400).json({ error: `Promotion code "${formattedCode}" already exists` });
  }

  let targetName = 'All Store Products';
  if (targetType === 'category' && targetId) {
    const cat = db.categories.find(c => c.id === targetId);
    targetName = cat ? cat.name : 'Category';
  } else if (targetType === 'product' && targetId) {
    const prod = db.products.find(p => p.id === targetId);
    targetName = prod ? prod.name : 'Product';
  }

  const newPromo: any = {
    id: `promo-${Date.now()}`,
    name,
    code: formattedCode,
    type: type || 'percentage',
    value: Number(value),
    startDate: startDate || new Date().toISOString(),
    endDate: endDate || new Date(Date.now() + 30 * 86400000).toISOString(),
    active: true,
    targetType: targetType || 'all',
    targetId: targetId || undefined,
    targetName,
    minSpend: minSpend ? Number(minSpend) : 0,
    maxDiscount: maxDiscount ? Number(maxDiscount) : undefined,
    usageCount: 0,
  };

  db.promotions.unshift(newPromo);
  db.addAudit(currentUser.id, currentUser.name, currentUser.role, 'PROMOTION_CREATE', 'settings', newPromo.id, `Created promotion "${newPromo.name}" (${newPromo.code})`);
  res.status(201).json(newPromo);
}));

apiRouter.put('/promotions/:id', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  if (currentUser.role !== 'Admin') {
    return res.status(403).json({ error: 'Only Admins can edit promotions' });
  }

  const promo = db.promotions.find(p => p.id === req.params.id);
  if (!promo) return res.status(404).json({ error: 'Promotion not found' });

  const { name, code, type, value, startDate, endDate, active, targetType, targetId, minSpend, maxDiscount } = req.body;
  if (name !== undefined) promo.name = name;
  if (code !== undefined) promo.code = code.trim().toUpperCase();
  if (type !== undefined) promo.type = type;
  if (value !== undefined) promo.value = Number(value);
  if (startDate !== undefined) promo.startDate = startDate;
  if (endDate !== undefined) promo.endDate = endDate;
  if (active !== undefined) promo.active = Boolean(active);
  if (targetType !== undefined) promo.targetType = targetType;
  if (targetId !== undefined) {
    promo.targetId = targetId;
    if (targetType === 'category') {
      const cat = db.categories.find(c => c.id === targetId);
      promo.targetName = cat ? cat.name : 'Category';
    } else if (targetType === 'product') {
      const prod = db.products.find(p => p.id === targetId);
      promo.targetName = prod ? prod.name : 'Product';
    }
  }
  if (minSpend !== undefined) promo.minSpend = Number(minSpend);
  if (maxDiscount !== undefined) promo.maxDiscount = Number(maxDiscount);

  db.addAudit(currentUser.id, currentUser.name, currentUser.role, 'PROMOTION_UPDATE', 'settings', promo.id, `Updated promotion "${promo.name}"`);
  res.json(promo);
}));

apiRouter.delete('/promotions/:id', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  if (currentUser.role !== 'Admin') {
    return res.status(403).json({ error: 'Only Admins can delete promotions' });
  }

  const promo = db.promotions.find(p => p.id === req.params.id);
  if (!promo) return res.status(404).json({ error: 'Promotion not found' });

  promo.active = false;
  db.addAudit(currentUser.id, currentUser.name, currentUser.role, 'PROMOTION_DEACTIVATE', 'settings', promo.id, `Deactivated promotion "${promo.name}"`);
  res.json({ message: 'Promotion deactivated successfully', promo });
}));

apiRouter.post('/promotions/validate', asyncHandler(async (req: Request, res: Response) => {
  const { code, subtotal } = req.body;
  if (!code) return res.status(400).json({ error: 'Promo code is required' });

  const promo = db.promotions.find(p => p.code.toUpperCase() === code.trim().toUpperCase() && p.active);
  if (!promo) {
    return res.status(404).json({ valid: false, error: 'Invalid or inactive promotional code' });
  }

  const now = new Date();
  if (new Date(promo.startDate) > now || new Date(promo.endDate) < now) {
    return res.status(400).json({ valid: false, error: 'This promotion has expired or is not yet active' });
  }

  const orderSubtotal = Number(subtotal || 0);
  if (promo.minSpend && orderSubtotal < promo.minSpend) {
    return res.status(400).json({
      valid: false,
      error: `Minimum order spend of $${promo.minSpend.toFixed(2)} required for this code (current: $${orderSubtotal.toFixed(2)})`
    });
  }

  let discountAmount = 0;
  if (promo.type === 'percentage') {
    discountAmount = (orderSubtotal * promo.value) / 100;
    if (promo.maxDiscount && discountAmount > promo.maxDiscount) {
      discountAmount = promo.maxDiscount;
    }
  } else {
    discountAmount = Math.min(promo.value, orderSubtotal);
  }

  res.json({
    valid: true,
    promoId: promo.id,
    promoName: promo.name,
    code: promo.code,
    type: promo.type,
    value: promo.value,
    discountAmount: Math.round(discountAmount * 100) / 100,
  });
}));

// ----------------------------------------------------
// AP-DV-01 to AP-DV-04: Devices & Hardware Register API
// ----------------------------------------------------
apiRouter.get('/devices', (req: Request, res: Response) => {
  res.json(db.devices);
});

apiRouter.post('/devices', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  if (currentUser.role !== 'Admin') {
    return res.status(403).json({ error: 'Only Admins can register devices' });
  }

  const { name, type, model, connection, ipAddress, paperWidth } = req.body;
  if (!name || !type) {
    return res.status(400).json({ error: 'Device name and type are required' });
  }

  const newDevice: any = {
    id: `dev-${Date.now()}`,
    name,
    type,
    model: model || 'Generic Hardware',
    connection: connection || 'usb',
    status: 'connected',
    ipAddress: ipAddress || undefined,
    paperWidth: paperWidth || (type === 'printer' ? '80mm' : undefined),
    lastActive: new Date().toISOString(),
  };

  db.devices.push(newDevice);
  db.addAudit(currentUser.id, currentUser.name, currentUser.role, 'DEVICE_REGISTER', 'settings', newDevice.id, `Registered hardware device "${newDevice.name}" (${newDevice.model})`);
  res.status(201).json(newDevice);
}));

apiRouter.put('/devices/:id', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  if (currentUser.role !== 'Admin') {
    return res.status(403).json({ error: 'Only Admins can update devices' });
  }

  const dev = db.devices.find(d => d.id === req.params.id);
  if (!dev) return res.status(404).json({ error: 'Device not found' });

  const { name, model, connection, ipAddress, paperWidth, status } = req.body;
  if (name !== undefined) dev.name = name;
  if (model !== undefined) dev.model = model;
  if (connection !== undefined) dev.connection = connection;
  if (ipAddress !== undefined) dev.ipAddress = ipAddress;
  if (paperWidth !== undefined) dev.paperWidth = paperWidth;
  if (status !== undefined) dev.status = status;
  dev.lastActive = new Date().toISOString();

  res.json(dev);
}));

apiRouter.delete('/devices/:id', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  if (currentUser.role !== 'Admin') {
    return res.status(403).json({ error: 'Only Admins can delete devices' });
  }

  const index = db.devices.findIndex(d => d.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Device not found' });

  const removed = db.devices.splice(index, 1)[0];
  db.addAudit(currentUser.id, currentUser.name, currentUser.role, 'DEVICE_REMOVE', 'settings', removed.id, `Removed device "${removed.name}"`);
  res.json({ message: 'Device removed successfully' });
}));

apiRouter.post('/devices/:id/test-print', asyncHandler(async (req: Request, res: Response) => {
  const dev = db.devices.find(d => d.id === req.params.id);
  if (!dev) return res.status(404).json({ error: 'Device not found' });

  dev.lastActive = new Date().toISOString();
  res.json({
    success: true,
    message: `Test pattern dispatched to ${dev.name} (${dev.model}). Thermal cutter test verified ok.`,
    timestamp: new Date().toISOString(),
  });
}));

// ----------------------------------------------------
// AP-AU-04 & AP-US-05: Reset User Credentials & AP-US-04: User Activity
// ----------------------------------------------------
apiRouter.post('/users/:id/reset-credentials', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  if (currentUser.role !== 'Admin') {
    return res.status(403).json({ error: 'Only Admins can reset user passwords and PINs' });
  }

  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { newPin, newPassword } = req.body;
  if (!newPin && !newPassword) {
    return res.status(400).json({ error: 'Either newPin or newPassword must be provided' });
  }

  if (newPin) {
    if (!/^\d{4,6}$/.test(newPin)) {
      return res.status(400).json({ error: 'Terminal PIN must be 4 to 6 numeric digits' });
    }
    user.pin = newPin;
  }

  if (newPassword) {
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    user.password = newPassword;
  }

  db.addAudit(
    currentUser.id,
    currentUser.name,
    currentUser.role,
    'USER_RESET_CREDENTIALS',
    'user',
    user.id,
    `Admin reset credentials for ${user.name} (${newPin ? 'PIN updated' : ''} ${newPassword ? 'Password updated' : ''})`
  );

  res.json({
    message: `Credentials updated successfully for ${user.name}`,
    userId: user.id,
    pinUpdated: Boolean(newPin),
    passwordUpdated: Boolean(newPassword),
  });
}));

apiRouter.get('/users/:id/activity', asyncHandler(async (req: Request, res: Response) => {
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const userOrders = db.orders.filter(o => o.cashierId === user.id);
  const completedOrders = userOrders.filter(o => o.status === 'completed');
  const totalRevenue = completedOrders.reduce((s, o) => s + o.grandTotal, 0);
  const totalDiscounts = completedOrders.reduce((s, o) => s + (o.discountTotal || 0), 0);
  const averageTicket = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;
  const voidedOrders = userOrders.filter(o => o.status === 'voided').length;
  const refundedOrders = userOrders.filter(o => o.status === 'refunded').length;

  res.json({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    totalOrdersCount: userOrders.length,
    completedOrdersCount: completedOrders.length,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalDiscounts: Math.round(totalDiscounts * 100) / 100,
    averageTicket: Math.round(averageTicket * 100) / 100,
    voidedCount: voidedOrders,
    refundedCount: refundedOrders,
    recentOrders: userOrders.slice(0, 10),
  });
}));

// ----------------------------------------------------
// BE-BG-01 to BE-BG-04: Background Services & Email Queue
// ----------------------------------------------------
const backgroundQueue: any[] = [
  {
    id: 'bg-1',
    task: 'Email Receipt Delivery',
    recipient: 'marcus.v@example.com',
    status: 'sent',
    details: 'Receipt ORD-1001 dispatched via transactional SMTP',
    timestamp: '2026-03-06T10:16:00Z',
  },
  {
    id: 'bg-2',
    task: 'Low Stock Auto-Scan',
    recipient: 'manager@pos.local',
    status: 'completed',
    details: 'Identified 1 item below threshold (Eagle Rare 10 Year)',
    timestamp: '2026-03-06T08:00:00Z',
  },
];

apiRouter.post('/background/send-receipt', asyncHandler(async (req: Request, res: Response) => {
  const { orderId, email } = req.body;
  if (!orderId || !email) {
    return res.status(400).json({ error: 'orderId and email are required' });
  }

  const order = db.orders.find(o => o.id === orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const task = {
    id: `bg-${Date.now()}`,
    task: 'Email Receipt Delivery',
    recipient: email,
    orderNumber: order.orderNumber,
    status: 'sent',
    details: `Digital thermal receipt for ${order.orderNumber} ($${order.grandTotal.toFixed(2)}) dispatched to ${email}`,
    timestamp: new Date().toISOString(),
  };
  backgroundQueue.unshift(task);

  res.json({
    success: true,
    message: `Receipt dispatched asynchronously to ${email}`,
    task,
  });
}));

apiRouter.get('/background/tasks', (req: Request, res: Response) => {
  res.json(backgroundQueue);
});

// ----------------------------------------------------
// AP-DB-01 to AP-DB-04: Admin Dashboard Overview API
// ----------------------------------------------------
apiRouter.get('/dashboard/overview', (req: Request, res: Response) => {
  const { period, startDate, endDate } = req.query;

  const now = new Date();
  let filtered = [...db.orders];

  if (period === 'today') {
    const todayStr = now.toISOString().split('T')[0];
    filtered = filtered.filter(o => o.createdAt.startsWith(todayStr));
  } else if (period === 'yesterday') {
    const yest = new Date(now.getTime() - 86400000);
    const yestStr = yest.toISOString().split('T')[0];
    filtered = filtered.filter(o => o.createdAt.startsWith(yestStr));
  } else if (period === 'week') {
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    filtered = filtered.filter(o => new Date(o.createdAt) >= weekAgo);
  } else if (period === 'month') {
    const monthAgo = new Date(now.getTime() - 30 * 86400000);
    filtered = filtered.filter(o => new Date(o.createdAt) >= monthAgo);
  } else if (startDate && endDate) {
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    end.setHours(23, 59, 59, 999);
    filtered = filtered.filter(o => {
      const t = new Date(o.createdAt);
      return t >= start && t <= end;
    });
  }

  const completed = filtered.filter(o => o.status === 'completed');
  const grossSales = completed.reduce((sum, o) => sum + o.grandTotal, 0);
  const netSales = completed.reduce((sum, o) => sum + o.subtotal, 0);
  const discountTotal = completed.reduce((sum, o) => sum + (o.discountTotal || 0), 0);
  const taxTotal = completed.reduce((sum, o) => sum + o.taxTotal, 0);
  const orderCount = completed.length;
  const averageOrderValue = orderCount > 0 ? grossSales / orderCount : 0;

  // Calculate COGS and Gross Profit
  let totalCostOfGoods = 0;
  completed.forEach(o => {
    o.items.forEach(item => {
      const prod = db.products.find(p => p.id === item.product.id);
      const unitCost = prod ? (prod.cost || 0) : (item.product.cost || 0);
      totalCostOfGoods += unitCost * item.quantity;
    });
  });
  const grossProfit = Math.max(0, netSales - totalCostOfGoods);
  const grossProfitMargin = netSales > 0 ? (grossProfit / netSales) * 100 : 0;

  // Low stock and out-of-stock
  const lowStockItems = db.products.filter(p => p.active && p.stockQuantity <= p.lowStockThreshold);
  const outOfStockItems = db.products.filter(p => p.active && p.stockQuantity === 0);

  // Daily / Trend chart data points
  // Generate 7 time buckets for the trend graph
  const trendPoints: { label: string; sales: number; orders: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
    const dayOrders = completed.filter(o => o.createdAt.startsWith(dateStr));
    const daySales = dayOrders.reduce((s, o) => s + o.grandTotal, 0);
    trendPoints.push({
      label: dayName,
      sales: Math.round(daySales * 100) / 100,
      orders: dayOrders.length,
    });
  }

  // Payment Breakdown
  const paymentBreakdown: Record<string, number> = {};
  completed.forEach(o => {
    const method = o.payment.method || 'cash';
    paymentBreakdown[method] = (paymentBreakdown[method] || 0) + o.grandTotal;
  });

  // Recent 10 orders
  const recentOrders = [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);

  res.json({
    kpis: {
      grossSales: Math.round(grossSales * 100) / 100,
      netSales: Math.round(netSales * 100) / 100,
      discountTotal: Math.round(discountTotal * 100) / 100,
      taxTotal: Math.round(taxTotal * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      grossProfitMargin: Math.round(grossProfitMargin * 10) / 10,
      orderCount,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      totalCustomers: db.customers.length,
      activeStaffCount: db.users.filter(u => u.active).length,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
    },
    trendPoints,
    paymentBreakdown,
    lowStockItems: lowStockItems.map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      stockQuantity: p.stockQuantity,
      lowStockThreshold: p.lowStockThreshold,
      categoryName: p.categoryName,
      price: p.price,
      cost: p.cost,
    })),
    recentOrders,
  });
});

// ----------------------------------------------------
// IN-SC-01 through IN-SC-18: Vendor & Invoice Scan Endpoints
// ----------------------------------------------------

// IN-SC-03 & IN-SC-04: Get all vendors
apiRouter.get('/vendors', asyncHandler(async (req: Request, res: Response) => {
  const query = (req.query.q as string || '').toLowerCase().trim();
  let list = db.vendors;
  if (query) {
    list = list.filter(v => 
      v.name.toLowerCase().includes(query) ||
      (v.accountNumber && v.accountNumber.toLowerCase().includes(query)) ||
      (v.email && v.email.toLowerCase().includes(query)) ||
      (v.aliases && v.aliases.some(a => a.toLowerCase().includes(query)))
    );
  }
  res.json(list);
}));

// Create vendor
apiRouter.post('/vendors', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  const { name, accountNumber, phone, email, address, website, taxId, aliases } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Vendor name is required' });
  }

  const newVendor: Vendor = {
    id: `vnd-${Date.now()}`,
    name,
    normalizedName: normalizeText(name),
    accountNumber: accountNumber || '',
    phone: phone || '',
    email: email || '',
    address: address || '',
    website: website || '',
    taxId: taxId || '',
    aliases: aliases || [],
    source: 'Manual',
    active: true,
    createdAt: new Date().toISOString(),
  };

  db.vendors.push(newVendor);
  db.addAudit(currentUser.id, currentUser.name, currentUser.role, 'VENDOR_CREATE', 'vendor', newVendor.id, `Created vendor "${newVendor.name}"`);
  res.status(201).json(newVendor);
}));

// Update vendor
apiRouter.put('/vendors/:id', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  const { id } = req.params;
  const vendor = db.vendors.find(v => v.id === id);
  if (!vendor) {
    return res.status(404).json({ error: 'Vendor not found' });
  }

  const before = { ...vendor };
  Object.assign(vendor, req.body, {
    normalizedName: req.body.name ? normalizeText(req.body.name) : vendor.normalizedName,
    updatedAt: new Date().toISOString(),
  });

  db.addAudit(currentUser.id, currentUser.name, currentUser.role, 'VENDOR_UPDATE', 'vendor', id, `Updated vendor "${vendor.name}"`, before, vendor);
  res.json(vendor);
}));

// IN-SC-17: Vendor Purchase History & Analytics
apiRouter.get('/vendors/:id/stats', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const vendor = db.vendors.find(v => v.id === id);
  if (!vendor) {
    return res.status(404).json({ error: 'Vendor not found' });
  }

  // Find all confirmed invoices from this vendor
  const vendorInvoices = db.invoices.filter(i => (i.vendorId === id || normalizeText(i.vendorName) === normalizeText(vendor.name)) && i.status === 'confirmed');
  
  const totalPurchases = vendorInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalInvoicesCount = vendorInvoices.length;

  // Collect unique products purchased
  const productIds = new Set<string>();
  let totalCostSum = 0;
  let costItemCount = 0;
  let latestCost = 0;

  vendorInvoices.forEach(inv => {
    inv.lineItems.forEach(line => {
      if (line.matchedProductId) {
        productIds.add(line.matchedProductId);
      }
      if (line.unitCost > 0) {
        totalCostSum += line.unitCost;
        costItemCount++;
        latestCost = line.unitCost;
      }
    });
  });

  const averageCost = costItemCount > 0 ? Number((totalCostSum / costItemCount).toFixed(2)) : 0;
  
  // Sort invoices by date desc
  const sortedInvoices = [...vendorInvoices].sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
  const lastPurchaseDate = sortedInvoices[0]?.invoiceDate;

  // Determine purchase frequency
  let purchaseFrequency = 'Occasional';
  if (totalInvoicesCount >= 4) {
    purchaseFrequency = 'Weekly';
  } else if (totalInvoicesCount >= 2) {
    purchaseFrequency = 'Bi-Weekly';
  } else if (totalInvoicesCount === 1) {
    purchaseFrequency = 'Monthly';
  }

  const stats: VendorPurchaseStats = {
    vendor,
    totalPurchases: Number(totalPurchases.toFixed(2)),
    totalInvoicesCount,
    productsPurchasedCount: productIds.size,
    latestCost,
    averageCost,
    lastPurchaseDate,
    purchaseFrequency,
    invoices: sortedInvoices,
  };

  res.json(stats);
}));

// IN-SC-01 & IN-SC-02 & IN-SC-05: AI / Multimodal Invoice Extraction
apiRouter.post('/invoices/extract', asyncHandler(async (req: Request, res: Response) => {
  const { fileDataUrl, fileName, fileType, manualText } = req.body;
  
  const currentUser = getAuthUser(req);
  const invoice = await extractInvoiceFromData(fileDataUrl, fileName, fileType, manualText);
  invoice.receivedByUserId = currentUser.id;
  invoice.receivedByUserName = currentUser.name;

  res.json(invoice);
}));

// IN-SC-16: List Invoice History with search & filters
apiRouter.get('/invoices', asyncHandler(async (req: Request, res: Response) => {
  const { status, vendorId, q, startDate, endDate } = req.query;
  let list = [...db.invoices];

  if (status && status !== 'all') {
    list = list.filter(i => i.status === status);
  }

  if (vendorId && vendorId !== 'all') {
    list = list.filter(i => i.vendorId === vendorId);
  }

  if (startDate) {
    list = list.filter(i => i.invoiceDate >= (startDate as string));
  }

  if (endDate) {
    list = list.filter(i => i.invoiceDate <= (endDate as string));
  }

  if (q) {
    const query = (q as string).toLowerCase().trim();
    list = list.filter(i => 
      i.invoiceNumber.toLowerCase().includes(query) ||
      i.vendorName.toLowerCase().includes(query) ||
      (i.receivedByUserName && i.receivedByUserName.toLowerCase().includes(query)) ||
      i.lineItems.some(l => l.description.toLowerCase().includes(query) || (l.matchedProductName && l.matchedProductName.toLowerCase().includes(query)))
    );
  }

  // Sort newest first
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json(list);
}));

// Get single invoice
apiRouter.get('/invoices/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const inv = db.invoices.find(i => i.id === id);
  if (!inv) {
    return res.status(404).json({ error: 'Invoice not found' });
  }
  res.json(inv);
}));

// Create or Save Draft Invoice
apiRouter.post('/invoices', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  const invoiceData: ScannedInvoice = req.body;
  
  if (!invoiceData.id) {
    invoiceData.id = `inv-${Date.now()}`;
  }
  invoiceData.createdAt = new Date().toISOString();
  invoiceData.updatedAt = new Date().toISOString();
  invoiceData.receivedByUserId = currentUser.id;
  invoiceData.receivedByUserName = currentUser.name;

  db.invoices.unshift(invoiceData);
  db.addAudit(currentUser.id, currentUser.name, currentUser.role, 'INVOICE_CREATE', 'invoice', invoiceData.id, `Saved invoice #${invoiceData.invoiceNumber} as ${invoiceData.status}`);
  
  res.status(201).json(invoiceData);
}));

// Update Invoice Draft / Review updates
apiRouter.put('/invoices/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = db.invoices.find(i => i.id === id);
  if (!existing) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  Object.assign(existing, req.body, { updatedAt: new Date().toISOString() });
  res.json(existing);
}));

// IN-SC-09, IN-SC-10, IN-SC-12, IN-SC-15: Confirm & Receive Invoice (Atomic Transaction)
apiRouter.post('/invoices/:id/confirm', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  const { id } = req.params;
  const updatedInvoiceData = req.body;

  try {
    const result = confirmAndReceiveInvoice(id, updatedInvoiceData, currentUser);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to confirm and receive invoice' });
  }
}));

// IN-SC-15: Receiving Transactions Ledger
apiRouter.get('/invoices-receiving-history', asyncHandler(async (req: Request, res: Response) => {
  res.json(db.receivingTransactions);
}));

// ============================================================================
// INV-01 to INV-18: QR Code & Mobile Invoice Upload API
// ============================================================================

// INV-01: Generate Invoice Upload Barcode/QR Code Session
apiRouter.post('/invoices/upload-sessions', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  const expiryMinutes = Number(req.body.expiryMinutes) || 10;
  
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiryMinutes * 60 * 1000).toISOString();
  const sessionId = `inv-sess-${Date.now()}`;
  const token = `tok-${Math.random().toString(36).substring(2, 10)}`;

  const newSession: InvoiceUploadSession = {
    id: sessionId,
    storeId: 'store-granbury-377',
    storeName: db.settings.storeName || '377 Spirits Granbury',
    token,
    status: 'waiting_for_scan',
    statusMessage: 'Waiting for phone camera scan...',
    expiresAt,
    createdAt: now.toISOString(),
    createdByUserId: currentUser.id,
    createdByUserName: currentUser.name,
  };

  db.uploadSessions.unshift(newSession);
  db.addAudit(
    currentUser.id,
    currentUser.name,
    currentUser.role,
    'INVOICE_SESSION_CREATE',
    'invoice',
    sessionId,
    `Generated QR invoice upload session #${sessionId} (Expires in ${expiryMinutes}m)`
  );

  res.status(201).json(newSession);
}));

// Check upload session status (INV-17, INV-18)
apiRouter.get('/invoices/upload-sessions/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const session = db.uploadSessions.find(s => s.id === id);
  if (!session) {
    return res.status(404).json({ error: 'Invoice upload session not found or invalid' });
  }

  // Check expiration (INV-18)
  if (session.status !== 'completed' && session.status !== 'cancelled' && session.status !== 'expired') {
    if (new Date() > new Date(session.expiresAt)) {
      session.status = 'expired';
      session.statusMessage = 'Upload session has expired. Please generate a new QR code at the POS.';
    }
  }

  res.json(session);
}));

// Phone connects after scanning QR/Barcode (INV-02, INV-17)
apiRouter.post('/invoices/upload-sessions/:id/connect', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { token } = req.body;
  const session = db.uploadSessions.find(s => s.id === id);

  if (!session) {
    return res.status(404).json({ error: 'Receiving session not found' });
  }

  if (session.token && token && session.token !== token) {
    return res.status(403).json({ error: 'Unauthorized: Invalid session token' });
  }

  // Check expiration (INV-18)
  if (new Date() > new Date(session.expiresAt) || session.status === 'expired') {
    session.status = 'expired';
    session.statusMessage = 'This session code has expired. Please scan a fresh QR code at the POS.';
    return res.status(410).json({ error: 'Session expired', session });
  }

  if (session.status === 'cancelled') {
    return res.status(410).json({ error: 'Session was cancelled by store admin', session });
  }

  if (session.status === 'completed') {
    return res.status(400).json({ error: 'This session has already been used and completed.', session });
  }

  session.status = 'phone_connected';
  session.statusMessage = 'Phone connected! Ready to capture vendor invoice.';
  session.phoneConnectedAt = new Date().toISOString();

  res.json({ success: true, session });
}));

// Upload invoice image(s) from phone & trigger OCR / Extraction (INV-03, INV-04, INV-05)
apiRouter.post('/invoices/upload-sessions/:id/upload', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { fileDataUrls, fileNames, manualText } = req.body;
  const session = db.uploadSessions.find(s => s.id === id);

  if (!session) {
    return res.status(404).json({ error: 'Upload session not found' });
  }

  if (session.status === 'expired' || new Date() > new Date(session.expiresAt)) {
    session.status = 'expired';
    return res.status(410).json({ error: 'Upload session expired. Please generate a new code.' });
  }

  if (!fileDataUrls || fileDataUrls.length === 0) {
    return res.status(400).json({ error: 'No invoice image or document was provided' });
  }

  session.status = 'uploading';
  session.statusMessage = `Ingesting ${fileDataUrls.length} invoice page(s)...`;
  session.uploadedAt = new Date().toISOString();
  session.fileDataUrls = fileDataUrls;
  session.fileNames = fileNames || fileDataUrls.map((_: any, idx: number) => `invoice-page-${idx + 1}.jpg`);

  try {
    session.status = 'processing';
    session.statusMessage = 'Reading vendor, items, and case quantities via AI...';

    // Extract invoice from primary page
    const invoice = await extractInvoiceFromData(
      fileDataUrls[0],
      session.fileNames[0] || 'phone-invoice.jpg',
      'image/jpeg',
      manualText
    );

    invoice.receivedByUserId = session.createdByUserId;
    invoice.receivedByUserName = session.createdByUserName;

    session.extractedInvoice = invoice;
    session.status = 'ready_for_review';
    session.statusMessage = 'Invoice processed successfully! Ready for review on POS screen.';

    // Add to db.invoices in review_required status
    if (!db.invoices.some(i => i.id === invoice.id)) {
      db.invoices.unshift(invoice);
    }

    res.json({ success: true, session, invoice });
  } catch (err: any) {
    console.error('Extraction error for session', id, err);
    session.status = 'failed';
    session.error = err.message || 'Failed to read invoice';
    session.statusMessage = 'Failed to extract invoice data. User may retry or upload clearer photo.';
    res.status(500).json({ error: err.message, session });
  }
}));

// Expire or Cancel session manually (INV-18)
apiRouter.post('/invoices/upload-sessions/:id/cancel', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  const { id } = req.params;
  const session = db.uploadSessions.find(s => s.id === id);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  session.status = 'cancelled';
  session.statusMessage = 'Session cancelled by user.';

  db.addAudit(
    currentUser.id,
    currentUser.name,
    currentUser.role,
    'INVOICE_SESSION_CANCEL',
    'invoice',
    id,
    `Cancelled QR invoice upload session #${id}`
  );

  res.json({ success: true, session });
}));

// ====================================================
// OMNICHANNEL UNIFIED ENGINE ENDPOINTS (EPICS 1 - 16)
// ====================================================

// GET /api/inventory/ledger - Get immutable inventory ledger entries (US-004)
apiRouter.get('/inventory/ledger', (req: Request, res: Response) => {
  const { productId, channel, reason, limit = '100' } = req.query;
  let ledger = [...db.inventoryLedger];

  if (productId) {
    ledger = ledger.filter(l => l.productId === productId);
  }
  if (channel) {
    ledger = ledger.filter(l => l.channel === channel);
  }
  if (reason) {
    ledger = ledger.filter(l => l.reason === reason);
  }

  const parsedLimit = parseInt(limit as string, 10) || 100;
  res.json({
    ledger: ledger.slice(0, parsedLimit),
    totalCount: ledger.length,
  });
});

// GET /api/inventory/ats/:productId - Calculate Available-To-Sell (US-005)
apiRouter.get('/inventory/ats/:productId', (req: Request, res: Response) => {
  const ats = db.getProductATS(req.params.productId);
  if (!ats) {
    return res.status(404).json({ error: 'Product not found for ATS calculation' });
  }
  res.json(ats);
});

// GET /api/inventory/ats - Get ATS for all active catalog items
apiRouter.get('/inventory/ats', (req: Request, res: Response) => {
  const atsList = db.products.map(p => db.getProductATS(p.id)).filter(Boolean);
  res.json({ atsList });
});

// POST /api/inventory/reserve - Reserve stock for web/mobile order (US-006)
apiRouter.post('/inventory/reserve', (req: Request, res: Response) => {
  const { orderId, orderNumber, productId, quantity, channel = 'web', durationMinutes = 30 } = req.body;

  if (!productId || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Product ID and positive quantity are required' });
  }

  const ats = db.getProductATS(productId);
  if (!ats || ats.availableToSell < quantity) {
    return res.status(400).json({
      error: `Insufficient Available-To-Sell stock (Available: ${ats?.availableToSell || 0}, Requested: ${quantity})`,
    });
  }

  const expiresAt = new Date(Date.now() + (Number(durationMinutes) || 30) * 60000).toISOString();
  const reservation: InventoryReservation = {
    id: `res-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    orderId: orderId || `ord-tmp-${Date.now()}`,
    orderNumber: orderNumber || `TMP-${Math.floor(1000 + Math.random() * 9000)}`,
    productId,
    quantity: Number(quantity),
    channel: channel as any,
    status: 'active',
    expiresAt,
    createdAt: new Date().toISOString(),
  };

  db.inventoryReservations.unshift(reservation);
  res.status(201).json({ success: true, reservation });
});

// POST /api/omnichannel/cart-transfer - Generate QR Cart Transfer Code (US-013, US-014)
apiRouter.post('/omnichannel/cart-transfer', (req: Request, res: Response) => {
  const { items, customerName, customerPhone, sourceChannel = 'mobile_queue', destinationRegisterId } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cannot transfer an empty cart' });
  }

  const transferCode = `CART-${Math.floor(1000 + Math.random() * 9000)}`;
  const cartId = `trans-${Date.now()}`;
  const subtotal = items.reduce((sum: number, item: any) => sum + (item.unitPrice || item.product.price) * item.quantity, 0);

  const transfer: OmnichannelCartTransfer = {
    cartId,
    transferCode,
    qrData: `POS_CART:${transferCode}:${cartId}`,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour validity
    sourceChannel: sourceChannel as any,
    destinationRegisterId,
    customerName,
    customerPhone,
    items,
    subtotal: Math.round(subtotal * 100) / 100,
    claimed: false,
  };

  db.omnichannelCartTransfers.unshift(transfer);
  res.status(201).json({ success: true, transfer });
});

// GET /api/omnichannel/cart-transfer/:code - Lookup cart transfer by code or QR
apiRouter.get('/omnichannel/cart-transfer/:code', (req: Request, res: Response) => {
  const rawCode = req.params.code.trim();
  const cleanCode = rawCode.startsWith('POS_CART:') ? rawCode.split(':')[1] : rawCode;

  const transfer = db.omnichannelCartTransfers.find(
    t => t.transferCode.toUpperCase() === cleanCode.toUpperCase() || t.cartId === cleanCode
  );

  if (!transfer) {
    return res.status(404).json({ error: `Cart transfer "${cleanCode}" not found or expired` });
  }

  if (transfer.claimed) {
    return res.status(400).json({
      error: `Cart transfer ${transfer.transferCode} was already claimed by ${transfer.claimedByRegister || 'another register'}`,
      transfer,
    });
  }

  if (new Date() > new Date(transfer.expiresAt)) {
    return res.status(400).json({ error: 'Cart transfer session has expired' });
  }

  res.json({ success: true, transfer });
});

// POST /api/omnichannel/cart-transfer/:code/claim - Claim cart into current register
apiRouter.post('/omnichannel/cart-transfer/:code/claim', (req: Request, res: Response) => {
  const rawCode = req.params.code.trim();
  const cleanCode = rawCode.startsWith('POS_CART:') ? rawCode.split(':')[1] : rawCode;
  const { registerId = 'reg-1' } = req.body;

  const transfer = db.omnichannelCartTransfers.find(
    t => t.transferCode.toUpperCase() === cleanCode.toUpperCase() || t.cartId === cleanCode
  );

  if (!transfer) {
    return res.status(404).json({ error: `Cart transfer "${cleanCode}" not found` });
  }

  if (transfer.claimed) {
    return res.status(400).json({ error: 'Cart transfer has already been claimed' });
  }

  transfer.claimed = true;
  transfer.claimedAt = new Date().toISOString();
  transfer.claimedByRegister = registerId;

  res.json({ success: true, transfer, message: `Cart ${transfer.transferCode} imported into ${registerId}` });
});

// GET /api/bundles - List product bundles (US-017, US-018)
apiRouter.get('/bundles', (req: Request, res: Response) => {
  res.json({ bundles: db.productBundles.filter(b => b.active) });
});

// GET /api/substitutions - List substitution rules (US-015, US-016)
apiRouter.get('/substitutions', (req: Request, res: Response) => {
  const { productId } = req.query;
  let subs = [...db.productSubstitutionRules];
  if (productId) {
    subs = subs.filter(s => s.originalProductId === productId);
  }
  res.json({ substitutions: subs });
});

// GET /api/digital-twin - Get Digital Twin store floor & shelf positions (US-019, US-020)
apiRouter.get('/digital-twin', (req: Request, res: Response) => {
  res.json({ shelfPositions: db.digitalTwinLayout });
});

// ====================================================
// PAYMENT FALLBACK SYSTEM (PAY-001 TO PAY-028)
// ====================================================

// GET /api/payments/terminal-health - PAY-014: Get terminal status
apiRouter.get('/payments/terminal-health', (req: Request, res: Response) => {
  res.json(paymentFallbackService.getTerminalHealth());
});

// POST /api/payments/terminal-health/simulate - PAY-014: Simulate hardware failure or online
apiRouter.post('/payments/terminal-health/simulate', (req: Request, res: Response) => {
  const { status } = req.body;
  if (!['online', 'offline', 'chip_reader_error', 'timeout'].includes(status)) {
    return res.status(400).json({ error: 'Invalid terminal status' });
  }
  const updated = paymentFallbackService.setTerminalHealth(status);
  res.json({ success: true, terminalHealth: updated });
});

// POST /api/payments/session/create - PAY-004, PAY-006, PAY-008, PAY-009, PAY-010: Create unique short-lived session
apiRouter.post('/payments/session/create', (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  const { orderNumber, amount, method, mode, fallbackReason, registerId, orderPayload } = req.body;

  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ error: 'A valid positive amount is required for payment session' });
  }

  // PAY-008: Strict separation of Customer QR vs Employee Mobile QR
  const targetMode = mode === 'employee' ? 'employee' : 'customer';

  const session = paymentFallbackService.createSession({
    orderNumber: orderNumber || `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
    amount: Number(amount),
    method: method || (targetMode === 'customer' ? 'customer_qr' : 'tap_to_pay_phone'),
    mode: targetMode,
    registerId: registerId || 'Register #1',
    cashierId: currentUser.id,
    cashierName: currentUser.name,
    fallbackReason,
    orderPayload,
  });

  // Base URL for QR links
  const baseUrl = `${req.protocol}://${req.get('host') || 'localhost:3000'}`;
  const qrUrl = targetMode === 'customer'
    ? `${baseUrl}/?view=pay-customer&token=${session.opaqueToken}`
    : `${baseUrl}/?view=pay-employee&token=${session.opaqueToken}`;

  res.status(201).json({
    success: true,
    session,
    qrUrl,
  });
});

// GET /api/payments/session/:idOrToken - PAY-011: Live polling status lookup
apiRouter.get('/payments/session/:idOrToken', (req: Request, res: Response) => {
  const session = paymentFallbackService.getSession(req.params.idOrToken);
  if (!session) {
    return res.status(404).json({ error: 'Payment session not found or expired' });
  }
  res.json({ success: true, session });
});

// POST /api/payments/session/:idOrToken/connect - PAY-011: Step 2: Customer or store phone opens page
apiRouter.post('/payments/session/:idOrToken/connect', (req: Request, res: Response) => {
  const session = paymentFallbackService.connectSession(req.params.idOrToken);
  if (!session) {
    return res.status(404).json({ error: 'Payment session not found' });
  }
  res.json({ success: true, session });
});

// POST /api/payments/session/:idOrToken/start-entry - PAY-011: Step 3: Customer typing / tapping
apiRouter.post('/payments/session/:idOrToken/start-entry', (req: Request, res: Response) => {
  const session = paymentFallbackService.startEntrySession(req.params.idOrToken);
  if (!session) {
    return res.status(404).json({ error: 'Payment session not found' });
  }
  res.json({ success: true, session });
});

// POST /api/payments/session/:sessionId/authorize - PAY-012, PAY-013, PAY-015, PAY-019, PAY-020, PAY-021, PAY-024
apiRouter.post('/payments/session/:sessionId/authorize', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const {
    idempotencyKey,
    cardBrand,
    cardLast4,
    entryMode,
    postalCode,
    simulateFailure,
  } = req.body;

  try {
    const updatedSession = await paymentFallbackService.authorizeSession({
      sessionId,
      idempotencyKey: idempotencyKey || `idemp-${Date.now()}`,
      cardBrand,
      cardLast4,
      entryMode,
      postalCode,
      simulateFailure,
    });

    res.json({
      success: updatedSession.status === 'payment_complete' || updatedSession.status === 'authorized',
      session: updatedSession,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Payment authorization failed' });
  }
}));

// POST /api/payments/session/:sessionId/cancel - PAY-023: Cashier cancels mobile session
apiRouter.post('/payments/session/:sessionId/cancel', (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  try {
    const cancelled = paymentFallbackService.cancelSession(req.params.sessionId, currentUser.name);
    res.json({ success: true, session: cancelled });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Could not cancel session' });
  }
});

// POST /api/payments/manual-entry - PAY-002, PAY-016: Cashier manual card entry
apiRouter.post('/payments/manual-entry', (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  const {
    amount,
    cardBrand = 'Visa',
    cardLast4 = '4242',
    postalCode,
    reason = 'Card chip damaged / unreadable',
    managerPin,
    orderNumber,
  } = req.body;

  // PAY-016: Check permission settings
  const permission = db.settings.cashierManualCardEntry || 'manager_required';
  if (permission === 'disabled') {
    return res.status(403).json({ error: 'Cashier manual card entry is disabled by store policy' });
  }
  if (permission === 'manager_required') {
    if (currentUser.role !== 'Manager' && currentUser.role !== 'Admin') {
      if (managerPin !== '5555' && managerPin !== '9999') {
        return res.status(401).json({ error: 'Manager PIN approval required for manual card entry' });
      }
    }
  }

  // PAY-002, PAY-019, PAY-020: POS and server NEVER store CVV or full card number!
  const processorTxId = `ch_keyed_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const authCode = `APX-${Math.floor(100000 + Math.random() * 900000)}`;

  // Log audit entry (PAY-028)
  paymentFallbackService.recordAudit({
    orderNumber: orderNumber || `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
    paymentAttemptId: `man-${Date.now()}`,
    store: '377 Spirits #01 - Granbury',
    register: 'Register #1',
    employeeId: currentUser.id,
    employeeName: currentUser.name,
    selectedMethod: 'cashier_manual',
    processorTxId,
    amount: Number(amount),
    result: 'authorized',
    deviceSessionRef: `Manual Keyed Entry (${cardBrand} •••• ${cardLast4})`,
    reasonForFallback: reason,
  });

  res.json({
    success: true,
    paymentResult: {
      transactionId: processorTxId,
      token: `tok_keyed_${Math.random().toString(36).substring(2, 10)}`,
      brand: cardBrand,
      last4: cardLast4,
      authCode,
      capturedAt: new Date().toISOString(),
      entryMode: 'cashier_manual',
      postalCodeVerified: Boolean(postalCode),
    },
  });
});

// GET /api/payments/audit-log - PAY-028: Audit log
apiRouter.get('/payments/audit-log', (req: Request, res: Response) => {
  res.json({ auditLogs: paymentFallbackService.getAuditLogs() });
});

