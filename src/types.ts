export type UserRole = 'Admin' | 'Manager' | 'Cashier';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;

  // Sensitive authentication fields exist only on the server-side user record.
  // Public /auth and /users responses intentionally omit them.
  pin?: string;
  password?: string;

  active: boolean;
  avatar?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  active: boolean;
  order: number;
  parentId?: string; // For subcategories (AP-CT-02)
  parentName?: string;
}

export interface Brand {
  id: string;
  name: string;
  country?: string;
  description?: string;
  active: boolean;
}

export interface Promotion {
  id: string;
  name: string;
  code: string;
  type: 'percentage' | 'fixed' | 'flat_amount';
  value: number; // e.g. 15 for 15% or 5 for $5.00
  startDate: string;
  endDate: string;
  active: boolean;
  targetType?: 'all' | 'category' | 'product';
  targetId?: string;
  targetName?: string;
  minSpend?: number;
  minPurchaseAmount?: number;
  maxDiscount?: number;
  usageCount?: number;
  currentUsages?: number;
  maxUsages?: number;
  fundingSource?: 'store' | 'manufacturer' | 'vendor';
  manufacturerName?: string;
  distributorName?: string;
  productHeading?: string;
  programType?: 'scan_data' | 'buydown' | 'rebate' | 'loyalty' | 'multipack' | 'vendor_promotion';
  customerPhoneRequired?: boolean;
  loyaltyRequired?: boolean;
  ageVerificationRequired?: boolean;
  reimbursementPerUnit?: number;
  reportingFrequency?: 'daily' | 'weekly' | 'monthly' | 'custom';
  exportTemplate?: string;
}

export type ScanDataSaleStatus = 'sale' | 'void' | 'refund';
export type ScanDataSubmissionStatus =
  | 'pending'
  | 'batched'
  | 'submitted'
  | 'accepted'
  | 'paid'
  | 'rejected'
  | 'excluded';

