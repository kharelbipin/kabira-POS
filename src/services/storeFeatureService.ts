// Store-Level POS Feature Management Service (Admin Portal & Dynamic UI Engine)
import { User, StoreSettings } from '../types';

export type PosFeatureCode =
  | 'DESIGNER'
  | 'KDS'
  | 'TABLES'
  | 'SCALE_PLU'
  | 'SCAN'
  | 'LOTTO_SALE'
  | 'LOTTO_PAYOUT'
  | 'INVENTORY';

export interface PosFeatureMeta {
  code: PosFeatureCode;
  name: string;
  category: 'CORE_REGISTER' | 'RESTAURANT' | 'GROCERY' | 'LOTTERY' | 'ADMINISTRATION';
  description: string;
  badge: string;
  icon: string;
  dependencyWarning?: string;
  requiredRole?: 'Cashier' | 'Manager' | 'Admin';
}

export interface StoreFeatureConfig {
  storeId: string;
  features: Record<PosFeatureCode, boolean>;
  updatedAt: string;
  updatedBy: string;
}

export interface FeatureAuditLogEntry {
  id: string;
  storeId: string;
  storeName: string;
  featureCode: PosFeatureCode;
  featureName: string;
  previousStatus: boolean;
  newStatus: boolean;
  changedBy: string;
  timestamp: string;
  reason: string;
}

export interface StoreInfo {
  id: string;
  name: string;
  storeNumber: string;
  businessType: 'liquor' | 'smoke_shop' | 'grocery' | 'restaurant' | 'convenience' | 'retail' | 'custom';
  address: string;
  cityStateZip: string;
  phone: string;
  managerName: string;
}

export const POS_FEATURE_CATALOG: PosFeatureMeta[] = [
  {
    code: 'DESIGNER',
    name: 'POS Designer',
    category: 'ADMINISTRATION',
    description: 'Visual layout studio, industry presets, register button layouts, and workflow customization.',
    badge: 'Admin Tool',
    icon: 'Sliders',
    requiredRole: 'Manager',
  },
  {
    code: 'KDS',
    name: 'Kitchen Display System (KDS)',
    category: 'RESTAURANT',
    description: 'Multi-station kitchen order routing, ticket timers, prep stages, and chef bump bar integration.',
    badge: 'Kitchen Station',
    icon: 'ChefHat',
    dependencyWarning: 'Requires restaurant table management or kitchen order routing to be configured.',
  },
  {
    code: 'TABLES',
    name: 'Table Management & Floor Map',
    category: 'RESTAURANT',
    description: 'Interactive visual dining room layout, table occupancy, elapsed timers, and guest split checks.',
    badge: 'Dining / Bar',
    icon: 'Utensils',
    dependencyWarning: 'Designed for sit-down dining, bars, and host stations with table service.',
  },
  {
    code: 'SCALE_PLU',
    name: 'Scale & PLU Weighing',
    category: 'GROCERY',
    description: 'Legal-for-trade scale interface, tare weight deduction, unit pricing per lb/oz, and 4-digit PLU code lookup.',
    badge: 'Produce & Deli',
    icon: 'Scale',
  },
  {
    code: 'SCAN',
    name: 'Barcode Scanning & Mobile Cart',
    category: 'CORE_REGISTER',
    description: 'Laser barcode gun emulation, camera barcode scanning, and queue-busting mobile cart synchronization.',
    badge: 'Hardware Wedge',
    icon: 'ScanBarcode',
  },
  {
    code: 'LOTTO_SALE',
    name: 'Lotto Ticket Sales',
    category: 'LOTTERY',
    description: 'Quick sales of scratch-offs and draw game tickets (Powerball, Mega Millions, Lotto Texas).',
    badge: 'Lottery',
    icon: 'Ticket',
  },
  {
    code: 'LOTTO_PAYOUT',
    name: 'Lotto Winning Payouts',
    category: 'LOTTERY',
    description: 'Cash drawer redemption for winning lottery tickets up to $599 with manager validation rules.',
    badge: 'Lottery Cashier',
    icon: 'DollarSign',
    dependencyWarning: 'Lotto Sale is recommended when enabling Lotto Payouts for balanced lottery auditing.',
  },
  {
    code: 'INVENTORY',
    name: 'Inventory Management',
    category: 'CORE_REGISTER',
    description: 'Stock catalog, inventory adjustments, PO receiving, vendor management, and stock audit counts.',
    badge: 'Catalog & Stock',
    icon: 'Boxes',
  },
];

