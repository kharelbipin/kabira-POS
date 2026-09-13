import {
  User,
  Product,
  Category,
  Brand,
  Promotion,
  PosDevice,
  Order,
  Customer,
  LoyaltyTransaction,
  StoreSettings,
  AuditLog,
  HeldOrder,
  SalesReport,
  Vendor,
  ScannedInvoice,
  VendorPurchaseStats,
  InventoryReceivingTransaction,
  InvoiceUploadSession,
  BarcodeReceivingSession,
  BarcodeReceivingLine,
  Shift,
  ShiftDenominationCount,
  ShiftReconciliation,
  ShiftSummarySnapshot,
  ShiftCashMovement,
  BankAccount,
  IssuedCheck,
  CheckStubAllocation,
  CheckIssuer,
  CheckFeeRule,
  CheckCashingTransaction,
  DepositBatch,
  CheckQrSession,
  OnlineStoreConfig,
  OnlineProductSettings,
  OnlineOrder,
  OnlineCoupon,
  StoreLocation,
  AiShelfCountSession,
  InventoryAdjustment,
  PaymentSession,
  PaymentAuditLog,
  CardFallbackMethod,
} from '../types';

// Client-side API caller
class ApiService {
  private currentUserId: string = 'usr-3'; // Elena Rostova by default
  public isOffline: boolean = false;
  private offlineOrderQueue: any[] = [];

  setUserId(id: string) {
    this.currentUserId = id;
  }

  getUserId() {
    return this.currentUserId;
  }