export interface ScanDataTransaction {
  id: string;
  orderId: string;
  orderNumber: string;
  orderCreatedAt: string;
  storeId: string;
  registerId: string;
  cashierId: string;
  cashierName: string;
  customerId?: string;
  customerPhoneToken?: string;
  productId: string;
  upc: string;
  productName: string;
  brandName?: string;
  productHeading: string;
  manufacturerName: string;
  distributorName?: string;
  programId: string;
  programCode: string;
  programName: string;
  programType?: Promotion['programType'];
  quantity: number;
  regularPrice: number;
  discountPerUnit: number;
  manufacturerDiscountTotal: number;
  customerPaid: number;
  expectedReimbursement: number;
  phoneRequired: boolean;
  loyaltyRequired: boolean;
  ageVerificationRequired: boolean;
  saleStatus: ScanDataSaleStatus;
  submissionStatus: ScanDataSubmissionStatus;
  exportBatchId?: string;
  reimbursementStatus?: 'pending' | 'expected' | 'paid' | 'disputed' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface ScanDataExportBatch {
  id: string;
  batchNumber: string;
  manufacturerName?: string;
  productHeading?: string;
  programId?: string;
  programName?: string;
  startDate?: string;
  endDate?: string;
  transactionIds: string[];
  transactionCount: number;
  expectedReimbursement: number;
  paidAmount?: number;
  exportTemplate: string;
  fileName: string;
  status: 'draft' | 'validated' | 'downloaded' | 'submitted' | 'accepted' | 'paid' | 'rejected';
  notes?: string;
  createdByUserId: string;
  createdByUserName: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  acceptedAt?: string;
  paidAt?: string;
}

export interface ManufacturerReimbursementSummary {
  manufacturerName: string;
  transactionCount: number;
  eligibleUnits: number;
  discountsGiven: number;
  expectedReimbursement: number;
  submittedAmount: number;
  acceptedAmount: number;
  paidAmount: number;
  outstandingAmount: number;
}

export interface Device {
  id: string;
  name: string;
  type: 'printer' | 'scanner' | 'cash_drawer' | 'card_reader' | 'terminal';
  model?: string;
  connection?: 'network' | 'usb' | 'bluetooth' | string;
  connectionType?: 'usb' | 'network' | 'bluetooth' | 'serial';
  ipAddress?: string;
  port?: number;
  isDefault?: boolean;
  paperWidth?: '58mm' | '80mm';
  status: 'online' | 'offline' | 'error' | 'connected' | 'idle';
  lastActive?: string;
  active?: boolean;
  createdAt?: string;
}

export type PosDevice = Device;

export interface ProductBarcode {
  id: string;
  barcode: string;
  type?: 'primary' | 'case' | 'pack' | 'alternate' | 'vendor';
  notes?: string;
}

export interface ProductLocation {
  aisle?: string;
  bay?: string;
  shelf?: string;
  position?: string;
  zone?: string;
}

export interface ProductChannelAvailability {
  pos: boolean;
  website: boolean;
  mobile: boolean;
  delivery: boolean;
}

export interface Product {
  id: string; // System-generated and immutable
  name: string;
  sku: string;
  barcode: string; // Primary UPC/barcode
  barcodes?: ProductBarcode[]; // Multi-barcode support (US-001)
  categoryId: string;
  categoryName?: string;
  subcategory?: string;
  brandId?: string;
  brandName?: string;
  brand?: string;
  price: number; // Regular price
  cost: number;
  costPrice?: number;
  promotionalPrice?: number;
  taxRate?: number; // e.g. 0.0825 (8.25%)
  taxCategory?: string; // Standard Liquor, Beer/Wine, Non-Taxable, etc.
  size: string; // e.g. "750ml", "1L", "6-Pack", "12 oz"
  unitType?: string; // Bottle, Can, Case, Pack, Keg
  packSize?: number; // e.g. 1, 6, 12, 24
  stockQuantity: number;
  lowStockThreshold: number;
  reorderLevel?: number;
  reorderQuantity?: number;
  imageUrl: string;
  description?: string;
  vendor?: string;
  vendorId?: string;
  vendorSku?: string;
  productHeading?: string;
  manufacturerName?: string;
  distributorName?: string;
  scanDataEligible?: boolean;
  defaultProgramId?: string;
  inventoryTracking?: boolean; // inventory tracking flag
  channelAvailability?: ProductChannelAvailability; // POS, Website, Mobile, Delivery
  sellOnline?: boolean;
  sellInStore?: boolean;
  ageRestriction?: number; // 21 for liquor/tobacco, 18 for lotto
  location?: ProductLocation;
  aisle?: string;
  bay?: string;
  shelf?: string;
  position?: string;
  onlineSettings?: any;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  discountAmount: number; // discount per item or total line discount
  discountReason?: string;
  manufacturerDiscountAmount?: number;
  manufacturerProgramId?: string;
  manufacturerProgramName?: string;
  manufacturerCompany?: string;
  manufacturerReimbursementExpected?: number;
  manufacturerOfferAvailable?: boolean;
  manufacturerEligibilityMessage?: string;
  taxAmount?: number;
  lineTotal?: number;
}

export interface LoyaltyTransaction {
  id: string;
  customerId: string;
  type: 'earned' | 'redeemed' | 'bonus' | 'adjustment' | 'refund_reversal';
  points: number; // positive or negative
  orderId?: string;
  orderNumber?: string;
  reason: string;
  balanceAfter?: number;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  loyaltyPoints: number;
  loyaltyTier?: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  totalSpent: number;
  orderCount: number;
  notes?: string;
  active: boolean;
  createdAt: string;
}

export type PaymentMethod =
  | 'cash'
  | 'card'
  | 'contactless'
  | 'split'
  | 'fallback'
  | 'card_terminal'
  | 'tap_to_pay_phone'
  | 'customer_qr'
  | 'cashier_manual'
  | 'customer_self_entry'
  | 'offline_store_forward';

export type CardFallbackMethod =
  | 'card_terminal'
  | 'tap_to_pay_phone'
  | 'customer_qr'
  | 'cashier_manual'
  | 'customer_self_entry';

export type PaymentSessionStatus =
  | 'qr_created'
  | 'customer_connected'
  | 'entering_payment'
  | 'processing'
  | 'authorized'
  | 'payment_complete'
  | 'failed'
  | 'cancelled'
  | 'expired';

export interface PaymentSession {
  id: string;
  orderNumber: string;
  amount: number;
  currency: string;
  method: CardFallbackMethod | 'split';
  mode: 'customer' | 'employee';
  status: PaymentSessionStatus;
  idempotencyKey: string;
  opaqueToken: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  registerId: string;
  cashierId: string;
  cashierName: string;
  fallbackReason?: string;
  failureReason?: string;
  failureCode?: string;
  isDeclined?: boolean;
  paymentResult?: {
    transactionId: string;
    token: string;
    brand: string;
    last4: string;
    authCode: string;
    capturedAt: string;
    entryMode: string;
  };
  orderPayload?: any;
}

export interface PaymentAuditLog {
  id: string;
  orderId?: string;
  orderNumber: string;
  paymentAttemptId: string;
  store: string;
  register: string;
  employeeId: string;
  employeeName: string;
  selectedMethod: string;
  processorTxId?: string;
  amount: number;
  result: 'authorized' | 'failed' | 'cancelled' | 'expired';
  deviceSessionRef: string;
  reasonForFallback?: string;
  failureCode?: string;
  timestamp: string;
}

export interface CashTenderEntry {
  id: string;
  amount: number;
  time: string;
}

export interface SplitPaymentDetails {
  splitType?: 'two_cards' | 'cash_card' | 'multiple';
  cashAmount?: number;
  cashEntries?: CashTenderEntry[];
  cardAmount?: number;
  cardBrand?: string;
  cardLast4?: string;
  authCode?: string;
  // Two Cards Support
  card1Amount?: number;
  card1Brand?: string;
  card1Last4?: string;
  card1Auth?: string;
  card2Amount?: number;
  card2Brand?: string;
  card2Last4?: string;
  card2Auth?: string;
  fallbackMethod1?: CardFallbackMethod;
  fallbackMethod2?: CardFallbackMethod;
}

export interface PaymentRecord {
  id: string;
  orderId?: string;
  method: PaymentMethod;
  amount: number;
  status: 'completed' | 'approved' | 'declined' | 'cancelled' | 'error' | 'timeout' | 'voided' | 'refunded';
  timestamp: string;
  cashierId: string;
  cashierName: string;
  registerId: string;
  paymentReference?: string;
  cardBrand?: string;
  cardLast4?: string;
  authCode?: string;
  declineReason?: string;
  notes?: string;
  cashTendered?: number;
  changeDue?: number;
}

export interface PaymentDetails {
  method: PaymentMethod;
  amount: number;
  cashTendered?: number;
  changeDue?: number;
  cashEntries?: CashTenderEntry[];
  cardLast4?: string;
  cardBrand?: string;
  authCode?: string;
  fallbackMethod?: CardFallbackMethod;
  processorTxId?: string;
  fallbackReason?: string;
  paymentSessionId?: string;
  splitDetails?: SplitPaymentDetails;
  payments?: PaymentRecord[];
  remainingBalance?: number;
  totalPaid?: number;
}

export type OrderStatus = 'completed' | 'voided' | 'refunded' | 'open' | 'partially_paid';

export interface Order {
  id: string;
  orderNumber: string; // e.g. "ORD-10492"
  cashierId: string;
  cashierName: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  items: CartItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  payment: PaymentDetails;
  payments?: PaymentRecord[];
  status: OrderStatus;
  pointsEarned?: number;
  pointsRedeemed?: number;
  pointsDiscountAmount?: number;
  customerLoyaltyBalance?: number;
  voidReason?: string;
  voidedBy?: string;
  refundReason?: string;
  refundAmount?: number;
  refundedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HeldOrder {
  id: string;
  holdNumber: string; // e.g. "HOLD-101"
  cashierId: string;
  cashierName: string;
  customer?: Customer;
  items: CartItem[];
  orderDiscountPercent: number;
  orderDiscountAmount: number;
  notes?: string;
  createdAt: string;
}

export interface InventoryAdjustment {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  oldQuantity: number;
  newQuantity: number;
  changeAmount: number;
  type: 'sale' | 'receive' | 'damaged' | 'missing' | 'recount' | 'return' | 'void_restore' | 'ai_shelf_count' | 'cycle_count';
  reason: string;
  userId: string;
  userName: string;
  createdAt: string;
  notes?: string;
  confidence?: number;
  imageUrl?: string;
  shelfLocation?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string; // e.g. "USER_LOGIN", "ORDER_CREATED", "BARCODE_SCAN", "DRAWER_OPEN", etc.
  targetType: 'product' | 'order' | 'user' | 'inventory' | 'customer' | 'settings' | 'shift' | 'auth' | 'system' | string;
  targetId: string;
  details: string;
  beforeData?: any;
  afterData?: any;
  oldValue?: string;
  newValue?: string;
  ipAddress?: string;
  deviceId?: string;
  terminalId?: string;
  module?: string;
  timestamp: string;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  phone: string;
  email: string;
  website?: string;
  logoUrl?: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  cityStateZip: string;
  taxId: string;
  currency?: string;
  currencySymbol?: string;
  timezone?: string;
  defaultTaxRate: number; // e.g. 0.0825
  requireManagerDiscountAbove: number; // e.g. 20 (%)
  requireManagerToOpenDrawerNoSale?: boolean; // Default false: cashier can open drawer directly
  customerDisplayFullscreen?: boolean; // Default true: launch customer display locked/borderless on Display 2

  // General POS display & usability settings
  useOnScreenKeypad?: boolean;
  showFixedKeypad?: boolean;
  autoLaunchCustomerScreen?: boolean;
  customerDisplayShowTotal?: boolean;
  customerDisplayShowPrice?: boolean;
  customerDisplayShowCustomerNumber?: boolean;
  customerDisplayShowSaleNotes?: boolean;
  alwaysShowShortcuts?: boolean;
  webOrderNotificationsEnabled?: boolean;
  hideTotalDetails?: boolean;
  tasklistNotificationSound?: 'none' | 'beep' | 'chime';
  searchFontSizePx?: number;
  windowZoomPercent?: number;
  posScreenFontSizePx?: number;
  customerScreenFontSizePx?: number;
  customerScreenZoomPercent?: number;
  applicationVersionLabel?: string;
  electronAppVersionLabel?: string;