export const SYSTEM_STORES: StoreInfo[] = [
  {
    id: 'store-1',
    name: '377 Spirits — Granbury Main',
    storeNumber: '001',
    businessType: 'liquor',
    address: '1400 E Hwy 377',
    cityStateZip: 'Granbury, TX 76048',
    phone: '(817) 555-0377',
    managerName: 'Marcus Vance',
  },
  {
    id: 'store-2',
    name: 'Granbury Smoke & Vape Depot',
    storeNumber: '002',
    businessType: 'smoke_shop',
    address: '810 Morgan St',
    cityStateZip: 'Granbury, TX 76048',
    phone: '(817) 555-0378',
    managerName: 'Samantha Ray',
  },
  {
    id: 'store-3',
    name: 'Lake Granbury Fresh Market',
    storeNumber: '003',
    businessType: 'grocery',
    address: '2200 Fall Creek Hwy',
    cityStateZip: 'Granbury, TX 76049',
    phone: '(817) 555-0379',
    managerName: 'David Chen',
  },
  {
    id: 'store-4',
    name: 'The Brazos Bistro & Taphouse',
    storeNumber: '004',
    businessType: 'restaurant',
    address: '115 Historic Town Square',
    cityStateZip: 'Granbury, TX 76048',
    phone: '(817) 555-0380',
    managerName: 'Chef Antonio Rossi',
  },
];

export const STORE_TEMPLATES: Record<string, { label: string; description: string; features: Record<PosFeatureCode, boolean> }> = {
  liquor: {
    label: 'Liquor Store Template',
    description: 'High-speed scanning, lottery ticket sale/payout, full inventory catalog, and layout designer.',
    features: {
      DESIGNER: true,
      KDS: false,
      TABLES: false,
      SCALE_PLU: false,
      SCAN: true,
      LOTTO_SALE: true,
      LOTTO_PAYOUT: true,
      INVENTORY: true,
    },
  },
  smoke_shop: {
    label: 'Smoke & Vape Shop Template',
    description: 'Focused retail checkout, barcode scanner, age compliance, and inventory catalog.',
    features: {
      DESIGNER: false,
      KDS: false,
      TABLES: false,
      SCALE_PLU: false,
      SCAN: true,
      LOTTO_SALE: false,
      LOTTO_PAYOUT: false,
      INVENTORY: true,
    },
  },
  grocery: {
    label: 'Grocery / Fresh Market Template',
    description: 'Produce scale weighing with PLUs, speed barcode scanning, lottery services, and inventory.',
    features: {
      DESIGNER: false,
      KDS: false,
      TABLES: false,
      SCALE_PLU: true,
      SCAN: true,
      LOTTO_SALE: true,
      LOTTO_PAYOUT: true,
      INVENTORY: true,
    },
  },
  restaurant: {
    label: 'Restaurant & Taphouse Template',
    description: 'Full kitchen display system (KDS), dining room floor map, table management, and custom layout designer.',
    features: {
      DESIGNER: true,
      KDS: true,
      TABLES: true,
      SCALE_PLU: false,
      SCAN: false,
      LOTTO_SALE: false,
      LOTTO_PAYOUT: false,
      INVENTORY: true,
    },
  },
  custom: {
    label: 'All Features Enabled (Superstore)',
    description: 'Enables every module in the platform for hybrid multi-concept businesses.',
    features: {
      DESIGNER: true,
      KDS: true,
      TABLES: true,
      SCALE_PLU: true,
      SCAN: true,
      LOTTO_SALE: true,
      LOTTO_PAYOUT: true,
      INVENTORY: true,
    },
  },
};

const STORAGE_FEATURES_KEY = 'kabira_store_feature_configs_v1';
const STORAGE_ACTIVE_STORE_KEY = 'kabira_pos_active_store_id';
const STORAGE_AUDIT_KEY = 'kabira_feature_audit_logs_v1';

