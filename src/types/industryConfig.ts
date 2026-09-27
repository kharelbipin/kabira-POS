export type BusinessType =
  | 'liquor'
  | 'smoke_shop'
  | 'grocery'
  | 'restaurant'
  | 'convenience'
  | 'retail'
  | 'custom';

export type FeatureCategory =
  | 'REGISTER'
  | 'LIQUOR_TOBACCO'
  | 'RESTAURANT'
  | 'GROCERY'
  | 'ADVANCED'
  | 'OMNICHANNEL';

export interface FeatureDefinition {
  id: string;
  name: string;
  category: FeatureCategory;
  description: string;
  defaultEnabledIndustries: BusinessType[];
  dependencies?: string[]; // IDs of features required before this can be enabled
  incompatibleWith?: string[];
  requiresRole?: 'Cashier' | 'Manager' | 'Admin';
}

export interface NavItemConfig {
  id: string;
  label: string;
  tabKey: string;
  icon: string;
  enabled: boolean;
  order: number;
  requiredFeature?: string;
  roleRequired?: 'Cashier' | 'Manager' | 'Admin';
}

export interface QuickActionConfig {
  id: string;
  label: string;
  shortcut?: string;
  actionKey: string;
  icon: string;
  colorClass: string;
  enabled: boolean;
  order: number;
  size: 'normal' | 'large';
  roleRequired?: 'Cashier' | 'Manager' | 'Admin';
  requiredFeature?: string;
}

export interface CheckoutStepConfig {
  id: string;
  name: string;
  stepKey: 'cart' | 'customer' | 'age_verify' | 'modifiers' | 'send_kitchen' | 'discount_loyalty' | 'coupons' | 'payment' | 'tip' | 'receipt';
  order: number;
  mandatory: boolean;
  conditionalOn?: 'alcohol_tobacco' | 'customer_attached' | 'restaurant_dine_in' | 'weighted_items' | 'always';
  description: string;
}

export interface LayoutPanelConfig {
  id: string;
  name: string;
  componentKey:
    | 'product_search'
    | 'barcode_input'
    | 'category_sidebar'
    | 'product_grid'
    | 'menu_grid'
    | 'table_map'
    | 'produce_plu'
    | 'current_cart'
    | 'customer_card'
    | 'order_notes'
    | 'discounts'
    | 'age_verification'
    | 'number_pad'
    | 'payment_bar'
    | 'scale_display'
    | 'open_tabs';
  enabled: boolean;
  order: number;
  widthFraction?: number; // e.g. 0.25 for 25% width
  minHeight?: number;
  visibleInMobile?: boolean;
}

export interface HardwareRequirementConfig {
  category: 'scanner' | 'printer' | 'cash_drawer' | 'terminal' | 'scale' | 'kitchen_printer' | 'kds' | 'customer_display';
  name: string;
  required: boolean;
  recommended: boolean;
  notes?: string;
}

export type ConfigHierarchyLevel = 'company' | 'store' | 'register';

export interface RegisterProfile {
  id: string;
  name: string;
  number: string;
  type: 'counter' | 'drive_thru' | 'bar' | 'mobile_tablet';
}

export interface PosThemeConfig {
  mode: 'dark' | 'light' | 'auto';
  brandName: string;
  tagline: string;
  primaryAccent: string; // Hex e.g. #C5A059 or #2563EB
  storeName?: string;
  accentColor?: string;
  logoUrl?: string;
  customerDisplayTheme?: {
    accentColor: string;
    showPromotions: boolean;
    backgroundStyle: 'dark' | 'light' | 'image';
  };
}

export interface PosConfiguration {
  id: string;
  name?: string;
  businessId: string;
  storeId?: string; // If undefined, applies to entire business (COMPANY DEFAULT)
  registerId?: string; // If undefined, applies to all registers in store
  businessType: BusinessType;
  templateName: string;
  version: number;
  isDraft: boolean;
  updatedAt: string;
  updatedBy: string;
  publishedAt?: string;
  publishedBy?: string;
  description?: string;

  // Modularity configurations
  enabledFeatures: string[];
  navigationItems: NavItemConfig[];
  quickActions: (QuickActionConfig & { action?: string; hotkey?: string })[];
  checkoutWorkflow: (CheckoutStepConfig & { required?: boolean })[];
  layoutPanels: LayoutPanelConfig[];
  hardwareRequirements: HardwareRequirementConfig[];
  theme: PosThemeConfig;

  // Visual Designer Helpers
  features: Record<string, boolean>;
  layout: { elements: { id: string; name: string; position: string; visible: boolean }[] };
  navigation: { id: string; label: string; targetTab: string; roles: string[] }[];
  hardwareProfile: {
    receiptPrinterRequired: boolean;
    barcodeScannerRequired: boolean;
    scaleRequired: boolean;
    kitchenPrinterRequired: boolean;
    paymentTerminalRequired: boolean;
    cashDrawerRequired: boolean;
  };
}

export interface StoreProfile {
  id: string;
  name: string;
  businessType: BusinessType;
  storeNumber: string;
  address: string;
  cityStateZip: string;
  phone: string;
  managerName: string;
  registers: {
    id: string;
    name: string;
    number: string;
    type: 'counter' | 'drive_thru' | 'bar' | 'mobile_tablet';
  }[];
}

export interface ConfigVersionHistoryItem {
  version: number;
  publishedAt: string;
  publishedBy: string;
  storeId?: string;
  registerId?: string;
  businessType: BusinessType;
  summary: string;
  configSnapshot: PosConfiguration;
}
