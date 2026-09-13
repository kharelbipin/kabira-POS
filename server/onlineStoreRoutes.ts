import { Router, Request, Response } from 'express';
import { db } from './db.js';
import {
  OnlineStoreConfig,
  OnlineProductSettings,
  OnlineOrder,
  OnlineOrderItem,
  OnlineCoupon,
  StoreLocation,
  Order,
  User,
  InventoryAdjustment,
} from '../src/types.js';

export const onlineStoreRouter = Router();

// Store Configuration State
let currentStoreConfig: OnlineStoreConfig = {
  id: 'web-cfg-377',
  businessId: 'biz-377-spirits',
  storeId: 'store-granbury-01',
  websiteStatus: 'live',
  subdomain: '377spirits.yourpos.com',
  customDomain: 'www.377spirits.com',
  hasSsl: true,
  sslStatus: 'active',
  storeName: '377 Spirits & Fine Wine',
  tagline: 'Granbury’s Premier Destination for Rare Bourbons, Craft Spirits & Fine Wine',
  description: 'Shop Texas’ finest collection of allocated whiskeys, premium tequilas, craft beers, and sommelier-selected wines. Fast 20-minute curbside pickup & local Granbury delivery.',
  theme: 'liquor_store',
  primaryColor: '#C5A059',
  accentColor: '#121212',
  logoUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&q=80',
  heroBannerUrl: 'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=1600&q=80',
  announcementBar: '🥃 Fall Rare Bourbon Drop Live! | Free 20-Min In-Store Pickup | 21+ Valid ID Required at Pickup',
  showAnnouncement: true,
  phone: '(817) 573-3770',
  email: 'orders@377spirits.com',
  address: '377 E Highway 377, Granbury, TX 76048',
  businessHours: 'Mon - Sat: 10:00 AM - 9:00 PM | Sunday: 12:00 PM - 6:00 PM',
  enableInStorePickup: true,
  pickupPrepTimeMinutes: 20,
  pickupInstructions: 'Pull into designated Curbside spots #1-4 outside the main entrance or walk to the counter. Present matching 21+ government photo ID and original payment card.',
  enableLocalDelivery: true,
  deliveryRadiusMiles: 15,
  deliveryFee: 4.99,
  freeDeliveryThreshold: 75.00,
  minDeliveryOrder: 25.00,
  ageGateRequired: true,
  autoPublishNewProducts: true,
  defaultSafetyStock: 1,
  hideOutOfStock: false,
  publishedVersion: 12,
  lastPublishedAt: '2026-09-08T14:30:00Z',
  createdAt: '2026-01-10T10:00:00Z',
  updatedAt: '2026-09-08T14:30:00Z',
};

let previousStoreConfig: OnlineStoreConfig | null = null;

// Product-level online overrides
const productOverrides: Map<string, OnlineProductSettings> = new Map();

// Multi-location definitions (WEB-045)
export const storeLocations: StoreLocation[] = [
  {
    id: 'loc-granbury',
    name: '377 Spirits - Granbury Main Flagship',
    address: '377 E Highway 377',
    city: 'Granbury',
    state: 'TX',
    zip: '76048',
    phone: '(817) 573-3770',
    isCurrentLocation: true,
    pickupAvailable: true,
    deliveryAvailable: true,
  },
  {
    id: 'loc-fortworth',
    name: '377 Spirits Express - Fort Worth',
    address: '4801 Camp Bowie Blvd',
    city: 'Fort Worth',
    state: 'TX',
    zip: '76107',
    phone: '(817) 731-8900',
    isCurrentLocation: false,
    pickupAvailable: true,
    deliveryAvailable: false,
  },
  {
    id: 'loc-dallas',
    name: '377 Spirits Reserve - Dallas',
    address: '3900 Oak Lawn Ave',
    city: 'Dallas',
    state: 'TX',
    zip: '75219',
    phone: '(214) 520-2244',
    isCurrentLocation: false,
    pickupAvailable: true,
    deliveryAvailable: true,
  },
];

