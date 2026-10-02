import {
  BusinessType,
  FeatureCategory,
  FeatureDefinition,
  NavItemConfig,
  QuickActionConfig,
  CheckoutStepConfig,
  LayoutPanelConfig,
  HardwareRequirementConfig,
  PosConfiguration,
  StoreProfile,
  ConfigVersionHistoryItem,
} from '../types/industryConfig';

// Master List of System Features (POS-FEAT-001)
export const MASTER_FEATURES: FeatureDefinition[] = [
  // REGISTER
  {
    id: 'feat_prod_search',
    name: 'Product Search',
    category: 'REGISTER',
    description: 'Instant lookup by name, brand, SKU, and barcode',
    defaultEnabledIndustries: ['liquor', 'smoke_shop', 'grocery', 'restaurant', 'convenience', 'retail', 'custom'],
  },
  {
    id: 'feat_barcode_scan',
    name: 'Barcode Scanning',
    category: 'REGISTER',
    description: 'Hardware barcode scanner integration and keyboard wedge gun reading',
    defaultEnabledIndustries: ['liquor', 'smoke_shop', 'grocery', 'convenience', 'retail'],
  },
  {
    id: 'feat_customer',
    name: 'Customer Profiles',
    category: 'REGISTER',
    description: 'Attach customer profiles, purchase histories, and phone lookup',
    defaultEnabledIndustries: ['liquor', 'smoke_shop', 'grocery', 'restaurant', 'retail'],
  },
  {
    id: 'feat_discounts',
    name: 'Discounts & Promotions',
    category: 'REGISTER',
    description: 'Item and total cart discounts, manager overrides, and coupons',
    defaultEnabledIndustries: ['liquor', 'smoke_shop', 'grocery', 'restaurant', 'convenience', 'retail'],
  },
  {
    id: 'feat_hold_order',
    name: 'Hold & Resume Order',
    category: 'REGISTER',
    description: 'Suspend active transaction to serve next customer and resume anytime',
    defaultEnabledIndustries: ['liquor', 'smoke_shop', 'grocery', 'convenience', 'retail'],
  },
  {
    id: 'feat_returns',
    name: 'Returns & Refunds',
    category: 'REGISTER',
    description: 'Process product returns with original receipt verification or store credit',
    defaultEnabledIndustries: ['liquor', 'smoke_shop', 'grocery', 'retail', 'convenience'],
  },
  {
    id: 'feat_open_drawer',
    name: 'No-Sale Open Drawer',
    category: 'REGISTER',
    description: 'Emergency or change-making cash drawer kick with audit logging',
    defaultEnabledIndustries: ['liquor', 'smoke_shop', 'grocery', 'restaurant', 'convenience', 'retail'],
    requiresRole: 'Manager',
  },

  // LIQUOR / TOBACCO
  {
    id: 'feat_age_verification',
    name: 'Age Verification (21+)',
    category: 'LIQUOR_TOBACCO',
    description: 'Prompt mandatory DOB check or automated cutoff date badge for 21+ products',
    defaultEnabledIndustries: ['liquor', 'smoke_shop', 'convenience'],
  },
  {
    id: 'feat_id_verification',
    name: 'ID Barcode Scanner (AAMVA)',
    category: 'LIQUOR_TOBACCO',
    description: 'Automated 2D PDF-417 driver license scanning for age and expiration validation',
    defaultEnabledIndustries: ['liquor', 'smoke_shop'],
    dependencies: ['feat_age_verification'],
  },
  {
    id: 'feat_allocated_products',
    name: 'Allocated Products Control',
    category: 'LIQUOR_TOBACCO',
    description: 'Manage rare bourbons, allocated bottles, and customer bottle limits with manager unlock',
    defaultEnabledIndustries: ['liquor'],
  },
  {
    id: 'feat_case_pricing',
    name: 'Bottle / Pack / Case Pricing',
    category: 'LIQUOR_TOBACCO',
    description: 'Automatic price tiering for single bottle, 4-pack, 6-pack, and full case units',
    defaultEnabledIndustries: ['liquor', 'grocery', 'convenience'],
  },
  {
    id: 'feat_tobacco_restrictions',
    name: 'Tobacco & Nicotine Compliance',
    category: 'LIQUOR_TOBACCO',
    description: 'Track tobacco product quotas, excise tax reporting, and flavor ban restrictions',
    defaultEnabledIndustries: ['smoke_shop', 'convenience'],
    dependencies: ['feat_age_verification'],
  },

  // RESTAURANT
  {
    id: 'feat_table_management',
    name: 'Table & Floor Map',
    category: 'RESTAURANT',
    description: 'Visual dining room layout, table statuses (open, seated, billed), and guest counts',
    defaultEnabledIndustries: ['restaurant'],
  },
  {
    id: 'feat_kitchen_display',
    name: 'Kitchen Display System (KDS)',
    category: 'RESTAURANT',
    description: 'Live order routing to kitchen display or thermal kitchen chit printer',
    defaultEnabledIndustries: ['restaurant'],
    dependencies: ['feat_table_management', 'feat_menu_modifiers'],
  },
  {
    id: 'feat_menu_modifiers',
    name: 'Menu Modifiers & Temp',
    category: 'RESTAURANT',
    description: 'Steak cooking temperatures, sides, toppings, additions, and dietary warnings',
    defaultEnabledIndustries: ['restaurant'],
  },
  {
    id: 'feat_tips',
    name: 'Tipping & Gratuity',
    category: 'RESTAURANT',
    description: 'Custom tip percentages (15%, 18%, 20%), auto-gratuity for large parties, and cash tip pooling',
    defaultEnabledIndustries: ['restaurant'],
  },
  {
    id: 'feat_split_check',
    name: 'Split Check & Tabs',
    category: 'RESTAURANT',
    description: 'Split ticket evenly, by seat number, by item, or custom dollar amounts',
    defaultEnabledIndustries: ['restaurant'],
    dependencies: ['feat_table_management'],
  },
  {
    id: 'feat_open_tabs',
    name: 'Bar & Open Tabs',
    category: 'RESTAURANT',
    description: 'Hold credit card authorizations and keep tabs open for bar customers',
    defaultEnabledIndustries: ['restaurant'],
  },
  {
    id: 'feat_takeout_delivery',
    name: 'Takeout & Delivery Routing',
    category: 'RESTAURANT',
    description: 'Distinguish dine-in, curbside takeout, and delivery with scheduled pickup times',
    defaultEnabledIndustries: ['restaurant'],
  },

  // GROCERY
  {
    id: 'feat_produce_plu',
    name: 'Produce PLU Lookup',
    category: 'GROCERY',
    description: '4-digit and 5-digit PLU code directory with instant search and produce pictures',
    defaultEnabledIndustries: ['grocery', 'convenience'],
  },
  {
    id: 'feat_scale_integration',
    name: 'POS Bridge Scale Integration',
    category: 'GROCERY',
    description: 'Direct live reading from Avery Berkel, Brecknell, or Dibal certified deli/produce scales',
    defaultEnabledIndustries: ['grocery'],
    dependencies: ['feat_weighted_products'],
  },
  {
    id: 'feat_weighted_products',
    name: 'Weighted Price-Per-Pound',
    category: 'GROCERY',
    description: 'Calculate item cost dynamically based on pounds or ounces and scale tare weight',
    defaultEnabledIndustries: ['grocery'],
  },
  {
    id: 'feat_coupons',
    name: 'Grocery Coupons & Multi-buys',
    category: 'GROCERY',
    description: 'Mix-and-match promos, BOGO, manufacturer coupons, and volume tiers',
    defaultEnabledIndustries: ['grocery', 'retail', 'convenience'],
  },
  {
    id: 'feat_high_speed_checkout',
    name: 'High-Speed Rapid Scanning',
    category: 'GROCERY',
    description: 'Zero-latency consecutive barcode gun scanning with minimal screen animation for high throughput',
    defaultEnabledIndustries: ['grocery', 'convenience'],
  },
  {
    id: 'feat_quantity_multiplier',
    name: 'Quantity Multiplier (e.g. 10x)',
    category: 'GROCERY',
    description: 'Key in quantity first, then scan one product for bulk multi-unit ringing',
    defaultEnabledIndustries: ['grocery', 'convenience', 'retail'],
  },

  // ADVANCED
  {
    id: 'feat_inventory',
    name: 'Live Inventory & Receiving',
    category: 'ADVANCED',
    description: 'Multi-location inventory tracking, purchase orders, receiving, and low-stock alerts',
    defaultEnabledIndustries: ['liquor', 'smoke_shop', 'grocery', 'retail'],
    requiresRole: 'Manager',
  },
  {
    id: 'feat_loyalty',
    name: 'Loyalty Rewards Program',
    category: 'ADVANCED',
    description: 'Points per dollar spent, reward tier levels, and discounts at checkout',
    defaultEnabledIndustries: ['liquor', 'smoke_shop', 'grocery', 'retail'],
  },
  {
    id: 'feat_online_orders',
    name: 'Omnichannel & Online Orders',
    category: 'ADVANCED',
    description: 'Real-time synchronization with ecommerce storefront, DoorDash, and UberEats',
    defaultEnabledIndustries: ['liquor', 'restaurant', 'retail'],
  },
  {
    id: 'feat_check_cashing',
    name: 'Financial Services & Check Cashing',
    category: 'ADVANCED',
    description: 'Payroll/government check verification, fee calculation, photo ID, and KYC logs',
    defaultEnabledIndustries: ['liquor', 'grocery', 'convenience'],
    requiresRole: 'Cashier',
  },
  {
    id: 'feat_lotto',
    name: 'Lottery Sales & Payouts',
    category: 'ADVANCED',
    description: 'Instant scratch-off and draw lottery ticket sales and prize payout auditing',
    defaultEnabledIndustries: ['liquor', 'convenience'],
  },
  {
    id: 'feat_reports',
    name: 'Reports & Analytics',
    category: 'ADVANCED',
    description: 'Daily Z-reports, shift reconciliation, tax summaries, and product velocity',
    defaultEnabledIndustries: ['liquor', 'smoke_shop', 'grocery', 'restaurant', 'convenience', 'retail'],
    requiresRole: 'Manager',
  },
];