class StoreFeatureService {
  private activeStoreId: string = 'store-1';
  private storeConfigs: Record<string, StoreFeatureConfig> = {};
  private auditLogs: FeatureAuditLogEntry[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      if (typeof window === 'undefined') return;

      const storedStoreId = localStorage.getItem(STORAGE_ACTIVE_STORE_KEY);
      if (storedStoreId && SYSTEM_STORES.some(s => s.id === storedStoreId)) {
        this.activeStoreId = storedStoreId;
      }

      const storedConfigs = localStorage.getItem(STORAGE_FEATURES_KEY);
      if (storedConfigs) {
        this.storeConfigs = JSON.parse(storedConfigs);
      } else {
        this.initializeDefaultStoreConfigs();
      }

      const storedAudit = localStorage.getItem(STORAGE_AUDIT_KEY);
      if (storedAudit) {
        this.auditLogs = JSON.parse(storedAudit);
      }
    } catch (e) {
      console.error('Failed to load store features from localStorage:', e);
      this.initializeDefaultStoreConfigs();
    }
  }

  private initializeDefaultStoreConfigs() {
    // Populate realistic defaults for each store
    this.storeConfigs['store-1'] = {
      storeId: 'store-1',
      features: { ...STORE_TEMPLATES.liquor.features },
      updatedAt: new Date().toISOString(),
      updatedBy: 'System Administrator (Initial Setup)',
    };
    this.storeConfigs['store-2'] = {
      storeId: 'store-2',
      features: { ...STORE_TEMPLATES.smoke_shop.features },
      updatedAt: new Date().toISOString(),
      updatedBy: 'System Administrator (Initial Setup)',
    };
    this.storeConfigs['store-3'] = {
      storeId: 'store-3',
      features: { ...STORE_TEMPLATES.grocery.features },
      updatedAt: new Date().toISOString(),
      updatedBy: 'System Administrator (Initial Setup)',
    };
    this.storeConfigs['store-4'] = {
      storeId: 'store-4',
      features: { ...STORE_TEMPLATES.restaurant.features },
      updatedAt: new Date().toISOString(),
      updatedBy: 'System Administrator (Initial Setup)',
    };

    this.saveToStorage();
  }

  private saveToStorage() {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(STORAGE_FEATURES_KEY, JSON.stringify(this.storeConfigs));
      localStorage.setItem(STORAGE_ACTIVE_STORE_KEY, this.activeStoreId);
      localStorage.setItem(STORAGE_AUDIT_KEY, JSON.stringify(this.auditLogs));
    } catch (e) {
      console.error('Failed to persist store features:', e);
    }
  }

  private notifyChange() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('kabira_store_features_changed', {
          detail: {
            activeStoreId: this.activeStoreId,
            features: this.getFeaturesForStore(this.activeStoreId),
          },
        })
      );
    }
  }

  // Active Store Management
  public getActiveStoreId(): string {
    return this.activeStoreId;
  }

  public getActiveStore(): StoreInfo {
    return SYSTEM_STORES.find(s => s.id === this.activeStoreId) || SYSTEM_STORES[0];
  }

  public setActiveStoreId(storeId: string) {
    if (!SYSTEM_STORES.some(s => s.id === storeId)) return;
    this.activeStoreId = storeId;
    this.saveToStorage();
    this.notifyChange();
  }

  public getAllStores(): StoreInfo[] {
    return SYSTEM_STORES;
  }

  public getStore(storeId: string): StoreInfo | undefined {
    return SYSTEM_STORES.find(s => s.id === storeId);
  }

  // Feature Configuration Management
  public getFeaturesForStore(storeId: string): Record<PosFeatureCode, boolean> {
    const config = this.storeConfigs[storeId];
    if (config?.features) {
      return { ...config.features };
    }
    // Fallback based on store profile business type
    const store = this.getStore(storeId);
    const templateKey = store?.businessType || 'liquor';
    const template = STORE_TEMPLATES[templateKey] || STORE_TEMPLATES.liquor;
    return { ...template.features };
  }

  public isFeatureEnabledForStore(storeId: string, featureCode: PosFeatureCode): boolean {
    const features = this.getFeaturesForStore(storeId);
    return !!features[featureCode];
  }

  public isFeatureEnabledForActiveStore(featureCode: PosFeatureCode): boolean {
    return this.isFeatureEnabledForStore(this.activeStoreId, featureCode);
  }

  // RBAC & Permission Enforcement Rule: Store Feature Enabled + User Role/Permission = Access Allowed
  public isFeatureAccessible(
    featureCode: PosFeatureCode,
    user?: User | null,
    settings?: StoreSettings | null,
    storeId?: string
  ): boolean {
    const targetStoreId = storeId || this.activeStoreId;
    const isStoreEnabled = this.isFeatureEnabledForStore(targetStoreId, featureCode);
    if (!isStoreEnabled) return false;

    // Feature is enabled for the store. Now check user authorization:
    const role = user?.role || 'Cashier';

    switch (featureCode) {
      case 'DESIGNER':
        // Only Managers & Admins can access layout designer
        return role === 'Admin' || role === 'Manager';

      case 'INVENTORY':
        // Admins, Managers, or Cashiers with explicit allowInventory setting
        return role === 'Admin' || role === 'Manager' || !!settings?.cashierPermissions?.allowInventory;

      case 'LOTTO_PAYOUT':
        // Cashiers, Managers, Admins can perform lotto payouts (manager PIN for >= $200 enforced inside modal)
        return true;

      case 'LOTTO_SALE':
      case 'SCALE_PLU':
      case 'SCAN':
      case 'KDS':
      case 'TABLES':
        return true;

      default:
        return true;
    }
  }

  // Backend Security Verification
  public verifyFeatureAccess(
    featureCode: PosFeatureCode,
    user?: User | null,
    storeId?: string
  ): { allowed: boolean; reason?: string } {
    const targetStoreId = storeId || this.activeStoreId;
    const store = this.getStore(targetStoreId);
    const storeName = store?.name || targetStoreId;

    if (!this.isFeatureEnabledForStore(targetStoreId, featureCode)) {
      return {
        allowed: false,
        reason: `Feature [${featureCode}] is disabled for ${storeName}. Access denied.`,
      };
    }

    return { allowed: true };
  }

  // Toggle Single Feature
  public setFeatureEnabled(
    storeId: string,
    featureCode: PosFeatureCode,
    enabled: boolean,
    changedBy: string = 'System Admin',
    reason: string = 'Administrative configuration update'
  ) {
    const currentFeatures = this.getFeaturesForStore(storeId);
    const previousStatus = !!currentFeatures[featureCode];

    if (previousStatus === enabled) return; // No change

    currentFeatures[featureCode] = enabled;

    this.storeConfigs[storeId] = {
      storeId,
      features: currentFeatures,
      updatedAt: new Date().toISOString(),
      updatedBy: changedBy,
    };

    const store = this.getStore(storeId);
    const meta = POS_FEATURE_CATALOG.find(f => f.code === featureCode);

    // Record Audit Entry
    this.auditLogs.unshift({
      id: `audit-feat-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      storeId,
      storeName: store?.name || storeId,
      featureCode,
      featureName: meta?.name || featureCode,
      previousStatus,
      newStatus: enabled,
      changedBy,
      timestamp: new Date().toISOString(),
      reason,
    });

    // Keep last 300 audit logs
    if (this.auditLogs.length > 300) {
      this.auditLogs = this.auditLogs.slice(0, 300);
    }

    this.saveToStorage();
    this.notifyChange();
  }

  // Apply Full Industry Template
  public applyTemplate(
    storeId: string,
    templateKey: string,
    changedBy: string = 'System Admin'
  ) {
    const template = STORE_TEMPLATES[templateKey];
    if (!template) return;

    const currentFeatures = this.getFeaturesForStore(storeId);
    const store = this.getStore(storeId);

    // Record audit entries for any modified toggles
    for (const [codeStr, newStatus] of Object.entries(template.features)) {
      const code = codeStr as PosFeatureCode;
      const prev = !!currentFeatures[code];
      if (prev !== newStatus) {
        const meta = POS_FEATURE_CATALOG.find(f => f.code === code);
        this.auditLogs.unshift({
          id: `audit-feat-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
          storeId,
          storeName: store?.name || storeId,
          featureCode: code,
          featureName: meta?.name || code,
          previousStatus: prev,
          newStatus,
          changedBy,
          timestamp: new Date().toISOString(),
          reason: `Applied template: ${template.label}`,
        });
      }
    }

    this.storeConfigs[storeId] = {
      storeId,
      features: { ...template.features },
      updatedAt: new Date().toISOString(),
      updatedBy: changedBy,
    };

    this.saveToStorage();
    this.notifyChange();
  }

  // Bulk Feature Toggling across Multiple Stores
  public bulkSetFeature(
    storeIds: string[],
    featureCode: PosFeatureCode,
    enabled: boolean,
    changedBy: string = 'System Admin',
    reason: string = 'Bulk store rollout'
  ) {
    for (const storeId of storeIds) {
      this.setFeatureEnabled(storeId, featureCode, enabled, changedBy, reason);
    }
  }

  // Audit Logs
  public getAuditLogs(storeId?: string): FeatureAuditLogEntry[] {
    if (storeId && storeId !== 'all') {
      return this.auditLogs.filter(l => l.storeId === storeId);
    }
    return this.auditLogs;
  }

  public clearAuditLogs() {
    this.auditLogs = [];
    this.saveToStorage();
  }
}

export const storeFeatureService = new StoreFeatureService();