// Seed Online Coupons
export const onlineCoupons: OnlineCoupon[] = [
  {
    id: 'cpn-1',
    code: 'WELCOME10',
    discountType: 'percentage',
    value: 10,
    minOrderAmount: 30,
    maxDiscountAmount: 20,
    active: true,
    description: '10% off your first online order (min $30)',
    usageCount: 42,
  },
  {
    id: 'cpn-2',
    code: 'SPIRITS5',
    discountType: 'fixed_amount',
    value: 5,
    minOrderAmount: 40,
    active: true,
    description: '$5.00 off any order over $40',
    usageCount: 88,
  },
  {
    id: 'cpn-3',
    code: 'FREEPICKUP',
    discountType: 'fixed_amount',
    value: 4.99,
    minOrderAmount: 20,
    active: true,
    description: 'Complimentary Curbside Priority Prep',
    usageCount: 19,
  },
];

// Seed Online Orders
export const onlineOrders: OnlineOrder[] = [
  {
    id: 'ord-web-1040',
    orderNumber: 'WEB-1040',
    source: 'web',
    status: 'ready_for_pickup',
    customerId: 'cust-1',
    customerName: 'Marcus Vance',
    customerEmail: 'm.vance@texasbourbon.org',
    customerPhone: '(817) 910-3841',
    isGuest: false,
    fulfillmentType: 'pickup',
    pickupTimeSlot: 'Today, 4:30 PM - 5:00 PM',
    items: [
      {
        productId: 'prod-1',
        productName: 'Buffalo Trace Kentucky Straight Bourbon',
        sku: 'BT-750-01',
        size: '750ml',
        quantity: 2,
        unitPrice: 32.99,
        totalPrice: 65.98,
        imageUrl: 'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=300&q=80',
      },
      {
        productId: 'prod-4',
        productName: 'Casamigos Reposado Tequila',
        sku: 'CSM-REP-750',
        size: '750ml',
        quantity: 1,
        unitPrice: 56.99,
        totalPrice: 56.99,
        imageUrl: 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&q=80',
      },
    ],
    subtotal: 122.97,
    deliveryFee: 0,
    discountAmount: 10.00,
    promoCode: 'WELCOME10',
    taxAmount: 9.32,
    tipAmount: 5.00,
    totalAmount: 127.29,
    paymentStatus: 'paid',
    paymentMethod: 'apple_pay',
    ageVerified21: true,
    notes: 'Please double bag if possible. Curbside Spot #2.',
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: 'ord-web-1041',
    orderNumber: 'WEB-1041',
    source: 'web',
    status: 'preparing',
    customerId: 'cust-2',
    customerName: 'Eleanor Higgins',
    customerEmail: 'eleanor.h@granburywinelovers.com',
    customerPhone: '(817) 555-8921',
    isGuest: true,
    fulfillmentType: 'delivery',
    deliveryAddress: {
      street: '1420 Waters Edge Dr',
      city: 'Granbury',
      state: 'TX',
      zip: '76048',
      deliveryInstructions: 'Leave on front covered porch after ring. Adult will sign and present 21+ ID.',
    },
    items: [
      {
        productId: 'prod-2',
        productName: 'Eagle Rare 10 Year Bourbon',
        sku: 'ER-10-750',
        size: '750ml',
        quantity: 1,
        unitPrice: 48.99,
        totalPrice: 48.99,
        imageUrl: 'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=300&q=80',
      },
    ],
    subtotal: 48.99,
    deliveryFee: 4.99,
    discountAmount: 0,
    taxAmount: 4.45,
    tipAmount: 6.00,
    totalAmount: 64.43,
    paymentStatus: 'paid',
    paymentMethod: 'card',
    cardBrand: 'Visa',
    cardLast4: '4242',
    ageVerified21: true,
    notes: 'Birthday gift delivery.',
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  {
    id: 'ord-web-1042',
    orderNumber: 'WEB-1042',
    source: 'web',
    status: 'completed',
    customerId: 'cust-3',
    customerName: 'Robert Sterling',
    customerEmail: 'rsterling@granbury.net',
    customerPhone: '(817) 441-2099',
    isGuest: false,
    fulfillmentType: 'pickup',
    pickupTimeSlot: 'Today, 2:00 PM',
    items: [
      {
        productId: 'prod-3',
        productName: 'Woodford Reserve Kentucky Derby Edition',
        sku: 'WR-DERBY-1L',
        size: '1L',
        quantity: 1,
        unitPrice: 59.99,
        totalPrice: 59.99,
      },
    ],
    subtotal: 59.99,
    deliveryFee: 0,
    discountAmount: 5.00,
    promoCode: 'SPIRITS5',
    taxAmount: 4.54,
    tipAmount: 0,
    totalAmount: 59.53,
    paymentStatus: 'paid',
    paymentMethod: 'card',
    cardBrand: 'Mastercard',
    cardLast4: '8819',
    ageVerified21: true,
    ageVerifiedAtPickupOrDelivery: true,
    verifiedByName: 'Elena Rostova (Cashier)',
    createdAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
  },
];

function getAuthUser(req: Request): User {
  const userId = (req.headers['x-user-id'] as string) || 'usr-1';
  const user = db.users.find(u => u.id === userId && u.active);
  return user || db.users[0];
}

// ----------------------------------------------------
// WEB CONFIGURATION (WEB-001, WEB-002, WEB-003, WEB-051)
// ----------------------------------------------------

// GET /api/online-store/config
onlineStoreRouter.get('/online-store/config', (req: Request, res: Response) => {
  res.json({
    config: currentStoreConfig,
    canRollback: previousStoreConfig !== null,
    previousVersion: previousStoreConfig?.publishedVersion || null,
  });
});

// PUT /api/online-store/config - Save configuration updates (Draft or Staged)
onlineStoreRouter.put('/online-store/config', (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  const updates = req.body;

  previousStoreConfig = { ...currentStoreConfig };

  currentStoreConfig = {
    ...currentStoreConfig,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  db.addAudit(
    currentUser.id,
    currentUser.name,
    currentUser.role,
    'ONLINE_STORE_CONFIG_UPDATE',
    'settings',
    currentStoreConfig.id,
    `Updated online store configuration (Theme: ${currentStoreConfig.theme}, Status: ${currentStoreConfig.websiteStatus})`
  );

  res.json({
    success: true,
    config: currentStoreConfig,
    message: 'Online store configuration updated successfully',
  });
});

// POST /api/online-store/publish - Publish website changes to Live status (WEB-001, WEB-002)
onlineStoreRouter.post('/online-store/publish', (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);

  previousStoreConfig = { ...currentStoreConfig };

  currentStoreConfig.websiteStatus = 'live';
  currentStoreConfig.publishedVersion += 1;
  currentStoreConfig.lastPublishedAt = new Date().toISOString();
  currentStoreConfig.updatedAt = new Date().toISOString();

  db.addAudit(
    currentUser.id,
    currentUser.name,
    currentUser.role,
    'ONLINE_STORE_PUBLISH',
    'settings',
    currentStoreConfig.id,
    `Published Online Store v${currentStoreConfig.publishedVersion} to ${currentStoreConfig.customDomain || currentStoreConfig.subdomain}`
  );

  res.json({
    success: true,
    message: `Website published live successfully! Version ${currentStoreConfig.publishedVersion}`,
    config: currentStoreConfig,
    liveUrl: `https://${currentStoreConfig.customDomain || currentStoreConfig.subdomain}`,
  });
});

// POST /api/online-store/rollback - Roll back to previous website version (WEB-054)
onlineStoreRouter.post('/online-store/rollback', (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);

  if (!previousStoreConfig) {
    return res.status(400).json({ error: 'No previous published version found to restore' });
  }

  const rolledBackConfig = { ...previousStoreConfig };
  previousStoreConfig = { ...currentStoreConfig };
  currentStoreConfig = rolledBackConfig;
  currentStoreConfig.updatedAt = new Date().toISOString();

  db.addAudit(
    currentUser.id,
    currentUser.name,
    currentUser.role,
    'ONLINE_STORE_ROLLBACK',
    'settings',
    currentStoreConfig.id,
    `Rolled back Online Store to version ${currentStoreConfig.publishedVersion}`
  );

  res.json({
    success: true,
    message: `Successfully rolled back to version ${currentStoreConfig.publishedVersion}`,
    config: currentStoreConfig,
  });
});

