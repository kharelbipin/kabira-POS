import fs from 'fs';
import path from 'path';
import {
  User,
  Category,
  Brand,
  Product,
  Order,
  HeldOrder,
  Customer,
  LoyaltyTransaction,
  InventoryAdjustment,
  AuditLog,
  StoreSettings,
  Promotion,
  PosDevice,
  Vendor,
  InvoiceLineItem,
  ScannedInvoice,
  InventoryReceivingTransaction,
  VendorProductMapping,
  InvoiceUploadSession,
  BarcodeReceivingSession,
  Shift,
  ShiftCashMovement,
  BankAccount,
  IssuedCheck,
  CheckIssuer,
  CheckFeeRule,
  CheckCashingTransaction,
  DepositBatch,
  CheckQrSession,
  InventoryLedgerEntry,
  InventoryReservation,
  OmnichannelCartTransfer,
  ProductBundle,
  ProductSubstitutionRule,
  DigitalTwinShelfPosition,
  ScanDataTransaction,
  ScanDataExportBatch,
} from '../src/types';

// In-Memory Database with Persistence for AI Studio Applet
class Database {
  // No production operator credentials are shipped in source.
  //
  // Existing installations keep the users already stored in
  // %LOCALAPPDATA%\KaBiRa POS\data\pos_database.json because loadFromDisk()
  // replaces this default array with the persisted users table.
  //
  // A brand-new installation starts with no users and is completed through
  // the first-run Admin setup flow exposed by the local API.
  users: User[] = [];


  categories: Category[] = [
    { id: 'cat-1', name: 'Whiskey & Bourbon', slug: 'whiskey', order: 1, active: true },
    { id: 'cat-2', name: 'Tequila & Mezcal', slug: 'tequila', order: 2, active: true },
    { id: 'cat-3', name: 'Vodka & Gin', slug: 'vodka-gin', order: 3, active: true },
    { id: 'cat-4', name: 'Wine & Champagne', slug: 'wine', order: 4, active: true },
    { id: 'cat-5', name: 'Beer & Seltzer', slug: 'beer', order: 5, active: true },
    { id: 'cat-6', name: 'Craft & Local', slug: 'craft-local', order: 6, active: true },
    { id: 'cat-7', name: 'Mixers', slug: 'mixers', order: 7, active: true },
    { id: 'cat-8', name: 'Accessories', slug: 'accessories', order: 8, active: true },
    { id: 'cat-9', name: 'Lotto', slug: 'lotto', order: 9, active: true },
    { id: 'cat-10', name: 'Gift Sets', slug: 'gift-sets', order: 10, active: true },
    { id: 'cat-11', name: 'Seasonal', slug: 'seasonal', order: 11, active: true },
    { id: 'cat-12', name: 'Staff Picks', slug: 'staff-picks', order: 12, active: true },
  ];

  brands: Brand[] = [
    { id: 'br-1', name: 'Woodford Reserve', country: 'United States', description: 'Premium Kentucky Straight Bourbon Whiskey', active: true },
    { id: 'br-2', name: 'Buffalo Trace Distillery', country: 'United States', description: 'Historic Frankfort Kentucky distillery', active: true },
    { id: 'br-3', name: 'Casamigos', country: 'Mexico', description: 'Small-batch ultra-premium 100% Blue Weber agave tequila', active: true },
    { id: 'br-4', name: 'Don Julio', country: 'Mexico', description: 'Pioneering luxury Jalisco Highlands tequila', active: true },
    { id: 'br-5', name: 'Grey Goose', country: 'France', description: 'Distilled using French winter wheat and Gensac spring water', active: true },
    { id: 'br-6', name: 'Hendrick’s', country: 'Scotland', description: 'Curious gin infused with rose petal and cucumber essence', active: true },
    { id: 'br-7', name: 'Caymus Vineyards', country: 'United States', description: 'Iconic Napa Valley Cabernet Sauvignon estate', active: true },
    { id: 'br-8', name: 'Veuve Clicquot', country: 'France', description: 'Prestigious Reims champagne house founded in 1772', active: true },
    { id: 'br-9', name: 'Sierra Nevada', country: 'United States', description: 'Pioneer craft brewery in Chico California', active: true },
  ];

  promotions: Promotion[] = [
    {
      id: 'promo-1',
      name: 'Weekend Bourbon Tasting Sale',
      code: 'BOURBON10',
      type: 'percentage',
      value: 10,
      startDate: '2026-01-01T00:00:00Z',
      endDate: '2026-12-31T23:59:59Z',
      active: true,
      targetType: 'category',
      targetId: 'cat-1',
      targetName: 'Whiskey & Bourbon',
      minSpend: 40,
      maxDiscount: 25,
      usageCount: 18,
    },
    {
      id: 'promo-2',
      name: '$5 Off Wine & Champagne Over $50',
      code: 'WINE5',
      type: 'fixed',
      value: 5,
      startDate: '2026-02-01T00:00:00Z',
      endDate: '2026-12-31T23:59:59Z',
      active: true,
      targetType: 'category',
      targetId: 'cat-4',
      targetName: 'Wine & Champagne',
      minSpend: 50,
      usageCount: 12,
    },
    {
      id: 'promo-3',
      name: 'Craft Beer 6-Pack Flash Promo',
      code: 'BEER15',
      type: 'percentage',
      value: 15,
      startDate: '2026-03-01T00:00:00Z',
      endDate: '2026-03-31T23:59:59Z',
      active: true,
      targetType: 'category',
      targetId: 'cat-5',
      targetName: 'Craft Beer & Cider',
      minSpend: 20,
      usageCount: 7,
    },
  ];