// Initial Company Stores Hierarchy (POS-CFG-001 to POS-CFG-004)
export const INITIAL_STORES: StoreProfile[] = [
  {
    id: 'store-1',
    name: '377 Spirits — Granbury Main',
    businessType: 'liquor',
    storeNumber: '001',
    address: '1400 E Hwy 377',
    cityStateZip: 'Granbury, TX 76048',
    phone: '(817) 555-0377',
    managerName: 'Marcus Vance',
    registers: [
      { id: 'reg-1-01', name: 'Front Counter #01 (Main)', number: '01', type: 'counter' },
      { id: 'reg-1-02', name: 'Front Counter #02 (Express)', number: '02', type: 'counter' },
      { id: 'reg-1-03', name: 'Drive-Thru Window Register', number: '03', type: 'drive_thru' },
    ],
  },
  {
    id: 'store-2',
    name: 'Granbury Smoke & Vape Depot',
    businessType: 'smoke_shop',
    storeNumber: '002',
    address: '810 Morgan St',
    cityStateZip: 'Granbury, TX 76048',
    phone: '(817) 555-0378',
    managerName: 'Samantha Ray',
    registers: [
      { id: 'reg-2-01', name: 'Main Glass Counter #01', number: '01', type: 'counter' },
      { id: 'reg-2-02', name: 'Lounge Bar Register #02', number: '02', type: 'counter' },
    ],
  },
  {
    id: 'store-3',
    name: 'Lake Granbury Fresh Market',
    businessType: 'grocery',
    storeNumber: '003',
    address: '2200 Fall Creek Hwy',
    cityStateZip: 'Granbury, TX 76049',
    phone: '(817) 555-0379',
    managerName: 'David Chen',
    registers: [
      { id: 'reg-3-01', name: 'Lane #01 (Scale + Scanner)', number: '01', type: 'counter' },
      { id: 'reg-3-02', name: 'Lane #02 (Speed Scanner)', number: '02', type: 'counter' },
      { id: 'reg-3-03', name: 'Deli / Bakery Register', number: '03', type: 'counter' },
    ],
  },
  {
    id: 'store-4',
    name: 'The Brazos Bistro & Taphouse',
    businessType: 'restaurant',
    storeNumber: '004',
    address: '115 Historic Town Square',
    cityStateZip: 'Granbury, TX 76048',
    phone: '(817) 555-0380',
    managerName: 'Chef Antonio Rossi',
    registers: [
      { id: 'reg-4-01', name: 'Host Station / Main POS', number: '01', type: 'counter' },
      { id: 'reg-4-02', name: 'Main Bar Terminal', number: '02', type: 'bar' },
      { id: 'reg-4-03', name: 'Server Patio Tablet', number: '03', type: 'mobile_tablet' },
    ],
  },
];

// Produce PLU Dictionary for Grocery Mode (POS-GRC-002)
export interface ProducePLUItem {
  plu: string;
  name: string;
  category: 'Fruit' | 'Vegetable' | 'Herb' | 'Organic';
  pricePerLb: number;
  tareWeight: number; // e.g. 0.05 lbs for plastic bag
  image: string;
}