// ----------------------------------------------------
// PRODUCTS & SHARED INVENTORY (WEB-004 to WEB-016)
// ----------------------------------------------------

// GET /api/online-store/products - List products enriched with online availability & calculated stock
onlineStoreRouter.get('/online-store/products', (req: Request, res: Response) => {
  const { category, brand, search, inStockOnly, onlyOnline } = req.query;

  let products = db.products.filter(p => p.active);

  if (onlyOnline === 'true') {
    products = products.filter(p => {
      const override = productOverrides.get(p.id);
      return override ? override.sellOnline : true; // Default true if active
    });
  }

  if (category) {
    products = products.filter(p => p.categoryId === category || p.categoryName.toLowerCase() === (category as string).toLowerCase());
  }

  if (brand) {
    products = products.filter(p => p.brandId === brand || p.brandName.toLowerCase() === (brand as string).toLowerCase());
  }

  if (search) {
    const q = (search as string).toLowerCase();
    products = products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.brandName.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.barcode.includes(q)
    );
  }

  const enriched = products.map(p => {
    const override = productOverrides.get(p.id);
    const safetyStock = override?.safetyStock !== undefined ? override.safetyStock : currentStoreConfig.defaultSafetyStock;
    const onlineAvailableQuantity = Math.max(0, p.stockQuantity - safetyStock);
    const effectiveOnlinePrice = override?.onlinePrice !== undefined ? override.onlinePrice : p.price;
    const isSellOnline = override ? override.sellOnline : true;

    return {
      ...p,
      onlineSettings: {
        sellOnline: isSellOnline,
        sellInStore: override ? override.sellInStore : true,
        pickupAvailable: override ? override.pickupAvailable : true,
        deliveryAvailable: override ? override.deliveryAvailable : true,
        onlinePrice: effectiveOnlinePrice,
        onlineSalePrice: override?.onlineSalePrice,
        safetyStock,
        onlineAvailableQuantity,
        isAllocated: override?.isAllocated || false,
        isFeatured: override?.isFeatured || false,
        onlineDescription: override?.onlineDescription || p.description,
      },
    };
  });

  if (inStockOnly === 'true') {
    return res.json({ products: enriched.filter(p => p.onlineSettings.onlineAvailableQuantity > 0) });
  }

  res.json({
    products: enriched,
    totalCount: enriched.length,
    onlineCount: enriched.filter(p => p.onlineSettings.sellOnline).length,
  });
});