  allowedPaymentMethods?: {
    cash: boolean;
    card: boolean;
    contactless: boolean;
    split: boolean;
  };
  enableCash?: boolean;
  enableCard?: boolean;
  enableContactless?: boolean;
  enableSplit?: boolean;
  paymentProvider?: 'stripe_terminal' | 'square_terminal' | 'pax_d210' | 'clover' | 'verifone';
  paymentTerminalIp?: string;
  paymentEnvironment?: 'sandbox' | 'production';
  // Card Fallback Controls (PAY-001 to PAY-028)
  paymentFallbackEnabled?: boolean;
  cashierManualCardEntry?: 'enabled' | 'all_cashiers' | 'manager_required' | 'disabled'; // Default: manager_required
  customerSelfEnterCard?: 'all_cashiers' | 'manager_required' | 'disabled';
  customerSelfEntryEnabled?: boolean; // Default: true
  tapToPayPhoneEnabled?: boolean; // Default: true
  customerQrPaymentEnabled?: boolean; // Default: true
  terminalAutoFallbackOnFailure?: boolean; // Default: true
  offlineStoreAndForwardEnabled?: boolean; // Default: true (PAY-027)
  paymentSessionExpiryMinutes?: number;
  receiptHeader?: string;
  receiptFooter: string;
  scannerSound: boolean;
  // Loyalty Program Settings
  loyaltyProgramEnabled?: boolean;
  loyaltyPointsPerDollar: number; // Configurable points earned per $1 spent (e.g. 1 pt = $1 spent)
  loyaltyPointsPerDollarDiscount: number; // Configurable points needed for $1 discount (e.g. 20 pts = $1.00 off, or 100 pts = $5 off)
  loyaltyMinPointsToRedeem: number; // Minimum points required to redeem (e.g. 50 pts)
  loyaltyMaxDiscountPercent: number; // Max % of order total that can be discounted via points (e.g. 50%)
  loyaltySignupBonusPoints: number; // Bonus points awarded upon new customer registration (e.g. 50 pts)
  // Smart Inventory & Cost Update Settings (IN-SC-10, IN-SC-11, IN-SC-15)
  autoUpdateProductCost?: boolean; // When true, automatically update master cost on confirmation; when false, require manager approval
  targetProfitMarginPercent?: number; // Target markup margin (e.g. 35%) for recommended selling price
  defaultReceivingLocation?: string; // Default stockroom location (e.g. "Main Liquor Storage", "Front Sales Floor")
  autoPrintLabelOnNewItem?: boolean; // Auto-print item label when a manager creates a new inventory item
  autoPrintLabelOnPriceChange?: boolean; // Auto-print updated label when a manager changes retail price
  autoPrintLabelCopies?: number; // Number of labels to auto-print per trigger
  // Admin Pos Button Visibility & Delegation
  adminAllowedPosButtons?: {
    allowScaleForCashier?: boolean;
    allowScaleForManager?: boolean;
    allowTablesForCashier?: boolean;
    allowTablesForManager?: boolean;
    allowKdsForCashier?: boolean;
    allowKdsForManager?: boolean;
    allowDesignerForCashier?: boolean;
    allowDesignerForManager?: boolean;
  };
  // Direct Receipt Printing Configuration (No Windows Print Dialog)
  directReceiptPrinting?: {
    enabled?: boolean;
    autoPrintOnSale?: boolean;
    primaryPrinterName?: string;
    fallbackPrinterName?: string;
    printCustomerCopy?: boolean;
    printMerchantCopy?: boolean;
    cutPaperAfterPrint?: boolean;
  };
  // Cashier Access & RBAC Controls
  cashierPermissions?: {
    allowInventory?: boolean;
    allowReports?: boolean;
    allowAllFunctions?: boolean;
    allowCheckIssuanceRegister?: boolean;
    allowDepositBatches?: boolean;
  };
}

export interface Vendor {
  id: string; // e.g. "vnd-1" or "VND-001"
  name: string;
  normalizedName?: string;
  aliases?: string[];
  accountNumber?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  taxId?: string; // EIN or Liquor License
  source?: 'Manual' | 'Invoice Scan';
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  vendorItemNumber?: string;
  upc?: string;
  sku?: string;
  quantity: number; // Quantity invoiced (cases or units)
  unitSize?: string; // e.g. "750ml", "1L", "Case 12pk"
  isCaseOrPack?: boolean;
  packSize?: number; // e.g. 12 bottles per case
  totalInventoryUnits: number; // calculated sellable inventory units (e.g. 2 cases * 12 = 24)
  unitCost: number; // cost per sellable unit
  caseCost?: number;
  extendedCost: number;
  discount?: number;
  lineTotal: number;

  // Matching (IN-SC-06, IN-SC-13)
  matchedProductId?: string;
  matchedProductName?: string;
  matchedProductSku?: string;
  matchType?: 'upc' | 'sku' | 'vendor_item' | 'name' | 'manual' | 'unmatched';
  confidence: number; // 0 to 100
  status: 'matched' | 'review' | 'new_product' | 'ignored';
  warningMessage?: string;

  // Cost & Margin impact (IN-SC-10, IN-SC-11)
  currentCost?: number;
  costDiff?: number;
  costDiffPercent?: number;
  currentPrice?: number;
  oldMargin?: number;
  newMargin?: number;
  suggestedPrice?: number;
  updateMasterCost?: boolean;