export const COMMON_PRODUCE_PLUS: ProducePLUItem[] = [
  { plu: '4011', name: 'Yellow Cavendish Bananas', category: 'Fruit', pricePerLb: 0.69, tareWeight: 0.0, image: '🍌' },
  { plu: '94011', name: 'Organic Bananas', category: 'Organic', pricePerLb: 0.99, tareWeight: 0.0, image: '🍌' },
  { plu: '4046', name: 'Hass Avocados (Small)', category: 'Fruit', pricePerLb: 1.49, tareWeight: 0.0, image: '🥑' },
  { plu: '4225', name: 'Hass Avocados (Large)', category: 'Fruit', pricePerLb: 1.99, tareWeight: 0.0, image: '🥑' },
  { plu: '4087', name: 'Roma Plum Tomatoes', category: 'Vegetable', pricePerLb: 1.29, tareWeight: 0.02, image: '🍅' },
  { plu: '4065', name: 'Green Bell Peppers', category: 'Vegetable', pricePerLb: 1.79, tareWeight: 0.02, image: '🫑' },
  { plu: '4088', name: 'Red Bell Peppers', category: 'Vegetable', pricePerLb: 2.49, tareWeight: 0.02, image: '🌶️' },
  { plu: '4093', name: 'Sweet Yellow Onions', category: 'Vegetable', pricePerLb: 1.19, tareWeight: 0.03, image: '🧅' },
  { plu: '4082', name: 'Red Onions', category: 'Vegetable', pricePerLb: 1.49, tareWeight: 0.03, image: '🧅' },
  { plu: '4072', name: 'Russet Baking Potatoes', category: 'Vegetable', pricePerLb: 0.89, tareWeight: 0.05, image: '🥔' },
  { plu: '4060', name: 'Fresh Broccoli Crowns', category: 'Vegetable', pricePerLb: 1.99, tareWeight: 0.02, image: '🥦' },
  { plu: '4053', name: 'Fresh Meyer Lemons', category: 'Fruit', pricePerLb: 1.89, tareWeight: 0.01, image: '🍋' },
  { plu: '4048', name: 'Persian Limes', category: 'Fruit', pricePerLb: 1.99, tareWeight: 0.01, image: '🍈' },
  { plu: '4135', name: 'Gala Apples', category: 'Fruit', pricePerLb: 1.99, tareWeight: 0.03, image: '🍎' },
  { plu: '3283', name: 'Honeycrisp Apples', category: 'Fruit', pricePerLb: 2.99, tareWeight: 0.03, image: '🍎' },
  { plu: '4032', name: 'Seedless Watermelon', category: 'Fruit', pricePerLb: 0.59, tareWeight: 0.0, image: '🍉' },
  { plu: '4069', name: 'Green Cabbage', category: 'Vegetable', pricePerLb: 0.79, tareWeight: 0.05, image: '🥬' },
  { plu: '4562', name: 'Whole Carrots', category: 'Vegetable', pricePerLb: 1.19, tareWeight: 0.02, image: '🥕' },
];

// Restaurant Dining Tables Floor Plan (POS-RST-001, POS-RST-002)
export interface DiningTable {
  id: string;
  tableNumber: string;
  section: 'Main Dining' | 'Bar Area' | 'Patio';
  seats: number;
  status: 'available' | 'occupied' | 'billed' | 'dirty';
  currentServer?: string;
  guestCount?: number;
  openOrderId?: string;
  orderTotal?: number;
  seatedAt?: string;
}

export const INITIAL_RESTAURANT_TABLES: DiningTable[] = [
  { id: 'tbl-1', tableNumber: 'Table 1', section: 'Main Dining', seats: 4, status: 'available' },
  { id: 'tbl-2', tableNumber: 'Table 2', section: 'Main Dining', seats: 4, status: 'occupied', currentServer: 'Elena R.', guestCount: 3, orderTotal: 78.50, seatedAt: '42m ago' },
  { id: 'tbl-3', tableNumber: 'Table 3', section: 'Main Dining', seats: 6, status: 'billed', currentServer: 'Elena R.', guestCount: 5, orderTotal: 142.20, seatedAt: '1h 15m ago' },
  { id: 'tbl-4', tableNumber: 'Table 4', section: 'Main Dining', seats: 2, status: 'available' },
  { id: 'tbl-5', tableNumber: 'Table 5', section: 'Main Dining', seats: 4, status: 'dirty' },
  { id: 'tbl-6', tableNumber: 'Table 6', section: 'Main Dining', seats: 8, status: 'available' },
  { id: 'bar-1', tableNumber: 'Bar Stool 1', section: 'Bar Area', seats: 1, status: 'occupied', currentServer: 'Mike T.', guestCount: 1, orderTotal: 26.00, seatedAt: '18m ago' },
  { id: 'bar-2', tableNumber: 'Bar Stool 2', section: 'Bar Area', seats: 1, status: 'occupied', currentServer: 'Mike T.', guestCount: 1, orderTotal: 18.50, seatedAt: '12m ago' },
  { id: 'bar-3', tableNumber: 'Bar Stool 3', section: 'Bar Area', seats: 1, status: 'available' },
  { id: 'patio-1', tableNumber: 'Patio 1', section: 'Patio', seats: 4, status: 'available' },
  { id: 'patio-2', tableNumber: 'Patio 2', section: 'Patio', seats: 4, status: 'occupied', currentServer: 'Elena R.', guestCount: 4, orderTotal: 96.40, seatedAt: '35m ago' },
];