// PUT /api/online-store/products/:id - Update product online settings
onlineStoreRouter.put('/online-store/products/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const product = db.products.find(p => p.id === id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const existing = productOverrides.get(id) || {
    productId: id,
    sellOnline: true,
    sellInStore: true,
    pickupAvailable: true,
    deliveryAvailable: true,
    safetyStock: currentStoreConfig.defaultSafetyStock,
  };

  const updated: OnlineProductSettings = {
    ...existing,
    ...req.body,
    productId: id,
    updatedAt: new Date().toISOString(),
  };

  productOverrides.set(id, updated);

  res.json({
    success: true,
    productSettings: updated,
    message: `Updated online visibility settings for ${product.name}`,
  });
});

// POST /api/online-store/products/bulk - Bulk toggle online availability
onlineStoreRouter.post('/online-store/products/bulk', (req: Request, res: Response) => {
  const { productIds, sellOnline, pickupAvailable, deliveryAvailable, safetyStock } = req.body;

  if (!Array.isArray(productIds)) {
    return res.status(400).json({ error: 'productIds must be an array' });
  }

  let count = 0;
  for (const id of productIds) {
    const product = db.products.find(p => p.id === id);
    if (product) {
      const existing = productOverrides.get(id) || {
        productId: id,
        sellOnline: true,
        sellInStore: true,
        pickupAvailable: true,
        deliveryAvailable: true,
        safetyStock: currentStoreConfig.defaultSafetyStock,
      };

      if (sellOnline !== undefined) existing.sellOnline = sellOnline;
      if (pickupAvailable !== undefined) existing.pickupAvailable = pickupAvailable;
      if (deliveryAvailable !== undefined) existing.deliveryAvailable = deliveryAvailable;
      if (safetyStock !== undefined) existing.safetyStock = safetyStock;

      productOverrides.set(id, existing);
      count++;
    }
  }

  res.json({
    success: true,
    updatedCount: count,
    message: `Updated online settings for ${count} products`,
  });
});