  // Missing product preparation (IN-SC-08)
  newProductDetails?: {
    name: string;
    brand?: string;
    categoryId: string;
    sku: string;
    barcode: string;
    size: string;
    cost: number;
    price: number;
    taxRate: number;
    imageUrl?: string;
    stockQuantity?: number;
  };
}

export interface ScannedInvoice {
  id: string;
  invoiceNumber: string; // e.g. "INV-98452"
  invoiceDate: string; // e.g. "2026-09-08"
  receivedDate: string;
  vendorId?: string;
  vendorName: string;
  vendorStatus: 'existing' | 'new';
  vendorInfo?: Partial<Vendor>;
  subtotal: number;
  taxAmount: number;
  freightAmount?: number;
  totalAmount: number;
  lineItems: InvoiceLineItem[];
  status: 'draft' | 'review_required' | 'confirmed' | 'failed';
  notes?: string;
  fileDataUrl?: string; // Original invoice file preserved (IN-SC-01, IN-SC-16)
  fileName?: string;
  fileType?: string;
  fileFingerprint?: string; // Duplicate detection (IN-SC-14)
  extractedConfidence: number;
  processingWarnings?: string[];
  receivedByUserId?: string;
  receivedByUserName?: string;
  receivingLocation?: string; // IN-SC-15
  isDuplicate?: boolean;
  duplicateWarning?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryReceivingTransaction {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  vendorId: string;
  vendorName: string;
  productId: string;
  productName: string;
  sku: string;
  receivedQuantity: number;
  previousQuantity: number;
  newQuantity: number;
  unitCost: number;
  totalCost: number;
  employeeId: string;
  employeeName: string;
  receivingLocation: string;
  timestamp: string;
}

export interface VendorProductMapping {
  id: string;
  vendorId: string;
  vendorItemNumber?: string;
  vendorDescription: string;
  productId: string;
  packSize?: number;
  lastUpdated: string;
}

export interface VendorPurchaseStats {
  vendor: Vendor;
  totalPurchases: number;
  totalInvoicesCount: number;
  productsPurchasedCount: number;
  latestCost: number;
  averageCost: number;
  lastPurchaseDate?: string;
  purchaseFrequency: string; // e.g. "Weekly", "Bi-Weekly", "Monthly"
  invoices: ScannedInvoice[];
}

export interface SalesReport {
  period: string;
  totalSales: number;
  completedOrdersCount: number;
  averageOrderValue: number;
  discountsTotal: number;
  taxTotal: number;
  refundsTotal: number;
  salesByPaymentMethod: Record<string, number>;
  topSellingProducts: Array<{
    name: string;
    quantitySold: number;
    revenue: number;
  }>;
  cashierPerformance: Array<{
    cashierName: string;
    orderCount: number;
    totalSales: number;
    averageTicket: number;
  }>;
  inventoryValuation: {
    totalUnitsOnHand: number;
    inventoryCostValue: number;
    inventoryRetailValue: number;
    lowStockItemCount: number;
  };
}

// ----------------------------------------------------
// INV-01 to INV-18: QR Code & Mobile Invoice Upload
// ----------------------------------------------------
export type UploadSessionStatus =
  | 'waiting_for_scan'
  | 'phone_connected'
  | 'uploading'
  | 'processing'
  | 'ready_for_review'
  | 'completed'
  | 'failed'
  | 'expired'
  | 'cancelled';

export interface InvoiceUploadSession {
  id: string; // e.g. "sess-1725800000"
  storeId: string;
  storeName: string;
  token: string;
  status: UploadSessionStatus;
  statusMessage?: string;
  expiresAt: string; // ISO date string
  createdAt: string;
  phoneConnectedAt?: string;
  uploadedAt?: string;
  fileDataUrls?: string[]; // Supports multiple invoice pages (INV-03)
  fileNames?: string[];
  extractedInvoice?: ScannedInvoice;
  error?: string;
  createdByUserId: string;
  createdByUserName: string;
}

// ----------------------------------------------------
// INV-MB-01 to INV-MB-20: Multi-Barcode Receiving Session
// ----------------------------------------------------
export interface BarcodeReceivingLine {
  id: string;
  barcode: string;
  caseBarcode?: string;
  productId: string;
  productName: string;
  sku: string;
  size: string;
  categoryName?: string;
  currentStock: number;
  receivedUnits: number; // sellable units received
  casesScanned?: number;
  packSize: number; // e.g. 12 bottles per case
  newStock: number; // currentStock + receivedUnits
  unitCost: number;
  extendedCost: number;
  previousCost: number;
  costDiff: number;
  costDiffPercent: number;
  currentPrice: number;
  oldMargin: number;
  newMargin: number;
  updateCost: boolean;
  expectedInvoiceQty?: number; // for comparison (INV-MB-10)
  matchStatus?: 'match' | 'short' | 'extra' | 'untracked';
  status: 'valid' | 'unknown_barcode' | 'pending';
}

export interface BarcodeReceivingSession {
  id: string; // e.g. "mb-sess-1725800000"
  receivingNumber: string; // e.g. "RCV-2026-09842"
  vendorId?: string;
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  status: 'draft' | 'reviewing' | 'completed' | 'cancelled';
  receivingLocation: string;
  lines: BarcodeReceivingLine[];
  totalUniqueProducts: number;
  totalUnitsReceived: number;
  totalCost: number;
  expectedTotalUnits?: number;
  notes?: string;
  createdByUserId: string;
  createdByUserName: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

// ----------------------------------------------------
// SR-01 to SR-25: Shift Management Types
// ----------------------------------------------------
export interface ShiftDenominationCount {
  // Current POS reconciliation UI keys.
  hundreds?: number;
  fifties?: number;
  twenties?: number;
  tens?: number;
  fives?: number;
  ones?: number;
  halves?: number;
  quarters?: number;
  dimes?: number;
  nickels?: number;
  pennies?: number;
  rolls?: number; // direct dollar amount for loose/rolled coin

  // Legacy stored reconciliation keys kept for backward compatibility.
  d100?: number; // $100 bills
  d50?: number;  // $50 bills
  d20?: number;  // $20 bills
  d10?: number;  // $10 bills
  d5?: number;   // $5 bills
  d2?: number;   // $2 bills
  d1?: number;   // $1 bills
  c50?: number;  // 50¢ coins
  c25?: number;  // 25¢ quarters
  c10?: number;  // 10¢ dimes
  c5?: number;   // 5¢ nickels
  c1?: number;   // 1¢ pennies
}

export interface ShiftPaymentMethodBreakdown {
  method: string;
  label: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface ShiftHourlySales {
  hour: string; // e.g. "09:00", "10:00"
  sales: number;
  transactions: number;
}

export interface ShiftTopProduct {
  productId: string;
  name: string;
  sku: string;
  quantitySold: number;
  salesAmount: number;
}

export interface ShiftReconciliation {
  actualCash: number;
  expectedCash: number;
  variance: number; // actualCash - expectedCash
  status: 'balanced' | 'over' | 'short';
  isVarianceMaterial: boolean;
  toleranceAmount: number;
  denominations: ShiftDenominationCount;
  reconciliationNote?: string;
  managerApproved?: boolean;
  managerApprovedBy?: string;
  managerApprovalReason?: string;
  managerApprovalTime?: string;
}

export interface ShiftSummarySnapshot {
  grossSales: number;
  netSales: number;
  taxCollected: number;
  discountsTotal: number;
  refundsTotal: number;
  voidsTotal: number;
  payoutsTotal: number;
  paidInTotal: number;
  totalTransactions: number;
  itemsSold: number;
  averageOrderValue: number;
  cashSales: number;
  cashRefunds: number;
  startingCash: number;
  expectedCash: number;
  expectedCashInDrawer?: number;
  cardSales?: number;
  paymentMethods?: Record<string, { count: number; amount: number; label: string }>;
  checksCashedVolume?: number;
  checksCashedCount?: number;
  cashDropsTotal?: number;
  totalOrders?: number;
  actualCash?: number;
  variance?: number;
  paymentBreakdown: ShiftPaymentMethodBreakdown[];
  hourlyTrends: ShiftHourlySales[];
  topProducts: ShiftTopProduct[];
}

export interface ShiftCashMovement {
  id: string;
  shiftId: string;
  type: 'cash_in' | 'cash_drop' | 'payout' | 'paid_in';
  amount: number;
  reason: string;
  userId: string;
  userName: string;
  timestamp: string;
}

export interface Shift {
  id: string; // e.g. "SH-1001"
  shiftNumber: string;
  storeId: string;
  registerId: string;
  registerName: string;
  cashierId: string;
  cashierName: string;
  status: 'open' | 'closed';
  startTime: string;
  endTime?: string;
  startingCash: number;
  startingCashInherited?: boolean;
  currentSales?: number;
  transactionCount?: number;
  cashMovements?: ShiftCashMovement[];
  reconciliation?: ShiftReconciliation;
  summary?: ShiftSummarySnapshot;
  previousShiftComparison?: {
    netSalesChangePercent: number;
    transactionsChangePercent: number;
  };
  notes?: string;
  closedByUserId?: string;
  closedByUserName?: string;
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------
// CK-01 to CK-34: Check Management & Issuance Types
// ----------------------------------------------------
export interface BankAccount {
  id: string;
  accountName: string;
  bankName: string;
  accountNumberMasked: string; // e.g. "****8921"
  accountNumber?: string;
  routingNumber: string; // 9-digit
  nextCheckNumber: number;
  balance: number;
  active: boolean;
}

export interface CheckStubAllocation {
  id: string;
  invoiceId?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  originalAmount?: number;
  amountPaid: number;
  remainingBalance?: number;
  description?: string; // e.g. "Regular Bi-Weekly Payroll", "Travel Expense"
}

export interface IssuedCheck {
  id: string; // e.g. "CHK-1001"
  checkNumber: string;
  payeeType: 'employee' | 'vendor';
  payeeId: string;
  payeeName: string;
  payeeAddress: string;
  payeeEmail?: string;
  payeePhone?: string;
  amount: number;
  writtenAmount: string; // e.g. "One Thousand Two Hundred Fifty and 00/100 Dollars"
  date: string; // YYYY-MM-DD
  bankAccountId: string;
  bankAccountName: string;
  bankAccountNumberMasked: string;
  routingNumber: string;
  memo: string;
  paymentCategory: 'Payroll' | 'Reimbursement' | 'Bonus' | 'Commission' | 'Vendor Invoice' | 'Expense' | 'Other';
  allocations: CheckStubAllocation[];
  sourceRecordId?: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'printed' | 'cleared' | 'voided' | 'reissued';
  approvalRequiredRole?: 'Admin' | 'Manager' | 'Owner';
  createdByUserId: string;
  createdByUserName: string;
  approvedByUserId?: string;
  approvedByUserName?: string;
  approvedAt?: string;
  rejectedReason?: string;
  printCount: number;
  printedAt?: string;
  printedByUserId?: string;
  printedByUserName?: string;
  reprintReason?: string;
  isReprint?: boolean;
  voidReason?: string;
  voidedAt?: string;
  voidedByUserId?: string;
  voidedByUserName?: string;
  reissuedCheckId?: string;
  reissuedFromCheckId?: string;
  templateLayout: 'check_top' | 'check_middle' | 'check_bottom';
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------
// CC-001 to CC-077: Check Cashing Module Types
// ----------------------------------------------------
export type CheckType = 'payroll' | 'government' | 'business' | 'insurance' | 'personal';

export type CheckCashingStatus =
  | 'draft'
  | 'waiting_customer'
  | 'ready_for_review'
  | 'in_review'
  | 'needs_manager_approval'
  | 'approved'
  | 'declined'
  | 'paid'
  | 'ready_for_deposit'
  | 'deposit_batch'
  | 'deposited'
  | 'cleared'
  | 'returned';

export interface CheckIssuer {
  id: string; // e.g. "iss-1"
  name: string;
  bankName: string;
  routingNumber: string;
  accountNumberMasked: string;
  phone?: string;
  address?: string;
  totalChecksCashed: number;
  totalAmountCashed: number;
  returnedChecksCount: number;
  riskRating: 'low' | 'medium' | 'high' | 'blocked';
  status: 'verified' | 'unverified' | 'blocked';
  createdAt: string;
  updatedAt?: string;
}

export interface CheckFeeRule {
  id: string;
  checkType: CheckType;
  label: string;
  feePercent: number; // e.g. 2.0%
  minFee: number;     // e.g. $3.00
  maxFee?: number;    // e.g. $50.00
  description: string;
  active: boolean;
}

export interface CheckCashingTransaction {
  id: string; // e.g. "CC-10241"
  transactionNumber: string;
  storeId: string;
  registerId: string;
  cashierId: string;
  cashierName: string;
  