  deploymentPackages: any[] = [];
  registeredTerminals: any[] = [];

  devices: PosDevice[] = [
    {
      id: 'dev-1',
      name: 'Lane 1 Main Register',
      type: 'terminal',
      model: 'Elo Touch I-Series 22" 4K',
      connection: 'network',
      status: 'offline',
      ipAddress: '192.168.1.101',
      lastActive: new Date().toISOString(),
    },
    {
      id: 'dev-2',
      name: 'Front Counter Thermal Printer',
      type: 'printer',
      model: 'Epson TM-T88VII High-Speed',
      connection: 'network',
      status: 'offline',
      ipAddress: '192.168.1.120',
      paperWidth: '80mm',
      lastActive: new Date().toISOString(),
    },
    {
      id: 'dev-3',
      name: 'Counter Barcode Scanner',
      type: 'scanner',
      model: 'Zebra DS2208 2D Imager',
      connection: 'usb',
      status: 'offline',
      lastActive: new Date().toISOString(),
    },
    {
      id: 'dev-4',
      name: 'Mobile Floor Inventory Tablet',
      type: 'terminal',
      model: 'Apple iPad Pro 11" M4',
      connection: 'bluetooth',
      status: 'offline',
      lastActive: new Date(Date.now() - 3600000).toISOString(),
    },
  ];