// ----------------------------------------------------
// ORDERS & FULFILLMENT (WEB-026 to WEB-033)
// ----------------------------------------------------

// GET /api/online-store/orders - List online orders
onlineStoreRouter.get('/online-store/orders', (req: Request, res: Response) => {
  const { status, fulfillmentType } = req.query;

  let list = [...onlineOrders];

  if (status && status !== 'all') {
    list = list.filter(o => o.status === status);
  }

  if (fulfillmentType && fulfillmentType !== 'all') {
    list = list.filter(o => o.fulfillmentType === fulfillmentType);
  }

  // Sort newest first
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({
    orders: list,
    counts: {
      all: onlineOrders.length,
      new: onlineOrders.filter(o => o.status === 'new').length,
      accepted: onlineOrders.filter(o => o.status === 'accepted').length,
      preparing: onlineOrders.filter(o => o.status === 'preparing').length,
      ready_for_pickup: onlineOrders.filter(o => o.status === 'ready_for_pickup').length,
      out_for_delivery: onlineOrders.filter(o => o.status === 'out_for_delivery').length,
      completed: onlineOrders.filter(o => o.status === 'completed').length,
    },
  });
});

// POST /api/online-store/orders - Place a new online order (WEB-020 to WEB-022, Real-time sync WEB-007)
onlineStoreRouter.post('/online-store/orders', (req: Request, res: Response) => {
  const {
    customerName,
    customerEmail,
    customerPhone,
    isGuest = false,
    fulfillmentType = 'pickup',
    pickupTimeSlot,
    deliveryAddress,
    items = [],
    promoCode,
    tipAmount = 0,
    paymentMethod = 'card',
    cardBrand = 'Visa',
    cardLast4 = '4242',
    notes,
    ageVerified21 = true,
  } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Order cart cannot be empty' });
  }

  if (!customerName || !customerPhone) {
    return res.status(400).json({ error: 'Customer name and phone are required for 21+ order notifications' });
  }

  if (!ageVerified21) {
    return res.status(400).json({ error: 'You must certify that you are 21 years of age or older' });
  }

  // Inventory Validation & Stock Reservation Check (WEB-043, WEB-044)
  const preparedItems: OnlineOrderItem[] = [];
  let subtotal = 0;

  for (const item of items) {
    const product = db.products.find(p => p.id === item.productId);
    if (!product) {
      return res.status(400).json({ error: `Product ${item.productName || item.productId} is no longer available` });
    }

    const override = productOverrides.get(product.id);
    const safetyStock = override?.safetyStock !== undefined ? override.safetyStock : currentStoreConfig.defaultSafetyStock;
    const available = Math.max(0, product.stockQuantity - safetyStock);

    if (item.quantity > available) {
      return res.status(400).json({
        error: `Insufficient stock for "${product.name}". Available for online order: ${available} units.`,
        productId: product.id,
        availableQuantity: available,
      });
    }

    const unitPrice = override?.onlinePrice !== undefined ? override.onlinePrice : product.price;
    const totalPrice = Math.round(unitPrice * item.quantity * 100) / 100;

    preparedItems.push({
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      size: product.size,
      quantity: item.quantity,
      unitPrice,
      totalPrice,
      imageUrl: product.imageUrl,
    });

    subtotal += totalPrice;
  }

  // Delivery Fee Calculation
  let deliveryFee = 0;
  if (fulfillmentType === 'delivery') {
    if (subtotal < currentStoreConfig.minDeliveryOrder) {
      return res.status(400).json({
        error: `Minimum order for local Granbury delivery is $${currentStoreConfig.minDeliveryOrder.toFixed(2)}`,
      });
    }
    deliveryFee = subtotal >= currentStoreConfig.freeDeliveryThreshold ? 0 : currentStoreConfig.deliveryFee;
  }

  // Coupon Discount Application
  let discountAmount = 0;
  if (promoCode) {
    const coupon = onlineCoupons.find(c => c.code.toUpperCase() === promoCode.toUpperCase() && c.active);
    if (coupon) {
      if (!coupon.minOrderAmount || subtotal >= coupon.minOrderAmount) {
        if (coupon.discountType === 'percentage') {
          discountAmount = (subtotal * coupon.value) / 100;
          if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
            discountAmount = coupon.maxDiscountAmount;
          }
        } else {
          discountAmount = coupon.value;
        }
        discountAmount = Math.min(discountAmount, subtotal);
        coupon.usageCount += 1;
      }
    }
  }

  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const taxRate = 0.0825; // Texas 8.25% Sales Tax
  const taxAmount = Math.round(discountedSubtotal * taxRate * 100) / 100;
  const numTip = Number(tipAmount) || 0;
  const totalAmount = Math.round((discountedSubtotal + deliveryFee + taxAmount + numTip) * 100) / 100;

  const orderNum = `WEB-${1040 + onlineOrders.length + 1}`;
  const now = new Date().toISOString();

  // ATOMIC STOCK DECREMENT (WEB-007: Real-time inventory sync)
  for (const item of preparedItems) {
    const product = db.products.find(p => p.id === item.productId);
    if (product) {
      const oldQty = product.stockQuantity;
      product.stockQuantity = Math.max(0, product.stockQuantity - item.quantity);
      product.updatedAt = now;

      // Add inventory adjustment record
      const adj: InventoryAdjustment = {
        id: `adj-${Date.now()}-${item.productId}`,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        oldQuantity: oldQty,
        newQuantity: product.stockQuantity,
        changeAmount: -item.quantity,
        type: 'sale',
        reason: `Online Order #${orderNum}`,
        userId: 'system-web',
        userName: 'Online Web Store',
        createdAt: now,
      };
      db.inventoryAdjustments.unshift(adj);

      // US-004: Centralized Immutable Inventory Ledger for online orders
      db.recordLedgerMovement(
        product.id,
        'web',
        'system-web',
        'Online Web Store',
        -item.quantity,
        'web_order_fulfill',
        orderNum,
        `Online web order placement (${fulfillmentType.toUpperCase()})`
      );
    }
  }

  // Create POS Order counterpart so cashier sees it in POS history
  const posOrderId = `ord-pos-web-${Date.now()}`;
  const posCounterpart: Order = {
    id: posOrderId,
    orderNumber: orderNum,
    cashierId: 'usr-web',
    cashierName: 'Online Storefront',
    items: preparedItems.map(i => {
      const prod = db.products.find(p => p.id === i.productId)!;
      return {
        product: prod,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discountAmount: 0,
        lineTotal: i.totalPrice,
      };
    }),
    subtotal,
    discountTotal: discountAmount,
    taxTotal: taxAmount,
    grandTotal: totalAmount,
    status: 'completed',
    payment: {
      method: 'card',
      amount: totalAmount,
      cardBrand: cardBrand || 'Visa',
      cardLast4: cardLast4 || '4242',
      authCode: `AUTH-WEB-${Date.now().toString().slice(-6)}`,
    },
    createdAt: now,
    updatedAt: now,
  };
  db.orders.unshift(posCounterpart);

  const newOnlineOrder: OnlineOrder = {
    id: `ord-web-${Date.now()}`,
    orderNumber: orderNum,
    posOrderId,
    source: 'web',
    status: 'new',
    customerId: isGuest ? undefined : `cust-web-${Date.now().toString().slice(-4)}`,
    customerName,
    customerEmail,
    customerPhone,
    isGuest,
    fulfillmentType,
    pickupTimeSlot: fulfillmentType === 'pickup' ? (pickupTimeSlot || 'ASAP (approx. 20 mins)') : undefined,
    deliveryAddress: fulfillmentType === 'delivery' ? deliveryAddress : undefined,
    items: preparedItems,
    subtotal,
    deliveryFee,
    discountAmount,
    promoCode,
    taxAmount,
    tipAmount: numTip,
    totalAmount,
    paymentStatus: 'paid',
    paymentMethod,
    cardBrand,
    cardLast4,
    ageVerified21: true,
    notes,
    createdAt: now,
    updatedAt: now,
  };

  onlineOrders.unshift(newOnlineOrder);

  // Audit log
  db.addAudit(
    'system-web',
    customerName,
    'Cashier',
    'ONLINE_ORDER_PLACED',
    'order',
    newOnlineOrder.id,
    `New Web Order ${orderNum} placed: $${totalAmount.toFixed(2)} (${fulfillmentType.toUpperCase()})`
  );

  res.status(201).json({
    success: true,
    message: `Order #${orderNum} placed successfully!`,
    order: newOnlineOrder,
  });
});