  setOfflineMode(offline: boolean) {
    this.isOffline = offline;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = {
      'Content-Type': 'application/json',
      'x-user-id': this.currentUserId,
      ...(options.headers || {}),
    };

    if (this.isOffline) {
      // If offline mode is enabled, handle offline simulation
      if (endpoint === '/orders' && options.method === 'POST') {
        const orderData = JSON.parse(options.body as string);
        const tempOrder: Order = {
          id: `ord-offline-${Date.now()}`,
          orderNumber: `ORD-OFFLINE-${Math.floor(1000 + Math.random() * 9000)}`,
          cashierId: this.currentUserId,
          cashierName: 'Elena Rostova (Offline Queue)',
          items: orderData.items,
          subtotal: orderData.items.reduce((s: number, i: any) => s + (i.unitPrice * i.quantity), 0),
          discountTotal: orderData.discountTotal || 0,
          taxTotal: 0,
          grandTotal: orderData.payment.amount,
          payment: orderData.payment,
          status: 'completed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        this.offlineOrderQueue.push(orderData);
        localStorage.setItem('pos_offline_queue', JSON.stringify(this.offlineOrderQueue));
        return tempOrder as any;
      }
    }

    const res = await fetch(`/api${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'An unknown server error occurred' }));
      throw new Error(err.error || `HTTP error ${res.status}`);
    }

    return res.json();
  }

  // Auth
  async login(payload: { email?: string; password?: string; pin?: string }) {
    const res = await this.request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.user?.id) {
      this.setUserId(res.user.id);
    }
    return res;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore
    }
  }

  async getMe() {
    return this.request<{ user: User }>('/auth/me');
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const res = await this.getMe();
      return res.user || null;
    } catch {
      return null;
    }
  }

  async getUsers() {
    return this.request<User[]>('/users');
  }

  async createUser(data: Partial<User>) {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUser(id: string, data: Partial<User>) {
    return this.request<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async toggleUserStatus(id: string) {
    return this.request<User>(`/users/${id}/status`, {
      method: 'PATCH',
    });
  }

  // Products & Categories
  async getProducts(params?: { categoryId?: string; search?: string; barcode?: string; activeOnly?: boolean }) {
    const q = new URLSearchParams();
    if (params?.categoryId) q.set('categoryId', params.categoryId);
    if (params?.search) q.set('search', params.search);
    if (params?.barcode) q.set('barcode', params.barcode);
    if (params?.activeOnly !== undefined) q.set('activeOnly', String(params.activeOnly));

    return this.request<Product[]>(`/products?${q.toString()}`);
  }

  async createProduct(data: Partial<Product>) {
    return this.request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(id: string, data: Partial<Product>) {
    return this.request<Product>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deactivateProduct(id: string) {
    return this.request<{ message: string; product: Product }>(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  async importProductsCSV(csvData: string) {
    return this.request<{ successCount: number; failedCount: number; imported: Product[]; errors: any[] }>('/products/import', {
      method: 'POST',
      body: JSON.stringify({ csvData }),
    });
  }

  async exportProductsCSV(): Promise<string> {
    const products = await this.getProducts();
    let csv = 'Name,SKU,Barcode,Category,Price,Cost,Stock,Size,LowStockThreshold\n';
    products.forEach(p => {
      csv += `"${p.name.replace(/"/g, '""')}","${p.sku}","${p.barcode}","${p.categoryName || ''}",${p.price},${p.costPrice || p.cost || 0},${p.stockQuantity},"${p.size}",${p.lowStockThreshold}\n`;
    });
    return csv;
  }

  async getCategories(all: boolean = false) {
    return this.request<Category[]>(`/categories${all ? '?all=true' : ''}`);
  }

  async createCategory(data: Partial<Category>) {
    return this.request<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCategory(id: string, data: Partial<Category>) {
    return this.request<Category>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCategory(id: string) {
    return this.request<{ message: string; category: Category }>(`/categories/${id}`, {
      method: 'DELETE',
    });
  }

  async reorderCategories(orderedIds: string[]) {
    return this.request<Category[]>('/categories/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ orderedIds }),
    });
  }

  // Brands (AP-CT-05)
  async getBrands() {
    return this.request<Brand[]>('/brands');
  }

  async createBrand(data: Partial<Brand>) {
    return this.request<Brand>('/brands', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBrand(id: string, data: Partial<Brand>) {
    return this.request<Brand>(`/brands/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteBrand(id: string) {
    return this.request<{ message: string; brand: Brand }>(`/brands/${id}`, {
      method: 'DELETE',
    });
  }

  // Promotions & Discounts (AP-DS-01 to AP-DS-04)
  async getPromotions() {
    return this.request<Promotion[]>('/promotions');
  }

  async createPromotion(data: Partial<Promotion>) {
    return this.request<Promotion>('/promotions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePromotion(id: string, data: Partial<Promotion>) {
    return this.request<Promotion>(`/promotions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePromotion(id: string) {
    return this.request<{ message: string }>(`/promotions/${id}`, {
      method: 'DELETE',
    });
  }

  async validatePromotion(code: string, subtotal: number) {
    return this.request<{
      valid: boolean;
      error?: string;
      promoId?: string;
      promoName?: string;
      code?: string;
      type?: 'percentage' | 'fixed';
      value?: number;
      discountAmount?: number;
    }>('/promotions/validate', {
      method: 'POST',
      body: JSON.stringify({ code, subtotal }),
    });
  }

  // Devices & Hardware (AP-DV-01 to AP-DV-04)
  async getDevices() {
    return this.request<PosDevice[]>('/devices');
  }

  async registerDevice(data: Partial<PosDevice>) {
    return this.request<PosDevice>('/devices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createDevice(data: Partial<PosDevice>) {
    return this.registerDevice(data);
  }

  async updateDevice(id: string, data: Partial<PosDevice>) {
    return this.request<PosDevice>(`/devices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteDevice(id: string) {
    return this.request<{ message: string }>(`/devices/${id}`, {
      method: 'DELETE',
    });
  }

  async testPrintDevice(id: string) {
    return this.request<{ success: boolean; message: string; timestamp: string }>(`/devices/${id}/test-print`, {
      method: 'POST',
    });
  }

  async testDevice(id: string) {
    return this.testPrintDevice(id);
  }

  // User Credentials Reset & Activity (AP-AU-04, AP-US-04, AP-US-05)
  async resetUserCredentials(id: string, payload: { newPin?: string; newPassword?: string }) {
    return this.request<{ message: string; userId: string; pinUpdated: boolean; passwordUpdated: boolean }>(
      `/users/${id}/reset-credentials`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  async getUserActivity(id: string) {
    return this.request<{
      userId: string;
      userName: string;
      userRole: string;
      totalOrdersCount: number;
      completedOrdersCount: number;
      totalRevenue: number;
      totalDiscounts: number;
      averageTicket: number;
      voidedCount: number;
      refundedCount: number;
      recentOrders: Order[];
    }>(`/users/${id}/activity`);
  }

  // Dashboard Overview (AP-DB-01 to AP-DB-04)
  async getDashboardOverview(params?: { period?: string; startDate?: string; endDate?: string }) {
    const q = new URLSearchParams();
    if (params?.period) q.set('period', params.period);
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    return this.request<{
      kpis: {
        grossSales: number;
        netSales: number;
        discountTotal: number;
        taxTotal: number;
        grossProfit: number;
        grossProfitMargin: number;
        orderCount: number;
        averageOrderValue: number;
        totalCustomers: number;
        activeStaffCount: number;
        lowStockCount: number;
        outOfStockCount: number;
      };
      trendPoints: Array<{ label: string; sales: number; orders: number }>;
      paymentBreakdown: Record<string, number>;
      lowStockItems: Array<{
        id: string;
        name: string;
        sku: string;
        barcode: string;
        stockQuantity: number;
        lowStockThreshold: number;
        categoryName?: string;
        price: number;
        cost: number;
      }>;
      recentOrders: Order[];
    }>(`/dashboard/overview?${q.toString()}`);
  }

  // Background Tasks & Receipts (BE-BG-01 to BE-BG-04)
  async sendEmailReceipt(orderId: string, email: string) {
    return this.request<{ success: boolean; message: string; task: any }>('/background/send-receipt', {
      method: 'POST',
      body: JSON.stringify({ orderId, email }),
    });
  }

  async getBackgroundTasks() {
    return this.request<any[]>('/background/tasks');
  }

  // Orders
  async createOrder(data: {
    items: any[];
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    subtotal?: number;
    discountTotal: number;
    taxTotal?: number;
    grandTotal?: number;
    pointsRedeemed?: number;
    pointsDiscountAmount?: number;
    payment: any;
    cashierId?: string;
    cashierName?: string;
  }) {
    return this.request<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getOrders(params?: { search?: string; cashierId?: string; status?: string; paymentMethod?: string }) {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.cashierId) q.set('cashierId', params.cashierId);
    if (params?.status) q.set('status', params.status);
    if (params?.paymentMethod) q.set('paymentMethod', params.paymentMethod);

    return this.request<Order[]>(`/orders?${q.toString()}`);
  }

  async getOrder(id: string) {
    return this.request<Order>(`/orders/${id}`);
  }

  async voidOrder(id: string, reason: string) {
    return this.request<{ message: string; order: Order }>(`/orders/${id}/void`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async refundOrder(id: string, reason: string, amount?: number) {
    return this.request<{ message: string; order: Order }>(`/orders/${id}/refund`, {
      method: 'POST',
      body: JSON.stringify({ reason, amount }),
    });
  }

  // Held Orders
  async getHeldOrders() {
    return this.request<HeldOrder[]>('/orders/held');
  }

  async holdOrder(data: { items: any[]; customer?: Customer; orderDiscountPercent?: number; orderDiscountAmount?: number; notes?: string }) {
    return this.request<HeldOrder>('/orders/hold', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async retrieveHeldOrder(id: string) {
    return this.request<{ message: string; heldOrder: HeldOrder }>(`/orders/held/${id}`, {
      method: 'DELETE',
    });
  }

  // Customers
  async getCustomers(search?: string) {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request<Customer[]>(`/customers${q}`);
  }

  async getCustomer(id: string) {
    return this.request<{ customer: Customer; orders: Order[] }>(`/customers/${id}`);
  }

  async createCustomer(data: Partial<Customer>) {
    return this.request<Customer>('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCustomer(id: string, data: Partial<Customer>) {
    return this.request<Customer>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getCustomerLoyaltyHistory(customerId: string) {
    return this.request<{
      customer: Customer;
      history: LoyaltyTransaction[];
      summary: {
        currentBalance: number;
        loyaltyTier: string;
        redemptionDollarValue: number;
        pointsPerDollarSpent: number;
        redemptionRateText: string;
        minPointsToRedeem: number;
        totalEarned: number;
        totalRedeemed: number;
      };
    }>(`/customers/${customerId}/loyalty-history`);
  }

  async adjustCustomerLoyalty(customerId: string, points: number, reason: string) {
    return this.request<{ customer: Customer; transaction: LoyaltyTransaction }>(
      `/customers/${customerId}/loyalty-adjust`,
      {
        method: 'POST',
        body: JSON.stringify({ points, reason }),
      }
    );
  }

  // Inventory
  async getInventory(lowStockOnly = false) {
    return this.request<Product[]>(`/inventory?lowStockOnly=${lowStockOnly}`);
  }

  async adjustInventory(
    productIdOrData: string | { productId: string; newQuantity: number; reason: string; type?: string },
    newQuantity?: number,
    reason?: string
  ) {
    let payload: { productId: string; newQuantity: number; reason: string; type?: string };
    if (typeof productIdOrData === 'string') {
      payload = {
        productId: productIdOrData,
        newQuantity: newQuantity ?? 0,
        reason: reason || 'Manual adjustment',
        type: 'recount',
      };
    } else {
      payload = productIdOrData;
    }

    return this.request<{ message: string; product: Product }>('/inventory/adjust', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async receiveStock(data: { productId: string; quantityReceived: number; poNumber?: string; notes?: string }) {
    return this.request<{ message: string; product: Product }>('/inventory/receive', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async receiveInventory(productId: string, quantityReceived: number, poNumber?: string, notes?: string) {
    return this.receiveStock({
      productId,
      quantityReceived,
      poNumber,
      notes,
    });
  }

  async getInventoryAdjustments() {
    return this.request<any[]>('/inventory/adjustments');
  }

  // Reports
  async getSalesReport(period: 'today' | 'week' | 'month' | 'all' = 'today'): Promise<SalesReport> {
    return this.request<SalesReport>(`/reports/sales?period=${period}`);
  }

  // Settings
  async getSettings() {
    return this.request<StoreSettings>('/settings');
  }

  async updateSettings(data: Partial<StoreSettings>) {
    return this.request<StoreSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Audit Logs
  async getAuditLogs() {
    return this.request<AuditLog[]>('/audit-logs');
  }

  // --------------------------------------------------
  // IN-SC-01 to IN-SC-18: Vendor & Invoice API Methods
  // --------------------------------------------------

  async getVendors(query?: string) {
    const q = query ? `?q=${encodeURIComponent(query)}` : '';
    return this.request<Vendor[]>(`/vendors${q}`);
  }

  async createVendor(data: Partial<Vendor>) {
    return this.request<Vendor>('/vendors', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateVendor(id: string, data: Partial<Vendor>) {
    return this.request<Vendor>(`/vendors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getVendorStats(id: string) {
    return this.request<VendorPurchaseStats>(`/vendors/${id}/stats`);
  }

  // Extract Invoice via Gemini / Smart beverage parser
  async extractInvoice(payload: {
    fileDataUrl?: string;
    fileName?: string;
    fileType?: string;
    manualText?: string;
  }): Promise<ScannedInvoice> {
    return this.request<ScannedInvoice>('/invoices/extract', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getInvoices(filters?: {
    status?: string;
    vendorId?: string;
    q?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.vendorId) params.append('vendorId', filters.vendorId);
    if (filters?.q) params.append('q', filters.q);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    const queryStr = params.toString() ? `?${params.toString()}` : '';
    return this.request<ScannedInvoice[]>(`/invoices${queryStr}`);
  }

  async getInvoice(id: string) {
    return this.request<ScannedInvoice>(`/invoices/${id}`);
  }

  async saveInvoiceDraft(data: Partial<ScannedInvoice>) {
    return this.request<ScannedInvoice>('/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInvoiceDraft(id: string, data: Partial<ScannedInvoice>) {
    return this.request<ScannedInvoice>(`/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async confirmAndReceiveInvoice(id: string, data: Partial<ScannedInvoice>) {
    return this.request<{
      success: boolean;
      invoice: ScannedInvoice;
      createdProducts: Product[];
      createdVendor?: Vendor;
      receivingTransactions: InventoryReceivingTransaction[];
    }>(`/invoices/${id}/confirm`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getReceivingHistory() {
    return this.request<InventoryReceivingTransaction[]>('/invoices-receiving-history');
  }

  // INV-01 to INV-18: Mobile QR Invoice Upload Sessions
  async createUploadSession(expiryMinutes?: number) {
    return this.request<InvoiceUploadSession>('/invoices/upload-sessions', {
      method: 'POST',
      body: JSON.stringify({ expiryMinutes }),
    });
  }

  async getUploadSession(id: string) {
    return this.request<InvoiceUploadSession>(`/invoices/upload-sessions/${id}`);
  }

  async connectUploadSession(id: string, token: string) {
    return this.request<{ success: boolean; session: InvoiceUploadSession }>(`/invoices/upload-sessions/${id}/connect`, {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async uploadSessionInvoice(id: string, data: { fileDataUrls: string[]; fileNames?: string[]; manualText?: string }) {
    return this.request<{ success: boolean; session: InvoiceUploadSession; invoice: ScannedInvoice }>(`/invoices/upload-sessions/${id}/upload`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async cancelUploadSession(id: string) {
    return this.request<{ success: boolean; session: InvoiceUploadSession }>(`/invoices/upload-sessions/${id}/cancel`, {
      method: 'POST',
    });
  }

  // INV-MB-01 to INV-MB-20: Multi-Barcode Receiving Sessions
  async getBarcodeReceivingSessions() {
    return this.request<BarcodeReceivingSession[]>('/invoices/barcode-sessions');
  }

  async createBarcodeReceivingSession(data: {
    vendorId?: string;
    vendorName: string;
    invoiceNumber: string;
    invoiceDate?: string;
    receivingLocation?: string;
    expectedTotalUnits?: number;
    notes?: string;
  }) {
    return this.request<BarcodeReceivingSession>('/invoices/barcode-sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getBarcodeReceivingSession(id: string) {
    return this.request<BarcodeReceivingSession>(`/invoices/barcode-sessions/${id}`);
  }

  async updateBarcodeReceivingSession(id: string, data: Partial<BarcodeReceivingSession>) {
    return this.request<BarcodeReceivingSession>(`/invoices/barcode-sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async scanBarcodeInSession(id: string, payload: {
    barcode: string;
    isCaseBarcode?: boolean;
    manualQuantity?: number;
    packMultiplier?: number;
  }) {
    return this.request<{
      found: boolean;
      scannedLine?: BarcodeReceivingLine;
      session: BarcodeReceivingSession;
      message: string;
    }>(`/invoices/barcode-sessions/${id}/scan`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async linkUnknownBarcodeInSession(id: string, payload: {
    barcode: string;
    productId?: string;
    newProductData?: any;
    receivedUnits?: number;
  }) {
    return this.request<{
      success: boolean;
      product: Product;
      session: BarcodeReceivingSession;
    }>(`/invoices/barcode-sessions/${id}/link-unknown`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async confirmBarcodeReceiving(id: string, payload?: { approveAllCosts?: boolean }) {
    return this.request<{
      success: boolean;
      receivingNumber: string;
      session: BarcodeReceivingSession;
      receivingTransactions: InventoryReceivingTransaction[];
      updatedProductCount: number;
      totalUnitsReceived: number;
    }>(`/invoices/barcode-sessions/${id}/receive`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
  }

  // ============================================================================
  // SHIFT MANAGEMENT APIS (SR-01 to SR-25)
  // ============================================================================
  async getCurrentShift(registerId?: string, cashierId?: string): Promise<{
    hasActiveShift: boolean;
    shift?: Shift;
    summary?: ShiftSummarySnapshot;
    durationMinutes?: number;
    lastClosedShift?: Shift | null;
    suggestedStartingCash?: number;
  }> {
    const params = new URLSearchParams();
    if (registerId) params.append('registerId', registerId);
    if (cashierId) params.append('cashierId', cashierId);
    return this.request(`/shifts/current?${params.toString()}`);
  }

  async startShift(payload: {
    cashierId: string;
    registerId: string;
    registerName?: string;
    startingCash: number;
    pin: string;
    inheritFromPrevious?: boolean;
    notes?: string;
  }): Promise<{ message: string; shift: Shift }> {
    return this.request('/shifts/start', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getShifts(filters?: { status?: string; cashierId?: string; registerId?: string; date?: string }): Promise<Shift[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.cashierId) params.append('cashierId', filters.cashierId);
    if (filters?.registerId) params.append('registerId', filters.registerId);
    if (filters?.date) params.append('date', filters.date);
    const res = await this.request<any>(`/shifts?${params.toString()}`);
    return Array.isArray(res) ? res : (res?.shifts || []);
  }

  async getShift(id: string): Promise<{ shift: Shift; summary: ShiftSummarySnapshot }> {
    return this.request(`/shifts/${id}`);
  }

  async recordCashMovement(
    shiftId: string,
    payload: {
      type: 'cash_in' | 'cash_drop' | 'payout';
      amount: number;
      reason: string;
      managerPin?: string;
      managerName?: string;
      drawerCountAfter?: number;
    }
  ): Promise<{ message: string; movement: ShiftCashMovement; shift: Shift }> {
    return this.request(`/shifts/${shiftId}/cash-movement`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async reconcileShift(
    shiftId: string,
    payload: {
      denominations: ShiftDenominationCount;
      actualChecks?: number;
      actualCards?: number;
      notes?: string;
    }
  ): Promise<{
    message: string;
    reconciliation: ShiftReconciliation;
    summary: ShiftSummarySnapshot;
    requiresManagerOverride: boolean;
    varianceToleranceExceeded: boolean;
  }> {
    return this.request(`/shifts/${shiftId}/reconcile`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async closeShift(
    shiftId: string,
    payload: {
      denominations: ShiftDenominationCount;
      actualChecks?: number;
      actualCards?: number;
      notes?: string;
      managerOverridePin?: string;
      overrideReason?: string;
    }
  ): Promise<{
    message: string;
    shift: Shift;
    summary: ShiftSummarySnapshot;
    reconciliation: ShiftReconciliation;
    zReportData: any;
  }> {
    return this.request(`/shifts/${shiftId}/close`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async overrideShift(
    shiftId: string,
    payload: {
      managerPin: string;
      reason: string;
    }
  ): Promise<{ message: string; shift: Shift }> {
    return this.request(`/shifts/${shiftId}/override`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async emailShiftReport(shiftId: string, email: string): Promise<{ message: string }> {
    return this.request(`/shifts/${shiftId}/email`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // ============================================================================
  // CHECK ISSUANCE & LEDGER APIS (CI-01 to CI-15)
  // ============================================================================
  async getBankAccounts(): Promise<BankAccount[]> {
    const res = await this.request<any>('/checks/bank-accounts');
    return Array.isArray(res) ? res : (res?.bankAccounts || []);
  }

  async getIssuedChecks(filters?: {
    bankAccountId?: string;
    status?: string;
    payee?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<IssuedCheck[]> {
    const params = new URLSearchParams();
    if (filters?.bankAccountId) params.append('bankAccountId', filters.bankAccountId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.payee) params.append('payee', filters.payee);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    const res = await this.request<any>(`/checks/issued?${params.toString()}`);
    return Array.isArray(res) ? res : (res?.checks || []);
  }

  async getIssuedCheck(id: string): Promise<IssuedCheck> {
    return this.request(`/checks/issued/${id}`);
  }

  async createIssuedCheck(payload: {
    bankAccountId: string;
    payeeName: string;
    amount: number;
    issueDate?: string;
    memo?: string;
    category?: string;
    vendorId?: string;
    invoiceNumbers?: string[];
    allocations?: CheckStubAllocation[];
    requireManagerApproval?: boolean;
    payeeType?: string;
    paymentCategory?: string;
  }): Promise<{ message: string; check: IssuedCheck; requiresApproval: boolean }> {
    return this.request('/checks/issued', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async approveIssuedCheck(id: string, notes?: string): Promise<{ message: string; check: IssuedCheck }> {
    return this.request(`/checks/issued/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }

  async rejectIssuedCheck(id: string, reason: string): Promise<{ message: string; check: IssuedCheck }> {
    return this.request(`/checks/issued/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async printIssuedCheck(id: string, format?: 'voucher_top' | 'voucher_middle' | 'voucher_bottom' | 'standard'): Promise<{
    message: string;
    check: IssuedCheck;
    printPayload: any;
  }> {
    return this.request(`/checks/issued/${id}/print`, {
      method: 'POST',
      body: JSON.stringify({ format }),
    });
  }

  async reprintIssuedCheck(id: string, reason: string): Promise<{
    message: string;
    check: IssuedCheck;
    printPayload: any;
  }> {
    return this.request(`/checks/issued/${id}/reprint`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async voidIssuedCheck(id: string, reason: string): Promise<{ message: string; check: IssuedCheck }> {
    return this.request(`/checks/issued/${id}/void`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async reissueIssuedCheck(id: string, newCheckNumber: string, reason: string): Promise<{
    message: string;
    voidedCheck: IssuedCheck;
    newCheck: IssuedCheck;
  }> {
    return this.request(`/checks/issued/${id}/reissue`, {
      method: 'POST',
      body: JSON.stringify({ newCheckNumber, reason }),
    });
  }

  // ============================================================================
  // CHECK CASHING MODULE APIS (CC-01 to CC-30)
  // ============================================================================
  async getCheckCashingDashboard(): Promise<{
    todayStats: {
      checksCount: number;
      totalVolume: number;
      totalFeesCollected: number;
      averageCheck: number;
    };
    pendingApprovalsCount: number;
    readyForDepositCount: number;
    readyForDepositAmount: number;
    returnedCount: number;
    returnedAmount: number;
    recentTransactions: CheckCashingTransaction[];
    activeFeeRules: CheckFeeRule[];
  }> {
    return this.request('/check-cashing/dashboard');
  }

  async getCheckFeeRules(): Promise<CheckFeeRule[]> {
    const res = await this.request<any>('/check-cashing/fee-rules');
    return Array.isArray(res) ? res : (res?.feeRules || []);
  }

  async updateCheckFeeRules(rules: CheckFeeRule[]): Promise<{ message: string; rules: CheckFeeRule[] }> {
    return this.request('/check-cashing/fee-rules', {
      method: 'PUT',
      body: JSON.stringify({ rules }),
    });
  }

  async getCheckIssuers(): Promise<CheckIssuer[]> {
    const res = await this.request<any>('/check-cashing/issuers');
    return Array.isArray(res) ? res : (res?.issuers || []);
  }

  async createCheckIssuer(payload: Partial<CheckIssuer>): Promise<{ message: string; issuer: CheckIssuer }> {
    return this.request('/check-cashing/issuers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async extractCheckOrId(payload: {
    type: 'check' | 'id_front' | 'id_back';
    imageUrl?: string;
    imageData?: string;
    sampleType?: string;
  }): Promise<any> {
    return this.request('/check-cashing/extract', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getCheckCashingTransactions(filters?: {
    status?: string;
    customerId?: string;
    checkType?: string;
    startDate?: string;
    endDate?: string;
    requiresApproval?: boolean;
    unbatchedOnly?: boolean;
  }): Promise<CheckCashingTransaction[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.customerId) params.append('customerId', filters.customerId);
    if (filters?.checkType) params.append('checkType', filters.checkType);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.requiresApproval !== undefined) params.append('requiresApproval', String(filters.requiresApproval));
    if (filters?.unbatchedOnly) params.append('unbatchedOnly', 'true');
    const res = await this.request<any>(`/check-cashing/transactions?${params.toString()}`);
    return Array.isArray(res) ? res : (res?.transactions || []);
  }

  async createCheckCashingTransaction(payload: any): Promise<{
    message: string;
    transaction: CheckCashingTransaction;
    feeCalc: any;
    riskEval: any;
    cashMovementRecorded: boolean;
  }> {
    return this.request('/check-cashing/transactions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async payoutCheckCashing(id: string, shiftId?: string): Promise<{
    message: string;
    transaction: CheckCashingTransaction;
    cashMovement: any;
  }> {
    return this.request(`/check-cashing/transactions/${id}/payout`, {
      method: 'POST',
      body: JSON.stringify({ shiftId }),
    });
  }

  async decideCheckCashingApproval(
    id: string,
    decision: 'approved' | 'rejected',
    managerPin?: string,
    notes?: string
  ): Promise<{ message: string; transaction: CheckCashingTransaction }> {
    return this.request(`/check-cashing/transactions/${id}/manager-decision`, {
      method: 'POST',
      body: JSON.stringify({ decision, managerPin, notes }),
    });
  }

  async createCheckQrSession(customerName?: string, notes?: string): Promise<CheckQrSession> {
    return this.request('/check-cashing/qr/session', {
      method: 'POST',
      body: JSON.stringify({ customerName, notes }),
    });
  }

  async getCheckQrSession(token: string): Promise<{ session: CheckQrSession; expired: boolean }> {
    return this.request(`/check-cashing/qr/session/${token}`);
  }

  async submitCheckQrImages(token: string, payload: {
    checkFrontUrl?: string;
    checkBackUrl?: string;
    customerIdFrontUrl?: string;
    customerIdBackUrl?: string;
  }): Promise<{ message: string; session: CheckQrSession }> {
    return this.request(`/check-cashing/qr/session/${token}/submit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getDepositBatches(): Promise<DepositBatch[]> {
    const res = await this.request<any>('/check-cashing/deposit-batches');
    return Array.isArray(res) ? res : (res?.batches || []);
  }

  async createDepositBatch(payload: {
    depositBankAccountId: string;
    transactionIds?: string[];
    notes?: string;
  }): Promise<{ message: string; batch: DepositBatch; printableSlip: any }> {
    return this.request('/check-cashing/deposit-batch', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async markDepositBatchDeposited(id: string, bankReferenceNumber?: string, notes?: string): Promise<{
    message: string;
    batch: DepositBatch;
  }> {
    return this.request(`/check-cashing/deposit-batches/${id}/mark-deposited`, {
      method: 'POST',
      body: JSON.stringify({ bankReferenceNumber, notes }),
    });
  }

  async markCheckReturned(
    id: string,
    payload: {
      returnReason: string;
      bankFeeCharged?: number;
      customerRecoveryFee?: number;
    }
  ): Promise<{ message: string; transaction: CheckCashingTransaction }> {
    return this.request(`/check-cashing/transactions/${id}/mark-returned`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async recordCheckRecovery(
    id: string,
    payload: {
      recoveredAmount: number;
      paymentMethod: string;
      notes?: string;
    }
  ): Promise<{ message: string; transaction: CheckCashingTransaction }> {
    return this.request(`/check-cashing/transactions/${id}/recovery`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getCheckCashingReports(startDate?: string, endDate?: string): Promise<any> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return this.request(`/check-cashing/reports?${params.toString()}`);
  }

  // Sync offline queue when coming back online
  async syncOfflineQueue() {
    const raw = localStorage.getItem('pos_offline_queue');
    if (!raw) return 0;
    try {
      const queue = JSON.parse(raw);
      if (!Array.isArray(queue) || queue.length === 0) return 0;

      let synced = 0;
      for (const item of queue) {
        await this.createOrder(item);
        synced++;
      }
      localStorage.removeItem('pos_offline_queue');
      this.offlineOrderQueue = [];
      return synced;
    } catch (e) {
      console.error('Failed to sync offline orders', e);
      return 0;
    }
  }

  // ----------------------------------------------------
  // WEB-001 to WEB-054: Online Store Integration
  // ----------------------------------------------------

  async getOnlineStoreConfig(): Promise<{ config: OnlineStoreConfig; canRollback: boolean; previousVersion: number | null }> {
    return this.request('/online-store/config');
  }

  async updateOnlineStoreConfig(updates: Partial<OnlineStoreConfig>): Promise<{ success: boolean; config: OnlineStoreConfig; message: string }> {
    return this.request('/online-store/config', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async publishOnlineStore(): Promise<{ success: boolean; message: string; config: OnlineStoreConfig; liveUrl: string }> {
    return this.request('/online-store/publish', {
      method: 'POST',
    });
  }

  async rollbackOnlineStore(): Promise<{ success: boolean; message: string; config: OnlineStoreConfig }> {
    return this.request('/online-store/rollback', {
      method: 'POST',
    });
  }

  async getOnlineProducts(params: {
    category?: string;
    brand?: string;
    search?: string;
    inStockOnly?: boolean;
    onlyOnline?: boolean;
  } = {}): Promise<{ products: any[]; totalCount: number; onlineCount: number }> {
    const query = new URLSearchParams();
    if (params.category) query.append('category', params.category);
    if (params.brand) query.append('brand', params.brand);
    if (params.search) query.append('search', params.search);
    if (params.inStockOnly) query.append('inStockOnly', 'true');
    if (params.onlyOnline) query.append('onlyOnline', 'true');
    return this.request(`/online-store/products?${query.toString()}`);
  }

  async updateOnlineProductSettings(
    productId: string,
    settings: Partial<OnlineProductSettings>
  ): Promise<{ success: boolean; productSettings: OnlineProductSettings }> {
    return this.request(`/online-store/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async bulkUpdateOnlineProducts(payload: {
    productIds: string[];
    sellOnline?: boolean;
    pickupAvailable?: boolean;
    deliveryAvailable?: boolean;
    safetyStock?: number;
  }): Promise<{ success: boolean; updatedCount: number; message: string }> {
    return this.request('/online-store/products/bulk', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getOnlineOrders(status?: string, fulfillmentType?: string): Promise<{
    orders: OnlineOrder[];
    counts: Record<string, number>;
  }> {
    const query = new URLSearchParams();
    if (status && status !== 'all') query.append('status', status);
    if (fulfillmentType && fulfillmentType !== 'all') query.append('fulfillmentType', fulfillmentType);
    return this.request(`/online-store/orders?${query.toString()}`);
  }

  async createOnlineOrder(payload: any): Promise<{ success: boolean; message: string; order: OnlineOrder }> {
    return this.request('/online-store/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateOnlineOrderStatus(
    id: string,
    status: string,
    ageVerifiedAtPickupOrDelivery?: boolean,
    notes?: string
  ): Promise<{ success: boolean; order: OnlineOrder; message: string }> {
    return this.request(`/online-store/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, ageVerifiedAtPickupOrDelivery, notes }),
    });
  }

  async getOnlineCoupons(): Promise<{ coupons: OnlineCoupon[] }> {
    return this.request('/online-store/coupons');
  }

  async validateCoupon(code: string, subtotal: number): Promise<{ valid: boolean; coupon?: OnlineCoupon; discountAmount?: number; message?: string }> {
    return this.request('/online-store/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code, subtotal }),
    });
  }

  async createOnlineCoupon(payload: {
    code: string;
    discountType: 'percentage' | 'fixed_amount' | 'fixed';
    value?: number;
    discountValue?: number;
    minOrderAmount?: number;
    description?: string;
    isActive?: boolean;
  }): Promise<{ success: boolean; coupon: OnlineCoupon }> {
    const normalizedPayload = {
      ...payload,
      discountType: payload.discountType === 'fixed' ? 'fixed_amount' : payload.discountType,
      value: payload.value ?? payload.discountValue ?? 0,
    };
    return this.request('/online-store/coupons', {
      method: 'POST',
      body: JSON.stringify(normalizedPayload),
    });
  }

  async createOnlineStoreOrder(payload: any): Promise<{ success: boolean; order: OnlineOrder }> {
    return this.createOnlineOrder(payload);
  }

  async getStoreLocations(): Promise<{ locations: StoreLocation[] }> {
    return this.request('/online-store/locations');
  }

  async getOnlineStoreAnalytics(): Promise<{ analytics: any }> {
    return this.request('/online-store/analytics');
  }

  // ----------------------------------------------------
  // AI Shelf Counting & Recount History
  // ----------------------------------------------------

  async countShelfBottlesWithAi(imageDataUrl: string, shelfLocation?: string): Promise<{
    success: boolean;
    shelfLocation: string;
    totalBottlesDetected: number;
    confidenceScore: number;
    items: any[];
    analyzedAt: string;
  }> {
    return this.request('/inventory/ai-shelf-count', {
      method: 'POST',
      body: JSON.stringify({ imageDataUrl, shelfLocation }),
    });
  }

  async applyAiShelfCount(payload: {
    shelfLocation: string;
    photoUrl?: string;
    items: any[];
    notes?: string;
  }): Promise<{ success: boolean; message: string; session: AiShelfCountSession; adjustments: InventoryAdjustment[] }> {
    return this.request('/inventory/ai-shelf-count/apply', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getAiShelfCountSessions(): Promise<{ sessions: AiShelfCountSession[] }> {
    return this.request('/inventory/ai-shelf-count/sessions');
  }

  // ----------------------------------------------------
  // OMNICHANNEL ENGINE METHODS (EPICS 1 - 16)
  // ----------------------------------------------------

  async getInventoryLedger(params?: {
    productId?: string;
    channel?: string;
    reason?: string;
    limit?: number;
  }): Promise<{ ledger: any[]; totalCount: number }> {
    const q = new URLSearchParams();
    if (params?.productId) q.append('productId', params.productId);
    if (params?.channel) q.append('channel', params.channel);
    if (params?.reason) q.append('reason', params.reason);
    if (params?.limit) q.append('limit', params.limit.toString());
    return this.request(`/inventory/ledger?${q.toString()}`);
  }

  async getProductATS(productId: string): Promise<any> {
    return this.request(`/inventory/ats/${productId}`);
  }

  async getAllProductsATS(): Promise<{ atsList: any[] }> {
    return this.request('/inventory/ats');
  }

  async reserveInventory(payload: {
    orderId?: string;
    orderNumber?: string;
    productId: string;
    quantity: number;
    channel?: 'web' | 'mobile_queue' | 'bopis';
    durationMinutes?: number;
  }): Promise<{ success: boolean; reservation: any }> {
    return this.request('/inventory/reserve', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async createCartTransfer(payload: {
    items: any[];
    customerName?: string;
    customerPhone?: string;
    sourceChannel?: 'web' | 'mobile_queue' | 'pos';
    destinationRegisterId?: string;
  }): Promise<{ success: boolean; transfer: any }> {
    return this.request('/omnichannel/cart-transfer', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getCartTransfer(code: string): Promise<{ success: boolean; transfer: any }> {
    return this.request(`/omnichannel/cart-transfer/${encodeURIComponent(code)}`);
  }

  async claimCartTransfer(code: string, registerId = 'reg-1'): Promise<{ success: boolean; transfer: any; message: string }> {
    return this.request(`/omnichannel/cart-transfer/${encodeURIComponent(code)}/claim`, {
      method: 'POST',
      body: JSON.stringify({ registerId }),
    });
  }

  async getBundles(): Promise<{ bundles: any[] }> {
    return this.request('/bundles');
  }

  async getSubstitutions(productId?: string): Promise<{ substitutions: any[] }> {
    const q = productId ? `?productId=${encodeURIComponent(productId)}` : '';
    return this.request(`/substitutions${q}`);
  }

  async getDigitalTwinLayout(): Promise<{ shelfPositions: any[] }> {
    return this.request('/digital-twin');
  }

  // PAYMENT FALLBACK SYSTEM (PAY-001 TO PAY-028)
  async getTerminalHealth(): Promise<{
    status: 'online' | 'offline' | 'chip_reader_error' | 'timeout';
    deviceIp: string;
    model: string;
    serialNumber: string;
    batteryLevel?: number;
    lastPing: string;
  }> {
    return this.request('/payments/terminal-health');
  }

  async simulateTerminalHealth(status: 'online' | 'offline' | 'chip_reader_error' | 'timeout'): Promise<{
    success: boolean;
    terminalHealth: any;
  }> {
    return this.request('/payments/terminal-health/simulate', {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  }

  async createPaymentSession(params: {
    orderNumber: string;
    amount: number;
    method: CardFallbackMethod | 'split';
    mode: 'customer' | 'employee';
    registerId?: string;
    fallbackReason?: string;
    orderPayload?: any;
  }): Promise<{ success: boolean; session: PaymentSession; qrUrl: string }> {
    return this.request('/payments/session/create', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getPaymentSession(idOrToken: string): Promise<{ success: boolean; session: PaymentSession }> {
    return this.request(`/payments/session/${encodeURIComponent(idOrToken)}`);
  }

  async connectPaymentSession(idOrToken: string): Promise<{ success: boolean; session: PaymentSession }> {
    return this.request(`/payments/session/${encodeURIComponent(idOrToken)}/connect`, {
      method: 'POST',
    });
  }

  async startPaymentSessionEntry(idOrToken: string): Promise<{ success: boolean; session: PaymentSession }> {
    return this.request(`/payments/session/${encodeURIComponent(idOrToken)}/start-entry`, {
      method: 'POST',
    });
  }

  async authorizePaymentSession(
    sessionId: string,
    params: {
      idempotencyKey?: string;
      cardBrand?: string;
      cardLast4?: string;
      entryMode?: string;
      postalCode?: string;
      simulateFailure?: 'none' | 'card_declined' | 'expired_card' | 'terminal_offline';
    }
  ): Promise<{ success: boolean; session: PaymentSession }> {
    return this.request(`/payments/session/${encodeURIComponent(sessionId)}/authorize`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async cancelPaymentSession(sessionId: string): Promise<{ success: boolean; session: PaymentSession }> {
    return this.request(`/payments/session/${encodeURIComponent(sessionId)}/cancel`, {
      method: 'POST',
    });
  }

  async processManualCardEntry(params: {
    amount: number;
    cardBrand?: string;
    cardLast4?: string;
    postalCode?: string;
    reason: string;
    managerPin?: string;
    orderNumber?: string;
  }): Promise<{ success: boolean; paymentResult: any }> {
    return this.request('/payments/manual-entry', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getPaymentAuditLogs(): Promise<{ auditLogs: PaymentAuditLog[] }> {
    return this.request('/payments/audit-log');
  }
}

export const api = new ApiService();