// Helper: Factory generating default POS configurations by industry template
export function generateIndustryTemplateConfig(
  businessType: BusinessType,
  storeId?: string,
  registerId?: string
): PosConfiguration {
  const isLiquor = businessType === 'liquor';
  const isSmoke = businessType === 'smoke_shop';
  const isGrocery = businessType === 'grocery';
  const isRestaurant = businessType === 'restaurant';
  const isConvenience = businessType === 'convenience';
  const isRetail = businessType === 'retail';

  // 1. Enabled features according to template defaults
  const enabledFeatures = MASTER_FEATURES.filter(f =>
    f.defaultEnabledIndustries.includes(businessType)
  ).map(f => f.id);

  // 2. Navigation Items (POS-NAV-001 to POS-NAV-003)
  let navigationItems: NavItemConfig[] = [];
  if (isRestaurant) {
    navigationItems = [
      { id: 'nav-orders', label: 'Orders', tabKey: 'orders', icon: 'ReceiptText', enabled: true, order: 1 },
      { id: 'nav-tables', label: 'Tables', tabKey: 'tables', icon: 'LayoutGrid', enabled: true, order: 2 },
      { id: 'nav-pos', label: 'POS Register', tabKey: 'pos', icon: 'ShoppingCart', enabled: true, order: 3 },
      { id: 'nav-bar', label: 'Bar & Tabs', tabKey: 'bar_tabs', icon: 'Wine', enabled: true, order: 4 },
      { id: 'nav-kitchen', label: 'Kitchen (KDS)', tabKey: 'kitchen', icon: 'Flame', enabled: true, order: 5 },
      { id: 'nav-customers', label: 'Customers', tabKey: 'customers', icon: 'Users', enabled: true, order: 6 },
      { id: 'nav-shifts', label: 'Shifts', tabKey: 'shifts', icon: 'Coins', enabled: true, order: 7 },
      { id: 'nav-reports', label: 'Reports', tabKey: 'reports', icon: 'BarChart3', enabled: true, order: 8, roleRequired: 'Manager' },
      { id: 'nav-settings', label: 'Settings', tabKey: 'settings', icon: 'Settings', enabled: true, order: 9, roleRequired: 'Admin' },
    ];
  } else if (isGrocery) {
    navigationItems = [
      { id: 'nav-pos', label: 'POS Register', tabKey: 'pos', icon: 'ShoppingCart', enabled: true, order: 1 },
      { id: 'nav-orders', label: 'Orders', tabKey: 'orders', icon: 'ReceiptText', enabled: true, order: 2 },
      { id: 'nav-customers', label: 'Customers', tabKey: 'customers', icon: 'Users', enabled: true, order: 3 },
      { id: 'nav-inventory', label: 'Inventory', tabKey: 'inventory', icon: 'Boxes', enabled: true, order: 4, roleRequired: 'Manager' },
      { id: 'nav-shifts', label: 'Shifts & Drawer', tabKey: 'shifts', icon: 'Coins', enabled: true, order: 5 },
      { id: 'nav-receiving', label: 'Receiving', tabKey: 'receiving', icon: 'Package', enabled: true, order: 6, roleRequired: 'Manager' },
      { id: 'nav-reports', label: 'Reports', tabKey: 'reports', icon: 'BarChart3', enabled: true, order: 7, roleRequired: 'Manager' },
      { id: 'nav-settings', label: 'Settings', tabKey: 'settings', icon: 'Settings', enabled: true, order: 8, roleRequired: 'Admin' },
    ];
  } else {
    // Default Retail / Liquor / Smoke
    navigationItems = [
      { id: 'nav-pos', label: 'POS Register', tabKey: 'pos', icon: 'ShoppingCart', enabled: true, order: 1 },
      { id: 'nav-orders', label: 'Orders', tabKey: 'orders', icon: 'ReceiptText', enabled: true, order: 2 },
      { id: 'nav-shifts', label: 'Shifts & Drawer', tabKey: 'shifts', icon: 'Coins', enabled: true, order: 3 },
      { id: 'nav-customers', label: 'Customers', tabKey: 'customers', icon: 'Users', enabled: true, order: 4 },
      { id: 'nav-inventory', label: 'Inventory', tabKey: 'inventory', icon: 'Boxes', enabled: true, order: 5, roleRequired: 'Manager' },
      { id: 'nav-checks', label: 'Check Cashing', tabKey: 'checks', icon: 'Landmark', enabled: isLiquor || isConvenience, order: 6 },
      { id: 'nav-reports', label: 'Reports', tabKey: 'reports', icon: 'BarChart3', enabled: true, order: 7, roleRequired: 'Manager' },
      { id: 'nav-user-activity', label: 'User Activity', tabKey: 'user-activity', icon: 'UserCheck', enabled: true, order: 8, roleRequired: 'Admin' },
      { id: 'nav-settings', label: 'Settings', tabKey: 'settings', icon: 'Settings', enabled: true, order: 9, roleRequired: 'Manager' },
    ];
  }

  // 3. Quick Action Buttons (POS-ACT-001 to POS-ACT-004)
  let quickActions: QuickActionConfig[] = [];
  if (isLiquor) {
    quickActions = [
      { id: 'act-add-item', label: 'Add Item (F4)', shortcut: 'F4', actionKey: 'add_manual', icon: 'Plus', colorClass: 'bg-[#F3C067] text-slate-950', enabled: true, order: 1, size: 'normal' },
      { id: 'act-lotto-sale', label: 'Lotto Sale (F6)', shortcut: 'F6', actionKey: 'lotto_sale', icon: 'Ticket', colorClass: 'bg-[#059669] text-white', enabled: true, order: 2, size: 'normal' },
      { id: 'act-lotto-payout', label: 'Lotto Payout (F7)', shortcut: 'F7', actionKey: 'lotto_payout', icon: 'DollarSign', colorClass: 'bg-[#E11D48] text-white', enabled: true, order: 3, size: 'normal' },
      { id: 'act-customer', label: 'Customer (F8)', shortcut: 'F8', actionKey: 'select_customer', icon: 'UserCheck', colorClass: 'bg-white text-slate-800 border-slate-200', enabled: true, order: 4, size: 'normal' },
      { id: 'act-price-check', label: 'Price Check', shortcut: 'F9', actionKey: 'price_check', icon: 'Search', colorClass: 'bg-white text-slate-800 border-slate-200', enabled: true, order: 6, size: 'normal' },
      { id: 'act-age-verify', label: 'Age Verify 21+', shortcut: 'F10', actionKey: 'age_verify', icon: 'ShieldCheck', colorClass: 'bg-amber-500 text-slate-950', enabled: true, order: 7, size: 'normal' },
      { id: 'act-allocated', label: 'Allocated Vault', shortcut: '', actionKey: 'allocated_vault', icon: 'Award', colorClass: 'bg-purple-900 text-purple-200', enabled: true, order: 8, size: 'normal', roleRequired: 'Manager' },
    ];
  } else if (isSmoke) {
    quickActions = [
      { id: 'act-add-item', label: 'Add Item (F4)', shortcut: 'F4', actionKey: 'add_manual', icon: 'Plus', colorClass: 'bg-[#F3C067] text-slate-950', enabled: true, order: 1, size: 'normal' },
      { id: 'act-scan', label: 'Scan Gun (F3)', shortcut: 'F3', actionKey: 'open_scanner', icon: 'ScanBarcode', colorClass: 'bg-[#1E293B] text-white', enabled: true, order: 2, size: 'normal' },
      { id: 'act-age-verify', label: 'Tobacco 21+ ID', shortcut: 'F10', actionKey: 'age_verify', icon: 'ShieldCheck', colorClass: 'bg-amber-500 text-slate-950', enabled: true, order: 3, size: 'normal' },
      { id: 'act-customer', label: 'VIP Customer', shortcut: 'F8', actionKey: 'select_customer', icon: 'UserCheck', colorClass: 'bg-white text-slate-800', enabled: true, order: 4, size: 'normal' },
      { id: 'act-brand-nav', label: 'Vape Brands', shortcut: '', actionKey: 'brand_filter', icon: 'Sparkles', colorClass: 'bg-indigo-600 text-white', enabled: true, order: 5, size: 'normal' },
      { id: 'act-price-check', label: 'Price Check', shortcut: '', actionKey: 'price_check', icon: 'Search', colorClass: 'bg-white text-slate-800', enabled: true, order: 6, size: 'normal' },
    ];
  } else if (isGrocery) {
    quickActions = [
      { id: 'act-produce-plu', label: 'Produce PLU (F2)', shortcut: 'F2', actionKey: 'produce_plu', icon: 'Apple', colorClass: 'bg-emerald-600 text-white', enabled: true, order: 1, size: 'large' },
      { id: 'act-scale-weigh', label: 'Scale Weight', shortcut: 'F5', actionKey: 'scale_weight', icon: 'Scale', colorClass: 'bg-cyan-600 text-white', enabled: true, order: 2, size: 'large' },
      { id: 'act-qty-mult', label: 'Qty Mult (10x)', shortcut: 'F9', actionKey: 'qty_multiply', icon: 'Hash', colorClass: 'bg-slate-800 text-amber-300', enabled: true, order: 3, size: 'normal' },
      { id: 'act-coupons', label: 'Coupons / Promos', shortcut: 'F7', actionKey: 'coupons', icon: 'Tag', colorClass: 'bg-rose-600 text-white', enabled: true, order: 4, size: 'normal' },
      { id: 'act-scan', label: 'Fast Scan (F3)', shortcut: 'F3', actionKey: 'open_scanner', icon: 'ScanBarcode', colorClass: 'bg-[#1E293B] text-white', enabled: true, order: 5, size: 'normal' },
      { id: 'act-customer', label: 'Club Card (F8)', shortcut: 'F8', actionKey: 'select_customer', icon: 'UserCheck', colorClass: 'bg-white text-slate-800', enabled: true, order: 6, size: 'normal' },
    ];
  } else if (isRestaurant) {
    quickActions = [
      { id: 'act-new-order', label: 'New Table Order', shortcut: 'F1', actionKey: 'new_table_order', icon: 'Plus', colorClass: 'bg-emerald-600 text-white', enabled: true, order: 1, size: 'large' },
      { id: 'act-tables-map', label: 'Tables Map', shortcut: 'F2', actionKey: 'open_tables_map', icon: 'LayoutGrid', colorClass: 'bg-indigo-600 text-white', enabled: true, order: 2, size: 'large' },
      { id: 'act-takeout', label: 'Takeout', shortcut: 'F4', actionKey: 'takeout_order', icon: 'ShoppingBag', colorClass: 'bg-amber-600 text-white', enabled: true, order: 3, size: 'normal' },
      { id: 'act-delivery', label: 'Delivery', shortcut: 'F5', actionKey: 'delivery_order', icon: 'Truck', colorClass: 'bg-blue-600 text-white', enabled: true, order: 4, size: 'normal' },
      { id: 'act-open-tab', label: 'Open Bar Tab', shortcut: 'F6', actionKey: 'open_tab', icon: 'Wine', colorClass: 'bg-purple-600 text-white', enabled: true, order: 5, size: 'normal' },
      { id: 'act-split-check', label: 'Split Check', shortcut: 'F8', actionKey: 'split_check', icon: 'Split', colorClass: 'bg-slate-700 text-white', enabled: true, order: 6, size: 'normal' },
      { id: 'act-send-kitchen', label: 'Fire to Kitchen', shortcut: 'F12', actionKey: 'send_kitchen', icon: 'Flame', colorClass: 'bg-red-600 text-white animate-pulse', enabled: true, order: 7, size: 'normal' },
    ];
  } else {
    // Retail / Custom
    quickActions = [
      { id: 'act-add-item', label: 'Add Item (F4)', shortcut: 'F4', actionKey: 'add_manual', icon: 'Plus', colorClass: 'bg-[#F3C067] text-slate-950', enabled: true, order: 1, size: 'normal' },
      { id: 'act-scan', label: 'Scan Gun (F3)', shortcut: 'F3', actionKey: 'open_scanner', icon: 'ScanBarcode', colorClass: 'bg-[#1E293B] text-white', enabled: true, order: 2, size: 'normal' },
      { id: 'act-customer', label: 'Customer (F8)', shortcut: 'F8', actionKey: 'select_customer', icon: 'UserCheck', colorClass: 'bg-white text-slate-800', enabled: true, order: 3, size: 'normal' },
      { id: 'act-discount', label: 'Discount', shortcut: '', actionKey: 'discount', icon: 'Percent', colorClass: 'bg-amber-500 text-slate-950', enabled: true, order: 4, size: 'normal' },
      { id: 'act-price-check', label: 'Price Check', shortcut: '', actionKey: 'price_check', icon: 'Search', colorClass: 'bg-white text-slate-800', enabled: true, order: 5, size: 'normal' },
    ];
  }

  // 4. Checkout Workflow Steps (POS-CHK-001 to POS-CHK-003)
  let checkoutWorkflow: CheckoutStepConfig[] = [];
  if (isRestaurant) {
    checkoutWorkflow = [
      { id: 'chk-step-table', name: 'Table / Order Selection', stepKey: 'cart', order: 1, mandatory: true, description: 'Assign order to dining table or takeout ticket' },
      { id: 'chk-step-mod', name: 'Modifiers & Instructions', stepKey: 'modifiers', order: 2, mandatory: false, description: 'Food temperatures, sides, and kitchen prep notes' },
      { id: 'chk-step-kds', name: 'Fire Order to Kitchen', stepKey: 'send_kitchen', order: 3, mandatory: true, description: 'Dispatch order chits to kitchen and bar' },
      { id: 'chk-step-pay', name: 'Payment (Card/Cash/Tabs)', stepKey: 'payment', order: 4, mandatory: true, description: 'Collect tender via PIN pad terminal or split checks' },
      { id: 'chk-step-tip', name: 'Tip & Gratuity', stepKey: 'tip', order: 5, mandatory: false, description: 'Customer tipping prompt on PIN pad or signed receipt' },
      { id: 'chk-step-rec', name: 'Thermal Guest Receipt', stepKey: 'receipt', order: 6, mandatory: true, description: 'Print finalized receipt with itemized breakdown' },
    ];
  } else if (isGrocery) {
    checkoutWorkflow = [
      { id: 'chk-step-scan', name: 'Continuous Barcode / Scale Scan', stepKey: 'cart', order: 1, mandatory: true, description: 'Scan barcodes and weigh produce at scale' },
      { id: 'chk-step-coup', name: 'Coupons & Loyalty', stepKey: 'coupons', order: 2, mandatory: false, description: 'Redeem club card points and clip coupons' },
      { id: 'chk-step-pay', name: 'Payment Tender', stepKey: 'payment', order: 3, mandatory: true, description: 'Collect payment on high-speed terminal' },
      { id: 'chk-step-rec', name: 'Itemized Receipt', stepKey: 'receipt', order: 4, mandatory: true, description: 'Print receipt with grocery savings summary' },
    ];
  } else {
    // Liquor / Smoke / Retail default
    checkoutWorkflow = [
      { id: 'chk-step-cart', name: 'Cart Itemization', stepKey: 'cart', order: 1, mandatory: true, description: 'Add products and bottle quantities' },
      { id: 'chk-step-cust', name: 'Customer Loyalty (Optional)', stepKey: 'customer', order: 2, mandatory: false, description: 'Attach VIP profile to award and redeem points' },
      { id: 'chk-step-age', name: 'Age Verification', stepKey: 'age_verify', order: 3, mandatory: isLiquor || isSmoke, conditionalOn: 'alcohol_tobacco', description: 'Confirm 21+ age compliance for restricted products' },
      { id: 'chk-step-disc', name: 'Discounts & Points', stepKey: 'discount_loyalty', order: 4, mandatory: false, description: 'Apply promotional discounts or loyalty points' },
      { id: 'chk-step-pay', name: 'Payment Processing', stepKey: 'payment', order: 5, mandatory: true, description: 'Execute Card / Apple Pay / PIN Pad or Cash tender' },
      { id: 'chk-step-rec', name: 'Receipt & Compliance Slip', stepKey: 'receipt', order: 6, mandatory: true, description: 'Print receipt with tax compliance information' },
    ];
  }

  // 5. Layout Panels for Visual Builder (POS-LAYOUT-001 to POS-LAYOUT-006)
  const layoutPanels: LayoutPanelConfig[] = [
    { id: 'panel-search', name: 'Product Search Bar', componentKey: 'product_search', enabled: true, order: 1, widthFraction: 1.0 },
    { id: 'panel-categories', name: 'Category Navigation Sidebar', componentKey: 'category_sidebar', enabled: !isRestaurant, order: 2, widthFraction: 0.2 },
    { id: 'panel-grid', name: isRestaurant ? 'Restaurant Menu Grid' : 'Product Cards Catalog', componentKey: isRestaurant ? 'menu_grid' : 'product_grid', enabled: true, order: 3, widthFraction: 0.5 },
    { id: 'panel-tables', name: 'Dining Room Table Map', componentKey: 'table_map', enabled: isRestaurant, order: 4, widthFraction: 0.5 },
    { id: 'panel-plu', name: 'Produce PLU Lookup Panel', componentKey: 'produce_plu', enabled: isGrocery, order: 5, widthFraction: 0.3 },
    { id: 'panel-cart', name: 'Live Register Cart Panel', componentKey: 'current_cart', enabled: true, order: 6, widthFraction: 0.3 },
    { id: 'panel-customer', name: 'Customer Loyalty Header', componentKey: 'customer_card', enabled: true, order: 7, widthFraction: 0.3 },
    { id: 'panel-numpad', name: 'Touch Screen Numpad', componentKey: 'number_pad', enabled: isGrocery || isConvenience, order: 8, widthFraction: 0.3 },
    { id: 'panel-payment', name: 'Fast Checkout Payment Bar', componentKey: 'payment_bar', enabled: true, order: 9, widthFraction: 0.3 },
  ];

  // 6. Hardware Requirements (POS-HW-001 to POS-HW-003)
  const hardwareRequirements: HardwareRequirementConfig[] = [
    { category: 'scanner', name: 'Barcode Scanner Gun', required: isLiquor || isSmoke || isGrocery || isConvenience, recommended: true, notes: 'Continuous rapid scan enabled' },
    { category: 'printer', name: 'Thermal Receipt Printer (80mm)', required: true, recommended: true, notes: 'Epson or Star high-speed thermal' },
    { category: 'cash_drawer', name: 'Standard RJ11 Cash Drawer', required: true, recommended: true, notes: '24V kick pulse' },
    { category: 'terminal', name: 'EMV PIN Pad Terminal', required: true, recommended: true, notes: 'PAX or Verifone with NFC Contactless & PIN' },
    { category: 'customer_display', name: 'Customer Display Screen 2', required: isLiquor || isSmoke || isGrocery, recommended: true, notes: 'Webform multi-monitor sync' },
    { category: 'scale', name: 'Deli / Produce Scale (NTEP)', required: isGrocery, recommended: isConvenience, notes: 'Required for certified legal-for-trade weighted items' },
    { category: 'kitchen_printer', name: 'Kitchen Chit Printer', required: isRestaurant, recommended: isRestaurant, notes: 'Thermal or dot-matrix for hot kitchen line' },
    { category: 'kds', name: 'Kitchen Display System (KDS)', required: false, recommended: isRestaurant, notes: 'Paperless kitchen order monitor' },
  ];

  // 7. Theme
  const theme: PosConfiguration['theme'] = {
    mode: 'light',
    brandName: isLiquor ? '377 SPIRITS' : isSmoke ? 'SMOKE & VAPE DEPOT' : isGrocery ? 'FRESH MARKET' : isRestaurant ? 'BRAZOS BISTRO' : 'KABIRA POS',
    tagline: isLiquor ? 'Fine Liquors, Wine & Craft Beer' : isSmoke ? 'Premium Tobacco, Cigars & Vape' : isGrocery ? 'Locally Grown Produce & Provisions' : isRestaurant ? 'Scratch Kitchen & Craft Cocktails' : 'Smart Local Retail',
    primaryAccent: isLiquor ? '#C5A059' : isSmoke ? '#6366F1' : isGrocery ? '#10B981' : isRestaurant ? '#E11D48' : '#2563EB',
    customerDisplayTheme: {
      accentColor: isLiquor ? '#C5A059' : isSmoke ? '#6366F1' : isGrocery ? '#10B981' : isRestaurant ? '#E11D48' : '#2563EB',
      showPromotions: true,
      backgroundStyle: 'dark',
    },
  };

  const templateNames: Record<BusinessType, string> = {
    liquor: 'Modern Liquor Retail Template',
    smoke_shop: 'Specialty Smoke & Tobacco Template',
    grocery: 'High-Volume Supermarket & Deli Template',
    restaurant: 'Full-Service Dining & Bar Template',
    convenience: 'Rapid Convenience Store Template',
    retail: 'General Retail & Apparel Template',
    custom: 'Custom Modular POS Template',
  };

  return {
    id: `cfg-${businessType}-${storeId || 'company'}-${registerId || 'all'}-${Date.now()}`,
    businessId: 'kabira-biz-01',
    storeId,
    registerId,
    businessType,
    templateName: templateNames[businessType] || 'Custom Template',
    version: 1,
    isDraft: false,
    updatedAt: new Date().toISOString(),
    updatedBy: 'System Administrator',
    publishedAt: new Date().toISOString(),
    publishedBy: 'System Administrator',
    description: `Automated baseline configuration package for ${templateNames[businessType]}`,
    name: templateNames[businessType] || 'Custom Template',
    enabledFeatures,
    navigationItems,
    quickActions: quickActions.map(qa => ({ ...qa, action: qa.actionKey, hotkey: qa.shortcut })),
    checkoutWorkflow: checkoutWorkflow.map(cw => ({ ...cw, required: cw.mandatory })),
    layoutPanels,
    hardwareRequirements,
    theme: {
      ...theme,
      storeName: theme.brandName,
      accentColor: theme.primaryAccent,
    },
    features: MASTER_FEATURES.reduce((acc, f) => {
      acc[f.id] = enabledFeatures.includes(f.id);
      return acc;
    }, {} as Record<string, boolean>),
    layout: {
      elements: layoutPanels.map(p => ({
        id: p.id,
        name: p.name,
        position: p.componentKey,
        visible: p.enabled,
      })),
    },
    navigation: navigationItems.map(n => ({
      id: n.id,
      label: n.label,
      targetTab: n.tabKey,
      roles: n.roleRequired ? [n.roleRequired] : ['Cashier', 'Manager', 'Admin'],
    })),
    hardwareProfile: {
      receiptPrinterRequired: hardwareRequirements.some(h => h.category === 'printer' && h.required),
      barcodeScannerRequired: hardwareRequirements.some(h => h.category === 'scanner' && h.required),
      scaleRequired: hardwareRequirements.some(h => h.category === 'scale' && h.required),
      kitchenPrinterRequired: hardwareRequirements.some(h => h.category === 'kitchen_printer' && h.required),
      paymentTerminalRequired: hardwareRequirements.some(h => h.category === 'terminal' && h.required),
      cashDrawerRequired: hardwareRequirements.some(h => h.category === 'cash_drawer' && h.required),
    },
  };
}