// PATCH /api/online-store/orders/:id/status - Advance order status in fulfillment queue
onlineStoreRouter.patch('/online-store/orders/:id/status', (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  const { id } = req.params;
  const { status, ageVerifiedAtPickupOrDelivery, notes } = req.body;

  const order = onlineOrders.find(o => o.id === id || o.orderNumber === id);
  if (!order) {
    return res.status(404).json({ error: 'Online order not found' });
  }

  const oldStatus = order.status;
  order.status = status;
  order.updatedAt = new Date().toISOString();

  if (ageVerifiedAtPickupOrDelivery !== undefined) {
    order.ageVerifiedAtPickupOrDelivery = ageVerifiedAtPickupOrDelivery;
    order.verifiedById = currentUser.id;
    order.verifiedByName = currentUser.name;
  }

  if (notes) {
    order.notes = (order.notes ? `${order.notes}\n` : '') + notes;
  }

  // If order is cancelled, return stock to inventory!
  if ((status === 'cancelled' || status === 'refunded') && oldStatus !== 'cancelled' && oldStatus !== 'refunded') {
    for (const item of order.items) {
      const prod = db.products.find(p => p.id === item.productId);
      if (prod) {
        prod.stockQuantity += item.quantity;
        const adj: InventoryAdjustment = {
          id: `adj-restock-${Date.now()}-${item.productId}`,
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          oldQuantity: prod.stockQuantity - item.quantity,
          newQuantity: prod.stockQuantity,
          changeAmount: item.quantity,
          type: 'void_restore',
          reason: `Cancelled Online Order #${order.orderNumber}`,
          userId: currentUser.id,
          userName: currentUser.name,
          createdAt: new Date().toISOString(),
        };
        db.inventoryAdjustments.unshift(adj);

        // US-004 & US-006: Restore stock in ledger
        db.recordLedgerMovement(
          prod.id,
          'web',
          currentUser.id,
          currentUser.name,
          item.quantity,
          'web_order_cancel_release',
          order.orderNumber,
          `Cancelled Online Order #${order.orderNumber} stock release`
        );
      }
    }
  }

  db.addAudit(
    currentUser.id,
    currentUser.name,
    currentUser.role,
    'ONLINE_ORDER_STATUS_UPDATE',
    'order',
    order.id,
    `Updated Order ${order.orderNumber} status from ${oldStatus} to ${status}`
  );

  res.json({
    success: true,
    order,
    message: `Order #${order.orderNumber} updated to ${status.replace('_', ' ')}`,
  });
});

