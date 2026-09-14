import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  ShoppingCart,
  ReceiptText,
  Coins,
  Users,
  Boxes,
  Landmark,
  BarChart3,
  Globe,
  Settings,
  ShieldAlert,
  Camera,
  QrCode,
  FileCheck,
  PauseCircle,
  ScanBarcode,
  Percent,
  Monitor,
  Smartphone,
  Cpu,
  FileClock,
  Layers,
  Sparkles,
  ShoppingBag,
  Compass,
  ArrowRight,
} from 'lucide-react';

interface FunctionItem {
  id: string;
  title: string;
  category: 'pos' | 'payments' | 'inventory' | 'online' | 'reports' | 'hardware';
  categoryLabel: string;
  description: string;
  icon: React.ElementType;
  badge?: string;
  action: () => void;
}

interface AllFunctionsMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
  onOpenModal: (modalName: string) => void;
}

export const AllFunctionsMenuModal: React.FC<AllFunctionsMenuModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onOpenModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const allFunctions: FunctionItem[] = useMemo(
    () => [
      // POS & Sales
      {
        id: 'pos-register',
        title: 'POS Register & Checkout',
        category: 'pos',
        categoryLabel: 'POS & Register',
        description: 'High-speed touch register, barcode scanner, cart totals, and cash/card tenders.',
        icon: ShoppingCart,
        action: () => {
          onNavigateTab('pos');
          onClose();
        },
      },
      {
        id: 'orders-ledger',
        title: 'Completed Orders & Receipts',
        category: 'pos',
        categoryLabel: 'POS & Register',
        description: 'View order history, reprint thermal customer receipts, and track order totals.',
        icon: ReceiptText,
        action: () => {
          onNavigateTab('orders');
          onClose();
        },
      },
      {
        id: 'held-orders',
        title: 'Held Orders & Parked Carts',
        category: 'pos',
        categoryLabel: 'POS & Register',
        description: 'Hold active orders while customers retrieve more items, and recall them instantly.',
        icon: PauseCircle,
        action: () => {
          onOpenModal('held-orders');
          onClose();
        },
      },
      {
        id: 'barcode-scanner-tool',
        title: 'Live Camera Barcode Scanner',
        category: 'pos',
        categoryLabel: 'POS & Register',
        description: 'Scan UPC/EAN bottle barcodes directly via laptop, tablet, or external camera.',
        icon: ScanBarcode,
        action: () => {
          onOpenModal('scanner');
          onClose();
        },
      },
      {
        id: 'customer-display-screen',
        title: 'Customer-Facing Pole Display',
        category: 'pos',
        categoryLabel: 'POS & Register',
        description: 'Open secondary counter screen showing live cart items, subtotal, and thank you banner.',
        icon: Monitor,
        badge: 'Dual Screen',
        action: () => {
          onOpenModal('customer-display');
          onClose();
        },
      },
      {
        id: 'mobile-queue-buster',
        title: 'Mobile Queue Buster (Handheld Cart)',
        category: 'pos',
        categoryLabel: 'POS & Register',
        description: 'Aisle line-busting mobile cart with QR transfer directly into the main POS counter register.',
        icon: Smartphone,
        badge: 'Mobile Cart',
        action: () => {
          window.open('?view=queue-buster', '_blank');
          onClose();
        },
      },

      // Payments & Cash
      {
        id: 'shifts-drawer',
        title: 'Shifts & Cash Drawer Balancing',
        category: 'payments',
        categoryLabel: 'Payments & Cash',
        description: 'Open shift, track cash drops, register payouts, bill denomination counts, and Z-Reports.',
        icon: Coins,
        action: () => {
          onNavigateTab('shifts');
          onClose();
        },
      },
      {
        id: 'check-cashing',
        title: 'Check Cashing & MICR Verification',
        category: 'payments',
        categoryLabel: 'Payments & Cash',
        description: 'Cash payroll and personal checks, calculate store fees, verify MICR bank routing, and print slips.',
        icon: Landmark,
        action: () => {
          onNavigateTab('checks');
          onClose();
        },
      },
      {
        id: 'check-qr-intake',
        title: 'Smartphone Check Upload Form (Customer QR)',
        category: 'payments',
        categoryLabel: 'Payments & Cash',
        description: 'Customer scans QR with phone to capture front, back, and ID without touching the POS system.',
        icon: QrCode,
        badge: 'No POS Access',
        action: () => {
          onNavigateTab('checks');
          onOpenModal('check-qr');
          onClose();
        },
      },
      {
        id: 'check-issuing',
        title: 'Accounts Payable Check Issuance',
        category: 'payments',
        categoryLabel: 'Payments & Cash',
        description: 'Print business checks to vendors on check stock paper and maintain an accounts payable ledger.',
        icon: FileCheck,
        action: () => {
          onNavigateTab('checks');
          onClose();
        },
      },

      // Inventory & Shelf
      {
        id: 'inventory-catalog',
        title: 'Inventory & Product Catalog',
        category: 'inventory',
        categoryLabel: 'Inventory & Stock',
        description: 'Manage bottles, spirits, wine, low stock alerts, cost prices, retail markup, and SKU barcodes.',
        icon: Boxes,
        action: () => {
          onNavigateTab('inventory');
          onClose();
        },
      },
      {
        id: 'ai-shelf-counter',
        title: 'AI Vision Shelf Counter & Camera Scanner',
        category: 'inventory',
        categoryLabel: 'Inventory & Stock',
        description: 'Count bottles automatically from shelf photos taken via smartphone live camera scanner.',
        icon: Camera,
        badge: 'Live Scanner',
        action: () => {
          onNavigateTab('inventory');
          onOpenModal('ai-shelf-counter');
          onClose();
        },
      },
      {
        id: 'receiving-invoices',
        title: 'Vendor Invoice Receiving & OCR Scan',
        category: 'inventory',
        categoryLabel: 'Inventory & Stock',
        description: 'Scan vendor paper invoices, barcode cases, and automatically update warehouse stock on hand.',
        icon: Layers,
        action: () => {
          onNavigateTab('receiving');
          onClose();
        },
      },

      // Online Store & Website
      {
        id: 'online-store-portal',
        title: 'Online Storefront & E-Commerce Portal',
        category: 'online',
        categoryLabel: 'Website & Online',
        description: 'Manage web orders, in-store curbside pickup, local delivery, Texas 21+ age gate, and sync.',
        icon: Globe,
        action: () => {
          onNavigateTab('online-store');
          onClose();
        },
      },
      {
        id: 'website-menu-hosting',
        title: 'Website Menu & Hosting Manager',
        category: 'online',
        categoryLabel: 'Website & Online',
        description: 'Host and deploy website, customize header navigation links, domain settings, and live status.',
        icon: Compass,
        badge: 'Host & Menu',
        action: () => {
          onNavigateTab('online-store');
          onOpenModal('website-menu');
          onClose();
        },
      },
      {
        id: 'web-products-sync',
        title: 'Web Product Catalog & Safety Stock',
        category: 'online',
        categoryLabel: 'Website & Online',
        description: 'Control which bottles appear online with safety stock buffers to prevent overselling.',
        icon: ShoppingBag,
        action: () => {
          onNavigateTab('online-store');
          onClose();
        },
      },

      // Reports & Analytics
      {
        id: 'reports-sales',
        title: 'Sales Reports & Custom Date Range',
        category: 'reports',
        categoryLabel: 'Reports & Analytics',
        description: 'Filter sales revenue, gross margin, tax collected, and top-selling items by custom date range.',
        icon: BarChart3,
        action: () => {
          onNavigateTab('reports');
          onClose();
        },
      },
      {
        id: 'customers-crm',
        title: 'Customer Directory & Loyalty Points',
        category: 'reports',
        categoryLabel: 'Reports & Analytics',
        description: 'Customer profiles, purchase history, loyalty tier points, and ID verification status.',
        icon: Users,
        action: () => {
          onNavigateTab('customers');
          onClose();
        },
      },
      {
        id: 'audit-logs-trail',
        title: 'System Audit Logs & Security Trail',
        category: 'reports',
        categoryLabel: 'Reports & Analytics',
        description: 'Complete audit trail of price overrides, manual inventory changes, discounts, and cashier voids.',
        icon: FileClock,
        action: () => {
          onNavigateTab('audit-log');
          onClose();
        },
      },

      // Hardware & Settings
      {
        id: 'pos-hardware-bridge',
        title: 'POS Hardware Bridge Hub',
        category: 'hardware',
        categoryLabel: 'Hardware & Settings',
        description: 'Configure and test Star/Epson thermal receipt printers, barcode scanners, and cash drawers.',
        icon: Cpu,
        action: () => {
          onOpenModal('bridge-hub');
          onClose();
        },
      },
      {
        id: 'store-settings',
        title: 'Store Settings & Tax Configuration',
        category: 'hardware',
        categoryLabel: 'Hardware & Settings',
        description: 'Set Texas sales tax, store address, receipt branding, sound effects, and manager override PINs.',
        icon: Settings,
        action: () => {
          onNavigateTab('settings');
          onClose();
        },
      },
    ],
    [onNavigateTab, onOpenModal, onClose]
  );

  const filteredFunctions = useMemo(() => {
    return allFunctions.filter(item => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.categoryLabel.toLowerCase().includes(q)
      );
    });
  }, [allFunctions, selectedCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111625] border border-slate-700 w-full max-w-5xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header Strip */}
        <div className="bg-[#0B1020] border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider">
                All POS Functions & Directory
              </h2>
              <p className="text-xs text-slate-400">
                Quickly locate and jump to any feature, tool, or screen in the 377 Spirits POS system.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close Directory"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="bg-[#0E1528] border-b border-slate-800 px-6 py-3 flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search all functions..."
              className="w-full bg-[#16203B] border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-amber-400 transition-colors"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
            {[
              { id: 'all', label: 'All (22)' },
              { id: 'pos', label: 'POS & Register' },
              { id: 'payments', label: 'Payments & Cash' },
              { id: 'inventory', label: 'Inventory' },
              { id: 'online', label: 'Website' },
              { id: 'reports', label: 'Reports' },
              { id: 'hardware', label: 'Hardware' },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all shrink-0 cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Function Cards Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredFunctions.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-400">
              <Search className="w-8 h-8 mx-auto mb-2 text-slate-500" />
              <p className="text-sm font-bold text-white">No functions match your search "{searchQuery}"</p>
              <p className="text-xs mt-1">Try searching for terms like "checks", "website", "fallback", or "date range".</p>
            </div>
          ) : (
            filteredFunctions.map(item => {
              const IconComp = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  className="bg-[#151D33] hover:bg-[#1C2745] border border-slate-800 hover:border-amber-400/50 rounded-xl p-4 transition-all cursor-pointer group flex flex-col justify-between shadow-xs hover:shadow-md hover:scale-[1.01]"
                >
                  <div>
                    <div className="flex items-start justify-between mb-2.5">
                      <div className="w-9 h-9 rounded-lg bg-amber-400/10 group-hover:bg-amber-400/20 text-amber-400 flex items-center justify-center transition-colors">
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div className="flex items-center space-x-1.5">
                        {item.badge && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {item.badge}
                          </span>
                        )}
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          {item.categoryLabel}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-bold text-amber-400 group-hover:text-amber-300">
                    <span>Open Function</span>
                    <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="bg-[#0B1020] border-t border-slate-800 px-6 py-3 flex items-center justify-between text-xs text-slate-400">
          <span>Tip: You can also access key functions directly from the top navigation bar.</span>
          <span className="font-mono text-[11px] text-amber-400">377 Spirits System Directory</span>
        </div>
      </div>
    </div>
  );
};