  // Customer
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerIdType: string; // 'Driver License', 'Passport', 'State ID'
  customerIdNumber: string;
  customerIdState?: string;
  customerIdExp?: string;
  customerIdFrontUrl?: string;
  customerIdBackUrl?: string;
  idConfidence?: number;
  idReviewWarnings?: string[];

  // Check details
  checkType: CheckType;
  checkNumber: string;
  checkDate: string;
  checkAmount: number;
  micrRoutingNumber: string;
  micrAccountNumber: string;
  checkFrontUrl?: string;
  checkBackUrl?: string;
  ocrConfidence?: number;
  ocrExtracted?: boolean;

  // Issuer
  issuerId: string;
  issuerName: string;
  issuerBankName: string;
  issuerPhone?: string;
  issuerRiskRating?: 'low' | 'medium' | 'high' | 'blocked';

  // Duplicate Check Detection
  isDuplicate: boolean;
  duplicateMatchNote?: string;

  // Fee & Payout
  feePercent: number;
  calculatedFee: number;
  feeMin: number;
  feeMax?: number;
  finalFee: number;
  feeOverride: boolean;
  feeOverrideReason?: string;
  feeOverriddenBy?: string;
  customerPayoutAmount: number; // checkAmount - finalFee

  // Risk Review & Manager Approvals
  requiresManagerApproval: boolean;
  reviewReasons: string[];
  status: CheckCashingStatus;
  managerDecision?: 'APPROVE' | 'HOLD' | 'REQUEST_INFO' | 'DECLINE';
  managerDecisionNote?: string;
  managerDecisionBy?: string;
  managerDecisionAt?: string;

  // Payout details
  paidAt?: string;
  paidByUserId?: string;
  paidByUserName?: string;
  payoutMethod: 'cash';

  // Deposit Batch
  depositBatchId?: string;
  depositBatchNumber?: string;

  // Returned Check Management
  returnDate?: string;
  returnReason?: string;
  bankReturnReference?: string;
  additionalReturnFee?: number;
  recoveryStatus?: 'outstanding' | 'payment_arrangement' | 'partially_recovered' | 'recovered' | 'written_off';
  recoveredAmount?: number;
  recoveryNotes?: string;