// ----------------------------------------------------
// COUPONS & DISCOUNTS (WEB-040, WEB-041)
// ----------------------------------------------------

onlineStoreRouter.get('/online-store/coupons', (req: Request, res: Response) => {
  res.json({ coupons: onlineCoupons });
});

onlineStoreRouter.post('/online-store/coupons', (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  const { code, discountType = 'percentage', value, minOrderAmount, description } = req.body;

  if (!code || !value) {
    return res.status(400).json({ error: 'Coupon code and discount value are required' });
  }

  const existing = onlineCoupons.find(c => c.code.toUpperCase() === code.toUpperCase());
  if (existing) {
    return res.status(400).json({ error: `Coupon code "${code}" already exists` });
  }

  const coupon: OnlineCoupon = {
    id: `cpn-${Date.now()}`,
    code: code.toUpperCase().trim(),
    discountType,
    value: Number(value),
    minOrderAmount: minOrderAmount ? Number(minOrderAmount) : undefined,
    active: true,
    description: description || `${value}${discountType === 'percentage' ? '%' : '$'} Off Promo`,
    usageCount: 0,
  };

  onlineCoupons.push(coupon);

  db.addAudit(
    currentUser.id,
    currentUser.name,
    currentUser.role,
    'COUPON_CREATE',
    'settings',
    coupon.id,
    `Created online coupon: ${coupon.code} (${coupon.value}${coupon.discountType === 'percentage' ? '%' : '$'} off)`
  );

  res.status(201).json({ success: true, coupon });
});