  products: Product[] = [
    {
      id: 'prod-sample-012345678905',
      name: "Garrison Brothers Small Batch Texas Bourbon",
      sku: "GB-TX-750",
      barcode: "012345678905",
      categoryId: "cat-1",
      categoryName: "Whiskey & Bourbon",
      price: 89.99,
      cost: 54.00,
      taxRate: 0.0825,
      size: "750 mL",
      stockQuantity: 28,
      lowStockThreshold: 4,
      imageUrl: "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=500&auto=format&fit=crop&q=60",
      description: "Handcrafted Texas straight bourbon whiskey from Hye, TX. 94 Proof, aged in custom white American oak.",
      ageRestriction: 21,
      active: true,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: 'prod-1',
      name: "Woodford Reserve Double Oaked",
      sku: "WFD-DO-750",
      barcode: "080480015003",
      categoryId: "cat-1",
      categoryName: "Whiskey & Bourbon",
      price: 59.99,
      cost: 38.50,
      taxRate: 0.0825,
      size: "750 mL",
      stockQuantity: 24,
      lowStockThreshold: 6,
      imageUrl: "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=500&auto=format&fit=crop&q=60",
      description: "Rich Kentucky straight bourbon whiskey matured in separate charred oak barrels.",
      active: true,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: 'prod-2',
      name: "Jack Daniel's Old No. 7",
      sku: "JD-OLD7-750",
      barcode: "082184090442",
      categoryId: "cat-1",
      categoryName: "Whiskey & Bourbon",
      price: 24.99,
      cost: 16.00,
      taxRate: 0.0825,
      size: "750 mL",
      stockQuantity: 12,
      lowStockThreshold: 5,
      imageUrl: "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=500&auto=format&fit=crop&q=60",
      description: "Mellowed drop by drop through 10 feet of sugar maple charcoal, then matured in handcrafted barrels.",
      active: true,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: 'prod-3',
      name: "Blanton's Single Barrel",
      sku: "BLN-SB-750",
      barcode: "080244009235",
      categoryId: "cat-1",
      categoryName: "Whiskey & Bourbon",
      price: 129.99,
      cost: 58.00,
      taxRate: 0.0825,
      size: "750 mL",
      stockQuantity: 6,
      lowStockThreshold: 8,
      imageUrl: "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=500&auto=format&fit=crop&q=60",
      description: "The original single barrel bourbon whiskey, aged in the famous Warehouse H.",
      active: true,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: 'prod-4',
      name: "Maker's Mark Bourbon",
      sku: "MM-BRB-750",
      barcode: "085246500576",
      categoryId: "cat-1",
      categoryName: "Whiskey & Bourbon",
      price: 32.99,
      cost: 21.00,
      taxRate: 0.0825,
      size: "750 mL",
      stockQuantity: 8,
      lowStockThreshold: 5,
      imageUrl: "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=500&auto=format&fit=crop&q=60",
      description: "Handcrafted Kentucky straight bourbon whisky made with soft red winter wheat and sealed in red wax.",
      active: true,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: 'prod-5',
      name: "Casamigos Reposado Tequila",
      sku: "CSM-REP-750",
      barcode: "856724006028",
      categoryId: "cat-2",
      categoryName: "Tequila & Mezcal",
      price: 64.99,
      cost: 41.00,
      taxRate: 0.0825,
      size: "750 mL",
      stockQuantity: 17,
      lowStockThreshold: 5,
      imageUrl: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=60",
      description: "Aged for 7 months in premium American white oak barrels with hints of cocoa and caramel.",
      active: true,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: 'prod-6',
      name: "Don Julio 1942 Tequila",
      sku: "DJ-1942-750",
      barcode: "674545000332",
      categoryId: "cat-2",
      categoryName: "Tequila & Mezcal",
      price: 189.99,
      cost: 120.00,
      taxRate: 0.0825,
      size: "750 mL",
      stockQuantity: 9,
      lowStockThreshold: 4,
      imageUrl: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=500&auto=format&fit=crop&q=60",
      description: "Celebrated in exclusive cocktail bars, restaurants, and nightclubs, aged for at least two and a half years.",
      active: true,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: 'prod-7',
      name: "Grey Goose French Vodka",
      sku: "GG-VOD-1L",
      barcode: "080480280029",
      categoryId: "cat-3",
      categoryName: "Vodka & Gin",
      price: 38.99,
      cost: 24.50,
      taxRate: 0.0825,
      size: "1 Liter",
      stockQuantity: 15,
      lowStockThreshold: 8,
      imageUrl: "https://images.unsplash.com/photo-1598063412584-63795679df93?w=500&auto=format&fit=crop&q=60",
      description: "Distilled from finest French winter wheat and pure Gensac spring water.",
      active: true,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: 'prod-8',
      name: "Tito's Handmade Vodka",
      sku: "TIT-VOD-750",
      barcode: "619947000020",
      categoryId: "cat-3",
      categoryName: "Vodka & Gin",
      price: 22.99,
      cost: 14.50,
      taxRate: 0.0825,
      size: "750 mL",
      stockQuantity: 11,
      lowStockThreshold: 6,
      imageUrl: "https://images.unsplash.com/photo-1607622750671-6cd9a99eabd1?w=500&auto=format&fit=crop&q=60",
      description: "Produced in Austin, Texas in old-fashioned pot stills, naturally gluten-free.",
      active: true,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: 'prod-9',
      name: "Crown Royal Canadian Whisky",
      sku: "CR-ROY-750",
      barcode: "082000000109",
      categoryId: "cat-1",
      categoryName: "Whiskey & Bourbon",
      price: 29.99,
      cost: 19.00,
      taxRate: 0.0825,
      size: "750 mL",
      stockQuantity: 4,
      lowStockThreshold: 5,
      imageUrl: "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=500&auto=format&fit=crop&q=60",
      description: "Meticulously blended with 50 full-bodied whiskies aged to perfection.",
      active: true,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: 'prod-10',
      name: "Hennessy VS Cognac",
      sku: "HEN-VS-750",
      barcode: "081753816999",
      categoryId: "cat-1",
      categoryName: "Whiskey & Bourbon",
      price: 54.99,
      cost: 36.00,
      taxRate: 0.0825,
      size: "750 mL",
      stockQuantity: 19,
      lowStockThreshold: 6,
      imageUrl: "https://images.unsplash.com/photo-1560512823-829485b8bf24?w=500&auto=format&fit=crop&q=60",
      description: "A blend of some 40 eaux-de-vie from across the Cognac region, bold and fragrant.",
      active: true,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: 'prod-11',
      name: "Modelo Especial 12 Pack",
      sku: "MOD-ESP-12PK",
      barcode: "080660956801",
      categoryId: "cat-5",
      categoryName: "Beer & Seltzer",
      price: 18.99,
      cost: 12.50,
      taxRate: 0.0825,
      size: "12 Pack",
      stockQuantity: 27,
      lowStockThreshold: 10,
      imageUrl: "https://images.unsplash.com/photo-1608270546103-9d9361a4f0b2?w=500&auto=format&fit=crop&q=60",
      description: "Rich, full-flavored pilsner-style Mexican lager with a clean, crisp finish.",
      active: true,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: 'prod-12',
      name: "Jameson Irish Whiskey",
      sku: "JAM-IR-750",
      barcode: "080432500170",
      categoryId: "cat-1",
      categoryName: "Whiskey & Bourbon",
      price: 27.99,
      cost: 18.00,
      taxRate: 0.0825,
      size: "750 mL",
      stockQuantity: 13,
      lowStockThreshold: 5,
      imageUrl: "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=500&auto=format&fit=crop&q=60",
      description: "Triple-distilled, twice as smooth, perfectly balanced Irish whiskey.",
      active: true,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: 'prod-13',
      name: "Artisan Smoked Sea Salt Almonds",
      sku: "ART-ALM-8OZ",
      barcode: "748252019481",
      categoryId: "cat-7",
      categoryName: "Bar Snacks & Gourmet",
      price: 7.49,
      cost: 3.80,
      taxRate: 0.0825,
      size: "8 oz Tin",
      stockQuantity: 22,
      lowStockThreshold: 5,
      imageUrl: "https://images.unsplash.com/photo-1508736793122-f516e3ba5569?w=500&auto=format&fit=crop&q=60",
      description: "Slow-roasted California almonds with applewood smoked sea salt.",
      active: true,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: 'prod-14',
      name: "Dark Chocolate Bourbon Caramels",
      sku: "DC-CRM-6OZ",
      barcode: "793573104928",
      categoryId: "cat-7",
      categoryName: "Bar Snacks & Gourmet",
      price: 8.99,
      cost: 4.20,
      taxRate: 0.0825,
      size: "6 oz Box",
      stockQuantity: 2, // Low stock demo!
      lowStockThreshold: 6,
      imageUrl: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&auto=format&fit=crop&q=60",
      description: "Handcrafted dark chocolates infused with small-batch Kentucky bourbon.",
      active: true,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: 'prod-15',
      name: "Buffalo Trace",
      sku: "BT-KY-750",
      barcode: "080244009236",
      categoryId: "cat-1",
      categoryName: "Whiskey & Bourbon",
      price: 32.99,
      cost: 22.50,
      costPrice: 22.50,
      taxRate: 0.0825,
      size: "750ml",
      stockQuantity: 18,
      lowStockThreshold: 6,
      imageUrl: "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=500&auto=format&fit=crop&q=60",
      description: "Signature Buffalo Trace Kentucky straight bourbon crafted with corn, rye, and malted barley.",
      active: true,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: 'prod-16',
      name: "Weller Antique 107",
      sku: "WEL-ANT-750",
      barcode: "080244012075",
      categoryId: "cat-1",
      categoryName: "Whiskey & Bourbon",
      price: 59.99,
      cost: 41.25,
      costPrice: 41.25,
      taxRate: 0.0825,
      size: "750ml",
      stockQuantity: 8,
      lowStockThreshold: 4,
      imageUrl: "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=500&auto=format&fit=crop&q=60",
      description: "Old Weller Antique 107 proof wheated bourbon with full-bodied sweet and spicy flavors.",
      active: true,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: 'prod-17',
      name: "Eagle Rare 10 Year",
      sku: "ER-10Y-750",
      barcode: "080244010101",
      categoryId: "cat-1",
      categoryName: "Whiskey & Bourbon",
      price: 49.99,
      cost: 32.00,
      costPrice: 32.00,
      taxRate: 0.0825,
      size: "750ml",
      stockQuantity: 10,
      lowStockThreshold: 4,
      imageUrl: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=500&auto=format&fit=crop&q=60",
      description: "Masterfully crafted and carefully aged for no less than ten years, with aromas of toffee, hints of orange peel, herbs, honey, and leather.",
      active: true,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: 'prod-18',
      name: "Penelope Bourbon",
      sku: "PEN-BOU-750",
      barcode: "080244010202",
      categoryId: "cat-1",
      categoryName: "Whiskey & Bourbon",
      price: 64.99,
      cost: 42.00,
      costPrice: 42.00,
      taxRate: 0.0825,
      size: "750ml",
      stockQuantity: 12,
      lowStockThreshold: 5,
      imageUrl: "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=500&auto=format&fit=crop&q=60",
      description: "Four grain straight bourbon whiskey blended from three distinct mash bills, non-chill filtered with sweet toasted oak and dark fruit notes.",
      active: true,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: 'prod-19',
      name: "Baker's 13 Year",
      sku: "BAK-13Y-750",
      barcode: "080244010303",
      categoryId: "cat-1",
      categoryName: "Whiskey & Bourbon",
      price: 149.99,
      cost: 95.00,
      costPrice: 95.00,
      taxRate: 0.0825,
      size: "750ml",
      stockQuantity: 5,
      lowStockThreshold: 3,
      imageUrl: "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=500&auto=format&fit=crop&q=60",
      description: "Rare 13-year single barrel bourbon offering rich vanilla, toasted oak, dried fruit, and a long warming finish.",
      active: true,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
  ];

  customers: Customer[] = [];

  orders: Order[] = [];

  heldOrders: HeldOrder[] = [];

  inventoryAdjustments: InventoryAdjustment[] = [];

  auditLogs: AuditLog[] = [];

  loyaltyTransactions: LoyaltyTransaction[] = [];

  settings: StoreSettings = {
    storeName: 'KABIRA POS',
    tagline: 'Fine Liquors, Craft Spirits, Wine & Beer',
    phone: '(817) 555-0377',
    email: 'info@kabirapos.com',
    website: 'https://kabirapos.com',
    logoUrl: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=100&auto=format&fit=crop&q=80',
    address: 'Granbury, TX 76049',
    city: 'Granbury',
    state: 'TX',
    zip: '76049',
    cityStateZip: 'Granbury, TX 76049',
    taxId: 'TX-76-3770149',
    currency: 'USD',
    currencySymbol: '$',
    timezone: 'America/Chicago',
    defaultTaxRate: 0.0825,
    requireManagerDiscountAbove: 20, // Requires manager PIN if > 20%
    requireManagerToOpenDrawerNoSale: false, // Cashier opens drawer directly unless Admin enables approval
    customerDisplayFullscreen: true, // Locked borderless customer display by default; Admin can disable
    useOnScreenKeypad: true,
    showFixedKeypad: false,
    autoLaunchCustomerScreen: true,
    customerDisplayShowTotal: true,
    customerDisplayShowPrice: true,
    customerDisplayShowCustomerNumber: true,
    customerDisplayShowSaleNotes: false,
    alwaysShowShortcuts: false,
    webOrderNotificationsEnabled: false,
    hideTotalDetails: false,
    tasklistNotificationSound: 'beep',
    searchFontSizePx: 13,
    windowZoomPercent: 100,
    posScreenFontSizePx: 16,
    customerScreenFontSizePx: 16,
    customerScreenZoomPercent: 100,
    applicationVersionLabel: '1.0.0',
    electronAppVersionLabel: '1.0.30',
    allowedPaymentMethods: {
      cash: true,
      card: true,
      contactless: true,
      split: true,
    },
    enableCash: true,
    enableCard: true,
    enableContactless: true,
    enableSplit: true,
    paymentProvider: 'stripe_terminal',
    paymentTerminalIp: '192.168.1.150',
    paymentEnvironment: 'sandbox',
    receiptHeader: 'Thank you for visiting KABIRA POS!',
    receiptFooter: 'All sales final on allocated spirits. Returns within 14 days with unopened seal. Please enjoy responsibly.',
    scannerSound: true,
    // Customer Loyalty Program Settings
    loyaltyProgramEnabled: true,
    loyaltyPointsPerDollar: 1, // 1 point per $1 spent (configurable)
    loyaltyPointsPerDollarDiscount: 20, // 20 points = $1 discount ($0.05 per point, e.g. 100 pts = $5 off)
    loyaltyMinPointsToRedeem: 50, // Minimum 50 points required to redeem
    loyaltyMaxDiscountPercent: 50, // Up to 50% of order total can be discounted using points
    loyaltySignupBonusPoints: 50, // 50 bonus points upon signup
    // Smart Inventory & Cost Settings (IN-SC-10, IN-SC-11, IN-SC-15)
    autoUpdateProductCost: false, // Default require manager review before changing master cost
    targetProfitMarginPercent: 35, // Default target profit margin of 35% for retail recommendations
    defaultReceivingLocation: 'Main Liquor Storage',
    scanDataSubscriptionActive: false,
    scanDataSubscriptionProvider: '',
    scanDataMonthlySubscriptionFee: 0,
    scanDataRetailerAccountId: '',
    scanDataDefaultExportFrequency: 'monthly',
  };

  vendors: Vendor[] = [
    {
      id: 'vnd-1',
      name: "Southern Glazer's Wine & Spirits",
      normalizedName: "southern glazers wine & spirits",
      aliases: ["SGWS", "Southern Glazer's", "Southern Glazers", "Southern Wine & Spirits"],
      accountNumber: "SG-984210",
      phone: "(800) 275-7497",
      email: "orders.texas@sgws.com",
      address: "2401 S Stemmons Fwy, Lewisville, TX 75067",
      website: "https://www.southernglazers.com",
      taxId: "TX-94-1102948",
      source: "Manual",
      active: true,
      createdAt: "2026-01-01T08:00:00Z",
    },
    {
      id: 'vnd-2',
      name: "Republic National Distributing Company (RNDC)",
      normalizedName: "republic national distributing company",
      aliases: ["RNDC", "Republic National", "Republic Distributing"],
      accountNumber: "RNDC-440219",
      phone: "(972) 595-6000",
      email: "texas.orders@rndc-usa.com",
      address: "1010 Ismaili Center Rd, Grand Prairie, TX 75050",
      website: "https://www.rndc-usa.com",
      taxId: "TX-75-8829104",
      source: "Manual",
      active: true,
      createdAt: "2026-01-05T08:00:00Z",
    },
    {
      id: 'vnd-3',
      name: "Breakthru Beverage Group",
      normalizedName: "breakthru beverage group",
      aliases: ["Breakthru", "BBG", "Breakthru Beverage"],
      accountNumber: "BBG-10294",
      phone: "(817) 555-1200",
      email: "orders@breakthrubev.com",
      address: "Dallas, TX 75238",
      website: "https://www.breakthrubev.com",
      taxId: "TX-48-2918401",
      source: "Manual",
      active: true,
      createdAt: "2026-01-10T08:00:00Z",
    },
    {
      id: 'vnd-4',
      name: "Buffalo Trace Distillery Direct",
      normalizedName: "buffalo trace distillery direct",
      aliases: ["Sazerac Direct", "Buffalo Trace", "Sazerac"],
      accountNumber: "SAZ-77102",
      phone: "(502) 223-7641",
      email: "allocations@sazerac.com",
      address: "113 Great Buffalo Trace, Frankfort, KY 40601",
      website: "https://www.buffalotracedistillery.com",
      taxId: "KY-21-0094812",
      source: "Manual",
      active: true,
      createdAt: "2026-01-15T08:00:00Z",
    },
  ];

  invoices: ScannedInvoice[] = [];

  receivingTransactions: InventoryReceivingTransaction[] = [];

  vendorProductMappings: VendorProductMapping[] = [
    {
      id: 'vmap-1',
      vendorId: 'vnd-1',
      vendorItemNumber: 'SG-WFD-750',
      vendorDescription: 'Woodford Reserve Double Oaked 750ml',
      productId: 'prod-1',
      packSize: 12,
      lastUpdated: '2026-03-01T09:05:00Z',
    },
    {
      id: 'vmap-2',
      vendorId: 'vnd-1',
      vendorItemNumber: 'SG-BT-750',
      vendorDescription: 'Buffalo Trace Bourbon 750ML',
      productId: 'prod-15',
      packSize: 12,
      lastUpdated: '2026-03-01T09:05:00Z',
    },
    {
      id: 'vmap-3',
      vendorId: 'vnd-1',
      vendorItemNumber: 'SG-ER-750',
      vendorDescription: 'Eagle Rare 10Yr Bourbon 750ML',
      productId: 'prod-2',
      packSize: 6,
      lastUpdated: '2026-03-01T09:05:00Z',
    },
  ];

  // INV-01 to INV-18: Mobile QR Upload Sessions
  uploadSessions: InvoiceUploadSession[] = [];

  // INV-MB-01 to INV-MB-20: Multi-Barcode Receiving Sessions
  barcodeReceivingSessions: BarcodeReceivingSession[] = [];

  // ----------------------------------------------------
  // SR-01 to SR-25: Shifts Collection
  // ----------------------------------------------------
  shifts: Shift[] = [];

  // ----------------------------------------------------
  // CK-01 to CK-34: Bank Accounts & Issued Checks
  // ----------------------------------------------------
  bankAccounts: BankAccount[] = [];

  issuedChecks: IssuedCheck[] = [];

  // ----------------------------------------------------
  // CC-001 to CC-077: Check Cashing Module Data
  // ----------------------------------------------------
  checkFeeRules: CheckFeeRule[] = [
    {
      id: 'fee-1',
      checkType: 'payroll',
      label: 'Payroll Check',
      feePercent: 2.00,
      minFee: 3.00,
      maxFee: 50.00,
      description: 'Standard employer printed/payroll checks',
      active: true,
    },
    {
      id: 'fee-2',
      checkType: 'government',
      label: 'Government / Tax / Benefits',
      feePercent: 1.50,
      minFee: 3.00,
      maxFee: 40.00,
      description: 'US Treasury, State, VA, Social Security, Tax Refund',
      active: true,
    },
    {
      id: 'fee-3',
      checkType: 'business',
      label: 'Commercial / Business Check',
      feePercent: 3.00,
      minFee: 5.00,
      maxFee: 75.00,
      description: 'Accounts payable, corporate expense, vendor checks',
      active: true,
    },
    {
      id: 'fee-4',
      checkType: 'insurance',
      label: 'Insurance Settlement / Claim',
      feePercent: 3.00,
      minFee: 5.00,
      maxFee: 75.00,
      description: 'Auto, casualty, and medical insurance settlement drafts',
      active: true,
    },
    {
      id: 'fee-5',
      checkType: 'personal',
      label: 'Personal Check',
      feePercent: 5.00,
      minFee: 5.00,
      maxFee: 100.00,
      description: 'Standard handwritten personal bank checks',
      active: true,
    },
  ];

  checkIssuers: CheckIssuer[] = [
    {
      id: 'iss-1',
      name: 'Granbury Construction & Remodeling LLC',
      bankName: 'First National Bank of Texas',
      routingNumber: '111900038',
      accountNumberMasked: '****4928',
      phone: '(817) 573-2000',
      address: '802 W Pearl St, Granbury, TX 76048',
      totalChecksCashed: 42,
      totalAmountCashed: 48500.00,
      returnedChecksCount: 0,
      riskRating: 'low',
      status: 'verified',
      createdAt: '2026-01-01T08:00:00Z',
    },
    {
      id: 'iss-2',
      name: 'Texas Health Resources Hospital',
      bankName: 'JPMorgan Chase Bank, N.A.',
      routingNumber: '111000025',
      accountNumberMasked: '****1092',
      phone: '(800) 246-8471',
      address: 'Arlington, TX 76012',
      totalChecksCashed: 68,
      totalAmountCashed: 84200.00,
      returnedChecksCount: 0,
      riskRating: 'low',
      status: 'verified',
      createdAt: '2026-01-10T08:00:00Z',
    },
    {
      id: 'iss-3',
      name: 'United States Treasury (IRS / SSA)',
      bankName: 'Federal Reserve Bank of Dallas',
      routingNumber: '111000038',
      accountNumberMasked: '****0001',
      phone: '(800) 829-1040',
      address: 'Austin, TX 73301',
      totalChecksCashed: 95,
      totalAmountCashed: 128450.00,
      returnedChecksCount: 0,
      riskRating: 'low',
      status: 'verified',
      createdAt: '2026-01-01T08:00:00Z',
    },
    {
      id: 'iss-4',
      name: 'Lone Star Mutual Casualty Co.',
      bankName: 'Frost Bank',
      routingNumber: '114000093',
      accountNumberMasked: '****7712',
      phone: '(214) 555-0199',
      address: 'Dallas, TX 75201',
      totalChecksCashed: 18,
      totalAmountCashed: 32400.00,
      returnedChecksCount: 0,
      riskRating: 'low',
      status: 'verified',
      createdAt: '2026-02-01T08:00:00Z',
    },
    {
      id: 'iss-5',
      name: 'Brazos Valley Transport Corp',
      bankName: 'Wells Fargo Bank, N.A.',
      routingNumber: '121000247',
      accountNumberMasked: '****3819',
      phone: '(817) 555-9012',
      address: 'Fort Worth, TX 76102',
      totalChecksCashed: 6,
      totalAmountCashed: 7800.00,
      returnedChecksCount: 2,
      riskRating: 'high',
      status: 'blocked',
      createdAt: '2026-02-15T08:00:00Z',
    },
  ];

  checkCashingTransactions: CheckCashingTransaction[] = [];

  depositBatches: DepositBatch[] = [];

  checkQrSessions: CheckQrSession[] = [];

  // ----------------------------------------------------
  // OMNICHANNEL INVENTORY LEDGER (US-004 to US-007)
  // ----------------------------------------------------
  inventoryLedger: InventoryLedgerEntry[] = [];

  inventoryReservations: InventoryReservation[] = [];

  scanDataTransactions: ScanDataTransaction[] = [];

  scanDataExportBatches: ScanDataExportBatch[] = [];

  omnichannelCartTransfers: OmnichannelCartTransfer[] = [];

  productBundles: ProductBundle[] = [
    {
      id: 'bnd-1',
      name: 'Bourbon Connoisseur Duo Set',
      sku: 'BND-BOURBON-DUO',
      barcode: '9900010011',
      bundlePrice: 99.99,
      active: true,
      description: 'Woodford Reserve Double Oaked + Buffalo Trace Straight Bourbon gift bundle',
      items: [
        {
          productId: 'prod-1',
          productName: 'Woodford Reserve Double Oaked',
          sku: 'WFD-DO-750',
          quantity: 1,
          unitPrice: 59.99,
        },
        {
          productId: 'prod-3',
          productName: 'Woodford Reserve Kentucky Derby Edition',
          sku: 'WR-DERBY-1L',
          quantity: 1,
          unitPrice: 59.99,
        },
      ],
    },
  ];

  productSubstitutionRules: ProductSubstitutionRule[] = [
    {
      id: 'sub-1',
      originalProductId: 'prod-2',
      substituteProductId: 'prod-1',
      substituteProductName: 'Woodford Reserve Double Oaked 750ml',
      substituteSku: 'WFD-DO-750',
      priceDifference: 11.00,
      allowAutomaticSubstitution: true,
      reason: 'Allocated Kentucky bourbon alternative with similar flavor profile',
    },
  ];

  digitalTwinLayout: DigitalTwinShelfPosition[] = [
    {
      id: 'pos-a3-b1-s1',
      aisle: 'Aisle 3',
      bay: 'Bay 1',
      shelf: 'Shelf 1',
      position: 'Pos 1',
      productId: 'prod-1',
      productName: 'Woodford Reserve Double Oaked',
      sku: 'WFD-DO-750',
      facingCount: 4,
      maxCapacity: 24,
      currentCount: 20,
    },
    {
      id: 'pos-a3-b1-s2',
      aisle: 'Aisle 3',
      bay: 'Bay 1',
      shelf: 'Shelf 2',
      position: 'Pos 2',
      productId: 'prod-2',
      productName: 'Eagle Rare 10 Year Bourbon',
      sku: 'ER-10-750',
      facingCount: 2,
      maxCapacity: 12,
      currentCount: 8,
    },
  ];

  // Append to ledger immutably (US-004: Non-destructive inventory audit)
  recordLedgerMovement(
    productId: string,
    channel: 'pos' | 'web' | 'mobile' | 'backoffice' | 'ai_system',
    userId: string,
    userName: string,
    quantityDelta: number,
    reason: any,
    referenceId?: string,
    notes?: string,
    location?: string
  ): InventoryLedgerEntry {
    const product = this.products.find(p => p.id === productId);
    const productName = product ? product.name : 'Unknown Item';
    const sku = product ? product.sku : 'N/A';
    const currentBalance = product ? product.stockQuantity : 0;
    const balanceAfter = currentBalance + quantityDelta;

    if (product) {
      product.stockQuantity = balanceAfter;
      product.updatedAt = new Date().toISOString();
    }

    const entry: InventoryLedgerEntry = {
      id: `led-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      productId,
      productName,
      sku,
      timestamp: new Date().toISOString(),
      channel,
      userId,
      userName,
      quantityDelta,
      balanceAfter,
      reason,
      referenceId,
      notes,
      location,
    };

    this.inventoryLedger.unshift(entry);
    return entry;
  }

  // Get Available To Sell (ATS) for any product (US-005)
  getProductATS(productId: string, defaultSafetyStock = 1) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return null;

    // Active unexpired reservations
    const now = new Date().toISOString();
    const activeReservations = this.inventoryReservations.filter(
      r => r.productId === productId && r.status === 'active' && r.expiresAt > now
    );
    const reserved = activeReservations.reduce((sum, r) => sum + r.quantity, 0);

    const safetyStock = product.lowStockThreshold || defaultSafetyStock;
    const availableToSell = Math.max(0, product.stockQuantity - reserved - safetyStock);

    return {
      productId: product.id,
      onHand: product.stockQuantity,
      reserved,
      safetyStock,
      availableToSell,
      sellOnline: product.channelAvailability ? product.channelAvailability.website : (product.sellOnline ?? true),
      sellInStore: product.channelAvailability ? product.channelAvailability.pos : (product.sellInStore ?? true),
    };
  }

  // Helper method to add audit log
  addAudit(
    userId: string,
    userName: string,
    userRole: any,
    action: string,
    targetType: any,
    targetId: string,
    details: string,
    beforeData?: any,
    afterData?: any,
    extra?: {
      oldValue?: string;
      newValue?: string;
      ipAddress?: string;
      deviceId?: string;
      terminalId?: string;
      module?: string;
      storeId?: string;
      registerId?: string;
    }
  ) {
    const log: AuditLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId,
      userName,
      userRole,
      action,
      targetType,
      targetId,
      details,
      beforeData,
      afterData,
      oldValue: extra?.oldValue,
      newValue: extra?.newValue,
      ipAddress: extra?.ipAddress,
      deviceId: extra?.deviceId,
      terminalId: extra?.terminalId,
      module: extra?.module,
      storeId: extra?.storeId,
      registerId: extra?.registerId,
      timestamp: new Date().toISOString(),
    };
    this.auditLogs.unshift(log);
    return log;
  }

  // --- DATABASE PERSISTENCE LAYER ---
  private dbFilePath = path.join(
  process.env.LOCALAPPDATA || process.env.APPDATA || process.cwd(),
  'KaBiRa POS',
  'data',
  'pos_database.json'
);
  private saveTimeout: NodeJS.Timeout | null = null;
  public lastSavedAt: string | null = null;

  constructor() {
    this.loadFromDisk();

    // Ensure save on process termination
    process.on('SIGINT', () => {
      this.saveToDiskSync();
    });
    process.on('SIGTERM', () => {
      this.saveToDiskSync();
    });
  }

  private get persistedTableKeys() {
    return [
      'users',
      'categories',
      'brands',
      'promotions',
      'devices',
      'deploymentPackages',
      'registeredTerminals',
      'products',
      'customers',
      'orders',
      'heldOrders',
      'inventoryAdjustments',
      'auditLogs',
      'loyaltyTransactions',
      'settings',
      'vendors',
      'invoices',
      'receivingTransactions',
      'vendorProductMappings',
      'barcodeReceivingSessions',
      'shifts',
      'bankAccounts',
      'issuedChecks',
      'checkFeeRules',
      'checkIssuers',
      'checkCashingTransactions',
      'depositBatches',
      'inventoryLedger',
      'inventoryReservations',
      'scanDataTransactions',
      'scanDataExportBatches',
      'omnichannelCartTransfers',
      'productBundles',
      'productSubstitutionRules',
      'digitalTwinLayout',
    ] as const;
  }

  loadFromDisk() {
    try {
      if (fs.existsSync(this.dbFilePath)) {
        const raw = fs.readFileSync(this.dbFilePath, 'utf-8');
        const data = JSON.parse(raw);
        for (const key of this.persistedTableKeys) {
          if (data[key] !== undefined) {
            (this as any)[key] = data[key];
          }
        }
        this.lastSavedAt = data._metadata?.lastSavedAt || new Date().toISOString();
        console.log(`[Database] Loaded persistent data from ${this.dbFilePath} (${this.products.length} products, ${this.orders.length} orders, ${this.customers.length} customers)`);
      } else {
        this.saveToDiskSync();
        console.log(`[Database] Initialized new persistent database file at ${this.dbFilePath}`);
      }
    } catch (err) {
      console.error('[Database] Failed to load from disk, using defaults:', err);
    }
  }

  serialize() {
    const data: Record<string, any> = {
      _metadata: {
        version: '1.0.0',
        system: 'KABIRA POS Core DB',
        lastSavedAt: new Date().toISOString(),
      },
    };
    for (const key of this.persistedTableKeys) {
      data[key] = (this as any)[key];
    }
    return data;
  }

  saveToDiskSync() {
    try {
      const dir = path.dirname(this.dbFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = this.serialize();
      const tempPath = `${this.dbFilePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.dbFilePath);
      this.lastSavedAt = data._metadata.lastSavedAt;
      return true;
    } catch (err) {
      console.error('[Database] Error saving database to disk:', err);
      return false;
    }
  }

  scheduleSave(delayMs = 250) {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveToDiskSync();
      this.saveTimeout = null;
    }, delayMs);
  }

  getStats() {
    let sizeOnDisk = 0;
    try {
      if (fs.existsSync(this.dbFilePath)) {
        sizeOnDisk = fs.statSync(this.dbFilePath).size;
      }
    } catch (_) {}

    return {
      status: 'healthy',
      engine: 'JSON File-Backed Persistent Store',
      dbFilePath: this.dbFilePath,
      sizeBytes: sizeOnDisk,
      sizeFormatted: `${(sizeOnDisk / 1024).toFixed(1)} KB`,
      lastSavedAt: this.lastSavedAt,
      counts: {
        products: this.products.length,
        categories: this.categories.length,
        orders: this.orders.length,
        customers: this.customers.length,
        shifts: this.shifts.length,
        checkTransactions: this.checkCashingTransactions.length,
        inventoryAdjustments: this.inventoryAdjustments.length,
        auditLogs: this.auditLogs.length,
        vendors: this.vendors.length,
        promotions: this.promotions.length,
        scanDataTransactions: this.scanDataTransactions.length,
        scanDataExportBatches: this.scanDataExportBatches.length,
        devices: this.devices.length,
        deploymentPackages: this.deploymentPackages.length,
        registeredTerminals: this.registeredTerminals.length,
      },
    };
  }
}

export const db = new Database();