export const DEFAULT_FEATURES = MASTER_FEATURES;
export const SAMPLE_STORES = INITIAL_STORES;
export const SAMPLE_REGISTERS = INITIAL_STORES.flatMap(s => s.registers);
export const INDUSTRY_TEMPLATES: Record<BusinessType, PosConfiguration> = {
  liquor: generateIndustryTemplateConfig('liquor'),
  smoke_shop: generateIndustryTemplateConfig('smoke_shop'),
  grocery: generateIndustryTemplateConfig('grocery'),
  restaurant: generateIndustryTemplateConfig('restaurant'),
  convenience: generateIndustryTemplateConfig('convenience'),
  retail: generateIndustryTemplateConfig('retail'),
  custom: generateIndustryTemplateConfig('custom'),
};

// Storage Key
const CONFIG_STORAGE_KEY = 'kabira_pos_hierarchy_configs_v1';
const DRAFT_STORAGE_KEY = 'kabira_pos_draft_configs_v1';
const HISTORY_STORAGE_KEY = 'kabira_pos_config_history_v1';
const ACTIVE_SELECTION_KEY = 'kabira_active_pos_target_v1';

class IndustryConfigService {
  private configs: Record<string, PosConfiguration> = {};
  private drafts: Record<string, PosConfiguration> = {};
  private versionHistory: ConfigVersionHistoryItem[] = [];
  private activeStoreId: string = 'store-1';
  private activeRegisterId: string = 'reg-1-01';

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      if (typeof window === 'undefined') return;