// ----------------------------------------------------
// LOCATIONS (WEB-045, WEB-046)
// ----------------------------------------------------

onlineStoreRouter.get('/online-store/locations', (req: Request, res: Response) => {
  res.json({ locations: storeLocations });
});

// ----------------------------------------------------
// OMNICHANNEL ANALYTICS (WEB-049, WEB-050)
// ----------------------------------------------------

onlineStoreRouter.get('/online-store/analytics', (req: Request, res: Response) => {
  const totalWebRevenue = onlineOrders
    .filter(o => o.paymentStatus === 'paid' && o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const completedOrders = onlineOrders.filter(o => o.status === 'completed');
  const activeOrders = onlineOrders.filter(o => !['completed', 'cancelled', 'refunded'].includes(o.status));

  const pickupOrders = onlineOrders.filter(o => o.fulfillmentType === 'pickup');
  const deliveryOrders = onlineOrders.filter(o => o.fulfillmentType === 'delivery');

  const avgOrderValue = onlineOrders.length > 0 ? totalWebRevenue / Math.max(1, onlineOrders.length) : 0;

  // POS Store In-Person Revenue comparison
  const inStoreOrders = db.orders.filter(o => !o.id.includes('web'));
  const inStoreRevenue = inStoreOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);

  res.json({
    analytics: {
      totalWebRevenue: Math.round(totalWebRevenue * 100) / 100,
      totalInStoreRevenue: Math.round(inStoreRevenue * 100) / 100,
      combinedRevenue: Math.round((totalWebRevenue + inStoreRevenue) * 100) / 100,
      totalWebOrders: onlineOrders.length,
      activeWebOrders: activeOrders.length,
      completedWebOrders: completedOrders.length,
      averageOrderValue: Math.round(avgOrderValue * 100) / 100,
      fulfillmentSplit: {
        pickupCount: pickupOrders.length,
        deliveryCount: deliveryOrders.length,
        pickupPercentage: Math.round((pickupOrders.length / Math.max(1, onlineOrders.length)) * 100),
        deliveryPercentage: Math.round((deliveryOrders.length / Math.max(1, onlineOrders.length)) * 100),
      },
    },
  });
});