  createdAt: string;
  updatedAt: string;
}

export interface DepositBatch {
  id: string; // e.g. "DEP-2026-001"
  batchNumber: string;
  depositDate: string;
  bankAccountId: string;
  bankAccountName: string;
  depositBankName?: string;
  checkIds: string[];
  checksCount: number;
  checkCount?: number;
  totalAmount: number;
  status: 'created' | 'deposited' | 'cleared';
  createdById: string;
  createdByName: string;
  depositedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface CheckQrSession {
  id: string;
  token: string;
  status: 'waiting_for_scan' | 'qr_scanned' | 'uploading_id' | 'uploading_check' | 'processing' | 'ready_for_review';
  expiresAt: string;
  customerData?: {
    name: string;
    phone: string;
    idType: string;
    idNumber: string;
    idFrontUrl?: string;
    idBackUrl?: string;
    checkFrontUrl?: string;
    checkBackUrl?: string;
    checkAmount?: number;
    checkNumber?: string;
    issuerName?: string;
    checkType?: CheckType;
  };
  createdAt: string;
}

// ----------------------------------------------------
// WEB-001 to WEB-054: Online Store & eCommerce Integration
// ----------------------------------------------------

export type WebsiteStatus = 'draft' | 'publishing' | 'live' | 'offline';
export type WebsiteTheme = 'liquor_store' | 'modern_retail' | 'craft_beverage' | 'minimal_boutique';

export interface OnlineStoreConfig {
  id: string;
  businessId: string;
  storeId: string;
  enabled?: boolean;
  websiteStatus: WebsiteStatus;
  subdomain: string; // e.g. "377spirits.yourpos.com"
  customDomain?: string; // e.g. "www.377spirits.com"
  hasSsl: boolean;
  sslStatus: 'active' | 'pending' | 'failed';
  storeName: string;
  tagline: string;
  description?: string;
  theme: WebsiteTheme;
  primaryColor: string;
  accentColor: string;
  logoUrl: string;
  heroBannerUrl: string;
  announcementBar: string;
  showAnnouncement: boolean;
  phone: string;
  email: string;
  address: string;
  businessHours: string;
  enableInStorePickup: boolean;
  pickupPrepTimeMinutes: number;
  pickupInstructions: string;
  enableLocalDelivery: boolean;
  deliveryRadiusMiles: number;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  minDeliveryOrder: number;
  ageGateRequired: boolean;
  autoPublishNewProducts: boolean;
  defaultSafetyStock: number;
  hideOutOfStock: boolean;
  publishedVersion: number;
  lastPublishedAt?: string;
  navigationMenuItems?: { id: string; label: string; link: string; active: boolean; order?: number }[];
  createdAt: string;
  updatedAt: string;
}

export interface OnlineProductSettings {
  productId: string;
  sellOnline: boolean;
  sellInStore: boolean;
  pickupAvailable: boolean;
  deliveryAvailable: boolean;
  shippingAvailable?: boolean;
  onlinePrice?: number; // Optional online-specific price override (WEB-015)
  onlineSalePrice?: number;
  safetyStock: number; // Safety cushion (WEB-008)
  onlineDescription?: string;
  additionalImages?: string[];
  isAllocated?: boolean; // Rare allocation badge (WEB-036)
  isFeatured?: boolean;
  updatedAt?: string;
}

export type OnlineOrderStatus =
  | 'new'
  | 'accepted'
  | 'preparing'
  | 'ready_for_pickup'
  | 'out_for_delivery'
  | 'completed'
  | 'cancelled'
  | 'refunded';

export interface OnlineOrderItem {
  productId: string;
  productName: string;
  sku: string;
  size: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  imageUrl?: string;
}

export interface OnlineOrder {
  id: string;
  orderNumber: string; // e.g. "WEB-1042"
  posOrderId?: string;
  source: 'web';
  status: OnlineOrderStatus;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  isGuest: boolean;
  fulfillmentType: 'pickup' | 'delivery';
  pickupTimeSlot?: string;
  deliveryAddress?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    deliveryInstructions?: string;
  };
  items: OnlineOrderItem[];
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  promoCode?: string;
  taxAmount: number;
  tipAmount: number;
  totalAmount: number;
  paymentStatus: 'paid' | 'pending' | 'failed' | 'refunded';
  paymentMethod: 'card' | 'apple_pay' | 'google_pay' | 'gift_card';
  cardBrand?: string;
  cardLast4?: string;
  ageVerified21: boolean;
  ageVerifiedAtPickupOrDelivery?: boolean;
  verifiedById?: string;
  verifiedByName?: string;
  notes?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OnlineCoupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed_amount';
  value: number; // e.g. 10 for 10% or 5 for $5.00
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  active: boolean;
  description: string;
  usageCount: number;
  expiresAt?: string;
}

export interface StoreLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  isCurrentLocation: boolean;
  pickupAvailable: boolean;
  deliveryAvailable: boolean;
}

// ----------------------------------------------------
// AI Inventory Shelf Counting & Bottle Recount Types
// ----------------------------------------------------

export interface AiDetectedBottle {
  productId?: string;
  productName: string;
  matchedCatalogName?: string;
  size?: string;
  detectedCount: number;
  currentPosStock: number;
  variance: number; // detectedCount - currentPosStock
  confidence: number; // e.g. 96
  brand?: string;
  shelfSection?: string;
}

export interface AiShelfCountSession {
  id: string;
  shelfLocation: string; // e.g. "Whiskey Shelf A - Top Row"
  photoUrl: string;
  totalBottlesDetected: number;
  items: AiDetectedBottle[];
  appliedToPos: boolean;
  appliedAt?: string;
  operatorId: string;
  operatorName: string;
  notes?: string;
  createdAt: string;
}

// ----------------------------------------------------
// POS Bridge Hardware & Local Device Integration Types (PB-001 - PB-040)
// ----------------------------------------------------

export type PosBridgeStatus = 'connected' | 'starting' | 'degraded' | 'offline';

export type PosBridgeDeviceType =
  | 'receipt_printer'
  | 'cash_drawer'
  | 'barcode_scanner'
  | 'customer_display'
  | 'payment_terminal'
  | 'label_printer'
  | 'scale';

export type PosDeviceStatus = 'online' | 'offline' | 'error' | 'testing' | 'fallback_active';

export interface PosBridgeDeviceInfo {
  id: string;
  type: PosBridgeDeviceType;
  name: string;
  status: PosDeviceStatus;
  connectionType: 'usb' | 'network' | 'serial' | 'bluetooth' | 'windows_spooler';
  model: string;
  isFallback?: boolean;
  lastHeartbeat: string;
  details?: string;
}

export interface PosBridgeBarcodeScanEvent {
  barcode: string;
  source: string;
  timestamp: string;
  pipeline: string;
  found: boolean;
  product?: Product & { effectivePrice?: number; discounts?: any[] };
  inventoryAvailable?: number;
  message?: string;
}

export interface PosBridgeConfig {
  // Bridge metadata (PB-001 - PB-003)
  bridgeStatus: PosBridgeStatus;
  bridgeVersion: string;
  localEndpoint: string;
  startMode: 'windows_service' | 'auto_startup' | 'manual';
  lastHeartbeat: string;
  runtime: '.NET 8 Worker Service (Free Open-Source)';

  // Receipt Printer (PB-006, PB-010 - PB-013)
  primaryPrinter: string;
  fallbackPrinter: string;
  paperWidth: '80mm' | '58mm';
  autoPrintReceipts: 'all_sales' | 'cash_only' | 'refunds_only' | 'manual_only';
  receiptCopies: number;
  autoCutPaper: boolean;

  // Cash Drawer (PB-006, PB-014, PB-015)
  drawerConnectionMethod: 'printer_pulse' | 'rj12_serial' | 'usb_direct';
  autoOpenDrawerOnCash: boolean;
  requireManagerPinManualDrawer: boolean;
  requireReasonManualDrawer: boolean;
  drawerKickPin: 'pin_2' | 'pin_5';

  // Barcode Scanner (PB-006, PB-016, PB-017)
  barcodeScannerMode: 'hid_keyboard_wedge' | 'bridge_managed';
  scannerPrefix: string;
  scannerSuffix: string;

  // Customer Display (PB-006, PB-018, PB-019)
  customerDisplayMode: 'second_monitor' | 'usb_pole' | 'vfd_serial';
  customerDisplayEnabled: boolean;
  customerWelcomeMessage: string;
  customerPromoRotation: string[];

  // Payment Terminal Adapter (PB-006, PB-020, PB-021)
  paymentTerminalAdapter: 'clover' | 'verifone_point' | 'pax_broadpos' | 'dejavoo' | 'stripe_terminal';
  paymentDeviceId: string;
  paymentTerminalIp: string;
  paymentTerminalPort: number;

  // Label Printer (PB-006, PB-038)
  labelPrinterModel: string;
  labelSize: '2x1' | '1.5x1' | '3x2';
  labelTemplate: 'shelf_tag_retail' | 'bottle_barcode' | 'sale_promo_tag';

  // Scale Support (PB-006, PB-039)
  scaleEnabled: boolean;
  scalePort: string;
  scaleProtocol: 'mettler_toledo' | 'nci' | 'cas_pd2';
  scaleUnits: 'lb' | 'kg';