      const storedTarget = localStorage.getItem(ACTIVE_SELECTION_KEY);
      if (storedTarget) {
        const parsed = JSON.parse(storedTarget);
        this.activeStoreId = parsed.storeId || 'store-1';
        this.activeRegisterId = parsed.registerId || 'reg-1-01';
      }

      const storedConfigs = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (storedConfigs) {
        this.configs = JSON.parse(storedConfigs);
      } else {
        // Initialize default templates for company and sample stores
        this.initializeDefaultConfigs();
      }

      const storedDrafts = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (storedDrafts) {
        this.drafts = JSON.parse(storedDrafts);
      }

      const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (storedHistory) {
        this.versionHistory = JSON.parse(storedHistory);
      }
    } catch (e) {
      console.error('Failed to load POS configurations:', e);
      this.initializeDefaultConfigs();
    }
  }

  private saveToStorage() {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.configs));
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(this.drafts));
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(this.versionHistory));
      localStorage.setItem(
        ACTIVE_SELECTION_KEY,
        JSON.stringify({ storeId: this.activeStoreId, registerId: this.activeRegisterId })
      );
    } catch (e) {
      console.error('Failed to persist POS configurations:', e);
    }
  }

  private initializeDefaultConfigs() {
    // 1. Company default (Liquor store base)
    const companyConfig = generateIndustryTemplateConfig('liquor');
    this.configs['company_default'] = companyConfig;

    // 2. Store overrides for all 4 stores
    for (const store of INITIAL_STORES) {
      const storeConfig = generateIndustryTemplateConfig(store.businessType, store.id);
      this.configs[`store_${store.id}`] = storeConfig;

      // Also generate initial version history record
      this.versionHistory.unshift({
        version: 1,
        publishedAt: new Date().toISOString(),
        publishedBy: 'System Administrator',
        storeId: store.id,
        businessType: store.businessType,
        summary: `Initial factory configuration package for ${store.name}`,
        configSnapshot: storeConfig,
      });
    }

    this.saveToStorage();
  }

  // Active target getters & setters
  public getActiveStoreId(): string {
    return this.activeStoreId;
  }

  public getActiveRegisterId(): string {
    return this.activeRegisterId;
  }

  public setActiveTarget(storeId: string, registerId: string) {
    this.activeStoreId = storeId;
    this.activeRegisterId = registerId;
    this.saveToStorage();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('kabira_pos_target_changed', {
        detail: { storeId, registerId }
      }));
    }
  }

  public getStoreProfile(storeId: string): StoreProfile | undefined {
    return INITIAL_STORES.find(s => s.id === storeId);
  }

  public getAllStores(): StoreProfile[] {
    return INITIAL_STORES;
  }

  // Resolves hierarchy: Company Default -> Store Override -> Register Override (POS-CFG-001 to POS-CFG-004)
  public resolveActiveConfiguration(
    storeId?: string,
    registerId?: string,
    userRole?: string
  ): PosConfiguration {
    const effectiveStoreId = storeId || this.activeStoreId;
    const effectiveRegisterId = registerId || this.activeRegisterId;

    // 1. Start with company default
    const company = this.configs['company_default'] || generateIndustryTemplateConfig('liquor');

    // 2. Look for store override
    const storeOverride = this.configs[`store_${effectiveStoreId}`];

    // 3. Look for register override
    const registerOverride = this.configs[`reg_${effectiveRegisterId}`];

    // Base configuration merges company -> store -> register
    const base: PosConfiguration = {
      ...company,
      ...(storeOverride || {}),
      ...(registerOverride || {}),
      id: `resolved-${effectiveStoreId}-${effectiveRegisterId}`,
      storeId: effectiveStoreId,
      registerId: effectiveRegisterId,
    };

    // Role-based filtering (POS-RBAC-001 to POS-RBAC-003): Hide unauthorized actions from cashiers
    if (userRole === 'Cashier') {
      base.navigationItems = base.navigationItems.filter(nav => {
        if (nav.roleRequired === 'Admin' || nav.roleRequired === 'Manager') return false;
        return nav.enabled;
      });
      base.quickActions = base.quickActions.filter(act => {
        if (act.roleRequired === 'Admin' || act.roleRequired === 'Manager') return false;
        return act.enabled;
      });
    }

    return base;
  }

  // Draft Management (POS-PUB-001)
  public getDraft(storeId?: string, registerId?: string): PosConfiguration | null {
    const key = registerId ? `reg_${registerId}` : storeId ? `store_${storeId}` : 'company_default';
    return this.drafts[key] || null;
  }

  public saveDraft(config: PosConfiguration): void {
    const key = config.registerId
      ? `reg_${config.registerId}`
      : config.storeId
      ? `store_${config.storeId}`
      : 'company_default';

    this.drafts[key] = {
      ...config,
      isDraft: true,
      updatedAt: new Date().toISOString(),
    };
    this.saveToStorage();
  }

  // Dependency Validation (POS-FEAT-005, POS-FEAT-006)
  public validateDependencies(enabledFeatureIds: string[]): {
    isValid: boolean;
    missingDependencies: { featureId: string; featureName: string; missing: string[]; missingNames: string[] }[];
  } {
    const missingDependencies: { featureId: string; featureName: string; missing: string[]; missingNames: string[] }[] = [];
    const enabledSet = new Set(enabledFeatureIds);

    for (const featId of enabledFeatureIds) {
      const featDef = MASTER_FEATURES.find(f => f.id === featId);
      if (!featDef || !featDef.dependencies || featDef.dependencies.length === 0) continue;

      const unfulfilled = featDef.dependencies.filter(depId => !enabledSet.has(depId));
      if (unfulfilled.length > 0) {
        missingDependencies.push({
          featureId: featId,
          featureName: featDef.name,
          missing: unfulfilled,
          missingNames: unfulfilled.map(d => MASTER_FEATURES.find(f => f.id === d)?.name || d),
        });
      }
    }

    return {
      isValid: missingDependencies.length === 0,
      missingDependencies,
    };
  }

  // Automatically resolve and add all missing dependencies
  public resolveAllDependencies(enabledFeatureIds: string[]): string[] {
    const set = new Set(enabledFeatureIds);
    let changed = true;

    while (changed) {
      changed = false;
      for (const featId of Array.from(set)) {
        const featDef = MASTER_FEATURES.find(f => f.id === featId);
        if (featDef?.dependencies) {
          for (const dep of featDef.dependencies) {
            if (!set.has(dep)) {
              set.add(dep);
              changed = true;
            }
          }
        }
      }
    }

    return Array.from(set);
  }

  // Targeted Publishing (POS-PUB-003, POS-PUB-004, POS-PUB-005)
  public publishConfiguration(
    config: PosConfiguration,
    target: 'entire_business' | 'store' | 'register',
    publishedBy: string = 'Administrator',
    summary: string = 'Published updated POS configuration package'
  ): { success: boolean; version: number } {
    const newVersion = (config.version || 1) + 1;
    const publishedConfig: PosConfiguration = {
      ...config,
      version: newVersion,
      isDraft: false,
      publishedAt: new Date().toISOString(),
      publishedBy,
      updatedAt: new Date().toISOString(),
      updatedBy: publishedBy,
    };

    if (target === 'entire_business') {
      this.configs['company_default'] = publishedConfig;
      // Also propagate to stores if requested
    } else if (target === 'store' && config.storeId) {
      this.configs[`store_${config.storeId}`] = publishedConfig;
      delete this.drafts[`store_${config.storeId}`];
    } else if (target === 'register' && config.registerId) {
      this.configs[`reg_${config.registerId}`] = publishedConfig;
      delete this.drafts[`reg_${config.registerId}`];
    }

    // Record in Version History (POS-PUB-008)
    this.versionHistory.unshift({
      version: newVersion,
      publishedAt: publishedConfig.publishedAt!,
      publishedBy,
      storeId: config.storeId,
      registerId: config.registerId,
      businessType: config.businessType,
      summary,
      configSnapshot: JSON.parse(JSON.stringify(publishedConfig)),
    });

    // Keep up to 25 history items
    if (this.versionHistory.length > 25) {
      this.versionHistory = this.versionHistory.slice(0, 25);
    }

    this.saveToStorage();

    // Broadcast live config refresh to all terminals (POS-PUB-005)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('kabira_pos_config_refreshed', {
          detail: { storeId: config.storeId, registerId: config.registerId, version: newVersion },
        })
      );
    }

    return { success: true, version: newVersion };
  }

  // Rollback to previous version (POS-PUB-007)
  public rollbackVersion(version: number): boolean {
    const found = this.versionHistory.find(h => h.version === version);
    if (!found) return false;

    const restored = JSON.parse(JSON.stringify(found.configSnapshot));
    restored.version = (this.configs['company_default']?.version || 1) + 1;
    restored.publishedAt = new Date().toISOString();
    restored.publishedBy = 'Admin (Rollback)';

    if (restored.registerId) {
      this.configs[`reg_${restored.registerId}`] = restored;
    } else if (restored.storeId) {
      this.configs[`store_${restored.storeId}`] = restored;
    } else {
      this.configs['company_default'] = restored;
    }

    this.versionHistory.unshift({
      version: restored.version,
      publishedAt: restored.publishedAt,
      publishedBy: restored.publishedBy,
      storeId: restored.storeId,
      registerId: restored.registerId,
      businessType: restored.businessType,
      summary: `Rolled back to Version #${version} (${found.summary})`,
      configSnapshot: restored,
    });

    this.saveToStorage();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('kabira_pos_config_refreshed', {
          detail: { storeId: restored.storeId, version: restored.version },
        })
      );
    }

    return true;
  }

  public getVersionHistory(storeId?: string): ConfigVersionHistoryItem[] {
    if (!storeId) return this.versionHistory;
    return this.versionHistory.filter(h => !h.storeId || h.storeId === storeId);
  }

  // Reset to recommended industry layout (POS-LAYOUT-006)
  public resetToIndustryTemplate(businessType: BusinessType, storeId?: string, registerId?: string): PosConfiguration {
    const clean = generateIndustryTemplateConfig(businessType, storeId, registerId);
    return clean;
  }
}

export const industryConfigService = new IndustryConfigService();