  // Offline & Sync (PB-006, PB-027 - PB-029)
  offlineAllowed: boolean;
  maxOfflineQueueHours: number;
}

export interface PrintJobRecord {
  printJobId: string;
  orderId?: string;
  orderNumber?: string;
  timestamp: string;
  printerUsed: string;
  wasFallback: boolean;
  status: 'success' | 'queued' | 'failed';
  retryCount: number;
  reason?: string;
  userName?: string;
}

export interface CashDrawerEvent {
  id: string;
  timestamp: string;
  registerId: string;
  type: 'sale_cash' | 'sale_split' | 'lotto_payout' | 'manual_open' | 'test_kick' | 'audit';
  userName: string;
  userRole: string;
  orderNumber?: string;
  amount?: number;
  reason?: string;
  managerPinUsed?: boolean;
}

export interface BridgeLogEntry {
  id: string;
  timestamp: string;
  registerId: string;
  component: 'BridgeCore' | 'Printer' | 'Drawer' | 'Scanner' | 'Display' | 'PaymentTerminal' | 'OfflineQueue' | 'Scale';
  level: 'info' | 'warn' | 'error';
  message: string;
  correlationId: string;
}

export interface CustomerDisplayState {
  screenState:
    | 'welcome'
    | 'active_cart'
    | 'payment_processing'
    | 'customer_qr'
    | 'customer_self_entry'
    | 'thank_you';
  storeName: string;
  tagline: string;
  items: {
    name: string;
    size: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  tenderedAmount?: number;
  changeDue?: number;
  welcomeMessage?: string;
  promoBanner?: string;
  lastScannedItem?: string;
  // Fallback Payment Screen Sync (PAY-003, PAY-004, PAY-011)
  paymentQrUrl?: string;
  paymentSessionId?: string;
  paymentAmount?: number;
  paymentStatusText?: string;
  paymentFallbackMethod?: CardFallbackMethod;
}

// ----------------------------------------------------
// OMNICHANNEL & UNIFIED PLATFORM TYPES (EPICS 1 - 16)
// ----------------------------------------------------

export type InventoryMovementReason =
  | 'pos_sale'
  | 'web_order_reservation'
  | 'web_order_fulfill'
  | 'web_order_cancel_release'
  | 'manual_adjustment'
  | 'cycle_count'
  | 'ai_shelf_count'
  | 'damaged_shrink'
  | 'vendor_receive'
  | 'transfer_in'
  | 'transfer_out'
  | 'refund_restock';

export interface InventoryLedgerEntry {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  timestamp: string;
  channel: 'pos' | 'web' | 'mobile' | 'backoffice' | 'ai_system';
  userId: string;
  userName: string;
  quantityDelta: number; // e.g. -1, +12
  balanceAfter: number;
  reason: InventoryMovementReason;
  referenceId?: string; // Order #, PO #, Session #
  notes?: string;
  location?: string;
}

export interface InventoryReservation {
  id: string;
  orderId: string;
  orderNumber: string;
  productId: string;
  quantity: number;
  channel: 'web' | 'mobile_queue' | 'bopis';
  status: 'active' | 'fulfilled' | 'expired' | 'released';
  expiresAt: string;
  createdAt: string;
}

export interface ProductAvailableToSell {
  productId: string;
  onHand: number;
  reserved: number;
  safetyStock: number;
  availableToSell: number; // max(0, onHand - reserved - safetyStock)
  sellOnline: boolean;
  sellInStore: boolean;
}

export type OmnichannelOrderStatus =
  | 'new'
  | 'accepted'
  | 'picking'
  | 'picked'
  | 'ready_for_pickup'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'refunded';

export interface OmnichannelOrderTimelineEvent {
  status: OmnichannelOrderStatus;
  timestamp: string;
  userId?: string;
  userName?: string;
  notes?: string;
}

export interface OmnichannelCartTransfer {
  cartId: string;
  transferCode: string; // e.g. "CART-8392"
  qrData: string;
  createdAt: string;
  expiresAt: string;
  sourceChannel: 'web' | 'mobile_queue' | 'pos';
  destinationRegisterId?: string;
  customerName?: string;
  customerPhone?: string;
  items: CartItem[];
  subtotal: number;
  claimed: boolean;
  claimedAt?: string;
  claimedByRegister?: string;
}

export interface ProductBundleItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
}

export interface ProductBundle {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  bundlePrice: number;
  items: ProductBundleItem[];
  active: boolean;
  imageUrl?: string;
  description?: string;
}

export interface ProductSubstitutionRule {
  id: string;
  originalProductId: string;
  substituteProductId: string;
  substituteProductName: string;
  substituteSku: string;
  priceDifference: number;
  allowAutomaticSubstitution: boolean;
  reason?: string;
}

export interface DigitalTwinShelfPosition {
  id: string;
  aisle: string;
  bay: string;
  shelf: string;
  position: string;
  productId?: string;
  productName?: string;
  sku?: string;
  facingCount: number;
  maxCapacity: number;
  currentCount: number;
}

// ----------------------------------------------------
// WEBVIEW2 WINDOWS POS & HARDWARE BRIDGE TYPES (EPIC WV-001 - WV-082)
// ----------------------------------------------------

export type HardwareCommandType =
  | 'PRINT_RECEIPT'
  | 'OPEN_DRAWER'
  | 'GET_SCALE_WEIGHT'
  | 'CHECK_PRINTER'
  | 'START_PAYMENT'
  | 'IDENTIFY_DISPLAY'
  | 'RESTART_CUSTOMER_DISPLAY'
  | 'GET_DISPLAYS'
  | 'SET_DISPLAYS'
  | 'GET_VERSION'
  | 'CHECK_HEALTH'
  | 'CHECK_UPDATES'
  | 'TEST_CUSTOMER_DISPLAY'
  | 'SET_KIOSK_MODE';

export interface WindowsDisplayInfo {
  id: string;
  deviceNumber: number;
  deviceName: string;
  friendlyName: string;
  isPrimary: boolean;
  resolution: { width: number; height: number };
  bounds: { x: number; y: number; width: number; height: number };
  scaleFactor: number;
  assignedRole: 'cashier' | 'customer' | 'unassigned';
  connected: boolean;
}

export interface WindowsWebView2HostConfig {
  isWebView2Runtime: boolean;
  runtimeVersion: string;
  wrapperVersion: string;
  bridgeVersion: string;
  webPosVersion: string;
  registerId: string;
  deviceId: string;
  storeId: string;
  businessName: string;
  cashierDisplayNumber: number;
  customerDisplayNumber: number;
  customerDisplayEnabled: boolean;
  customerDisplayUrl: string;
  customerDisplayFullscreen: boolean;
  returnToWelcomeTimeoutSec: number;
  kioskModeEnabled: boolean;
  preventNavigationAway: boolean;
  autoLaunchOnWindowsStartup: boolean;
  bridgeEndpoint: string;
  hardwareAllowlist: HardwareCommandType[];
  trustedOrigins: string[];
  lastHealthCheck?: StartupHealthCheckResult;
}

export interface StartupHealthCheckResult {
  timestamp: string;
  allOk: boolean;
  checks: {
    internet: { status: 'ok' | 'warning' | 'error'; message: string; latencyMs?: number };
    backend: { status: 'ok' | 'warning' | 'error'; message: string; latencyMs?: number };
    webView2: { status: 'ok' | 'warning' | 'error'; message: string; version?: string };
    bridge: { status: 'ok' | 'warning' | 'error'; message: string; endpoint?: string };
    display1: { status: 'ok' | 'warning' | 'error'; message: string; name?: string };
    display2: { status: 'ok' | 'warning' | 'error'; message: string; name?: string };
  };
}

export interface NativeBridgeMessage<T = any> {
  id: string; // Correlation ID (RequestId) (WV-046)
  timestamp: string;
  type: 'COMMAND' | 'EVENT' | 'RESPONSE' | 'HEARTBEAT';
  command?: HardwareCommandType;
  payload?: T;
  status?: 'success' | 'failed' | 'timeout';
  error?: string;
  idempotencyKey?: string; // WV-048
  origin?: string; // WV-045
}

export interface CustomerTouchInteractionEvent {
  type: 'LOYALTY_PHONE_ENTERED' | 'TIP_SELECTED' | 'RECEIPT_PREFERENCE' | 'PAYMENT_QR_REQUESTED' | 'CUSTOMER_CANCEL';
  data?: any;
  timestamp: string;
}

export type CustomerReceiptPreference = 'printed' | 'sms' | 'email' | 'none';

// ----------------------------------------------------
// SMART LOCAL POS BRIDGE DEVICE DISCOVERY (EPIC BR-DISC & BR-FIX)
// ----------------------------------------------------

export type DiscoveredDeviceCategory =
  | 'receipt_printer'
  | 'kitchen_printer'
  | 'label_printer'
  | 'barcode_scanner'
  | 'scale'
  | 'customer_display'
  | 'cash_drawer'
  | 'payment_terminal'
  | 'pole_display'
  | 'signature_device'
  | 'software_service'
  | 'unknown';

export type DiscoveredDeviceStatus =
  | 'Connected'
  | 'Ready'
  | 'Reconnecting'
  | 'Busy'
  | 'Needs Attention'
  | 'Offline'
  | 'Not Configured'
  | 'Unsupported';

export type DeviceConnectionType =
  | 'usb'
  | 'hid'
  | 'com'
  | 'bluetooth'
  | 'network'
  | 'windows_spooler'
  | 'software_service';

export type DeviceDiscoveryMethod =
  | 'windows_enumeration'
  | 'usb_hid'
  | 'com_enumeration'
  | 'windows_printer'
  | 'mdns_bonjour'
  | 'ssdp'
  | 'configured_endpoint'
  | 'vendor_sdk'
  | 'manual_ip'
  | 'manual_com';

export interface DeviceTechnicalInfo {
  driverName?: string;
  firmwareVersion?: string;
  serialNumber?: string;
  endpoint?: string;
  macAddress?: string;
  baudRate?: number;
  lastErrorCode?: string;
  retryHistory?: Array<{
    timestamp: string;
    attempt: number;
    error?: string;
    success: boolean;
  }>;
}

export interface DeviceReconnectRecommendation {
  problem: string;
  lastKnownAddress: string;
  discoveredAddress: string;
  matchedIdentity: boolean;
  recommendedAction: string;
}

export interface DiscoveredPosDevice {
  deviceKey: string; // Stable unique hardware/network fingerprint (BR-DISC-008)
  name: string;
  manufacturer: string;
  model: string;
  category: DiscoveredDeviceCategory;
  connectionType: DeviceConnectionType;
  ipAddress?: string;
  port?: number;
  macAddress?: string;
  usbComIdentifier?: string; // e.g. USB001, COM3, VID_04B8&PID_0202
  status: DiscoveredDeviceStatus;
  discoveryMethod: DeviceDiscoveryMethod;
  lastSeen: string;
  lastSuccessfulOperation?: {
    operation: string;
    timestamp: string;
  };
  failureCounter: number;
  latencyMs?: number;
  isAssigned: boolean;
  assignedRegisterId?: string;
  isPreferred?: boolean;
  isFallback?: boolean;
  fallbackDeviceKey?: string;
  details?: string;
  isPhysicalHardware?: boolean;
  isNetworkDevice?: boolean;
  networkName?: string; // Human-readable network interface / Wi-Fi SSID / Subnet name
  subnet?: string;
  isBuiltInDefault?: boolean;
  technicalInfo?: DeviceTechnicalInfo;
  reconnectRecommendation?: DeviceReconnectRecommendation;
}

export interface RegisterDeviceAssignment {
  businessId: string;
  storeId: string;
  registerId: string;
  category: DiscoveredDeviceCategory;
  assignedDeviceKey: string;
  assignedDeviceName: string;
  isPreferred: boolean;
  fallbackDeviceKey?: string;
  fallbackDeviceName?: string;
  assignedAt: string;
  assignedBy: string;
}

export interface DiagnosticItemResult {
  id: string;
  name: string;
  status: 'ok' | 'warning' | 'error' | 'not_configured';
  message: string;
  latencyMs?: number;
  technicalDetails?: string;
}

export interface FullDiagnosticsResult {
  timestamp: string;
  overallStatus: 'ready' | 'degraded' | 'error';
  items: DiagnosticItemResult[];
  lastHardwareError: string | null;
}

export interface DeviceAuditTrailEntry {
  id: string;
  timestamp: string;
  action:
    | 'assign'
    | 'unassign'
    | 'set_preferred'
    | 'set_fallback'
    | 'test_device'
    | 'reconnect'
    | 'manual_override'
    | 'manual_add'
    | 'dhcp_ip_migrated'
    | 'auto_recover';
  deviceKey: string;
  deviceName: string;
  userName: string;
  details: string;
}

// ----------------------------------------------------
// DYNAMIC PRINTER REGISTRY & BRIDGE ROUTING TYPES
// ----------------------------------------------------

export interface DiscoveredPrinter {
  deviceId: string;
  name: string;
  type: 'windows_spooler' | 'usb' | 'network' | 'virtual';
  status: 'ready' | 'offline' | 'paper_low' | 'paper_out' | 'busy' | 'error' | 'printing';
  queueName: string;
  port: string;
  ipAddress?: string;
  driver?: string;
  manufacturer: string;
  model: string;
  paperWidth: '80mm' | '58mm';
  isDefault?: boolean;
  lastSeen: string;
  details?: string;
}

export interface RegisterPrinterAssignment {
  storeId: string;
  registerId: string;
  deviceType: 'RECEIPT_PRINTER';
  bridgeDeviceId: string;
  windowsQueue: string;
  manufacturer: string;
  model: string;
  port: string;
  connectionType: 'windows_spooler' | 'usb' | 'network' | 'virtual';
  paperWidth: '80mm' | '58mm';
  status: 'ready' | 'offline' | 'not_configured';
  default: boolean;
  enabled: boolean;
  updatedAt: string;
}

export type PrintJobStatus =
  | 'CREATED'
  | 'SENT_TO_BRIDGE'
  | 'ROUTING'
  | 'SENT_TO_SPOOLER'
  | 'SENT_TO_DEVICE'
  | 'SUBMITTED'
  | 'PRINTED'
  | 'FAILED';

export interface PrintDiagnosticLog {
  id: string;
  transactionId: string;
  registerId: string;
  bridgeStatus: string;
  requestedDeviceType: string;
  configuredDeviceId: string;
  resolvedPrinter: string;
  connection: string;
  windowsQueue: string;
  printerStatusBeforeJob: string;
  jobSubmitted: boolean;
  spoolerJobId: string;
  finalKnownStatus: PrintJobStatus;
  timestamp: string;
  technicalLog: string;
  errorReason?: string;
}

// ----------------------------------------------------
// DYNAMIC CUSTOMER DISPLAY MULTI-MONITOR CONFIGURATION
// ----------------------------------------------------

export interface ConfiguredCustomerDisplay {
  registerId: string;
  enabled: boolean;
  selectedDisplayId: string | null;
  matchedHardwareId?: string | null;
  displayIdentifier: string;
  resolution: { width: number; height: number };
  isPrimary: boolean;
  autoStartOnBoot: boolean;
  autoRelaunchOnClose: boolean;
  fullscreenBorderless: boolean;
  status: 'CONNECTED' | 'DISCONNECTED' | 'NOT_CONFIGURED' | 'WARNING';
  lastChecked: string;
  warningMessage?: string;
}


