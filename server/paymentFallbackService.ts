import { PaymentSession, PaymentAuditLog, CardFallbackMethod, PaymentSessionStatus } from '../src/types';

// In-memory payment session store with duplicate charge protection & locks
class PaymentFallbackService {
  private sessions: Map<string, PaymentSession> = new Map();
  private auditLogs: PaymentAuditLog[] = [];
  private sessionLocks: Map<string, { lockedAt: number; lockedBy: string }> = new Map();

  // Terminal health state for PAY-014 (Simulate hardware/network failure)
  private terminalHealth: {
    status: 'online' | 'offline' | 'chip_reader_error' | 'timeout';
    deviceIp: string;
    model: string;
    serialNumber: string;
    batteryLevel?: number;
    lastPing: string;
  } = {
    status: 'online',
    deviceIp: '192.168.1.45',
    model: 'PAX D210 EMV Wireless',
    serialNumber: 'SN-PAX-884920',
    batteryLevel: 94,
    lastPing: new Date().toISOString(),
  };

  private config: {
    fallbackEnabled: boolean;
    tapToPayPhoneEnabled: boolean;
    customerQrEnabled: boolean;
    customerSelfEntryAllowed: boolean;
    manualEntryAllowed: boolean;
    sessionExpiryMinutes: number;
  } = {
    fallbackEnabled: true,
    tapToPayPhoneEnabled: true,
    customerQrEnabled: true,
    customerSelfEntryAllowed: true,
    manualEntryAllowed: true,
    sessionExpiryMinutes: 10,
  };

  public updateConfig(newConfig: Partial<{
    fallbackEnabled: boolean;
    tapToPayPhoneEnabled: boolean;
    customerQrEnabled: boolean;
    customerSelfEntryAllowed: boolean;
    manualEntryAllowed: boolean;
    sessionExpiryMinutes: number;
  }>) {
    this.config = { ...this.config, ...newConfig };
    return this.config;
  }

  public getConfig() {
    return this.config;
  }

  constructor() {
    // Seed with a sample audit entry
    this.auditLogs.push({
      id: 'aud-pay-1',
      orderNumber: 'ORD-10488',
      paymentAttemptId: 'att-8921',
      store: '377 Spirits #01 - Granbury',
      register: 'Register #1',
      employeeId: 'usr-3',
      employeeName: 'Elena Rostova',
      selectedMethod: 'card_terminal',
      processorTxId: 'ch_3N87a98v7a98sd',
      amount: 42.50,
      result: 'authorized',
      deviceSessionRef: 'PAX-D210-ENCRYPTED',
      reasonForFallback: 'Normal primary terminal processing',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    });
  }

  // PAY-014: Get or set terminal health status
  getTerminalHealth() {
    return {
      ...this.terminalHealth,
      lastPing: new Date().toISOString(),
    };
  }

  setTerminalHealth(status: 'online' | 'offline' | 'chip_reader_error' | 'timeout') {
    this.terminalHealth.status = status;
    return this.getTerminalHealth();
  }

  // PAY-004, PAY-006, PAY-009, PAY-010: Create unique short-lived payment session
  createSession(params: {
    orderNumber: string;
    amount: number;
    method: CardFallbackMethod | 'split';
    mode: 'customer' | 'employee'; // PAY-008: strictly separated
    registerId: string;
    cashierId: string;
    cashierName: string;
    fallbackReason?: string;
    orderPayload?: any;
  }): PaymentSession {
    const sessionId = `pay_sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const opaqueToken = `tok_${Math.random().toString(36).substring(2, 15)}_${Math.random().toString(36).substring(2, 15)}`;
    const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes (PAY-010, PAY-022)

    // Ensure fixed amount (PAY-009: Customer cannot tamper or modify amount)
    const fixedAmount = Math.round(Number(params.amount) * 100) / 100;

    const session: PaymentSession = {
      id: sessionId,
      orderNumber: params.orderNumber || `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
      amount: fixedAmount,
      currency: 'USD',
      method: params.method,
      mode: params.mode,
      status: 'qr_created',
      idempotencyKey,
      opaqueToken,
      expiresAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      registerId: params.registerId || 'Register #1',
      cashierId: params.cashierId || 'usr-3',
      cashierName: params.cashierName || 'Elena Rostova',
      fallbackReason: params.fallbackReason || 'Cashier initiated card fallback',
      orderPayload: params.orderPayload,
    };

    this.sessions.set(sessionId, session);

    // Record audit entry (PAY-028)
    this.recordAudit({
      orderNumber: session.orderNumber,
      paymentAttemptId: session.id,
      store: '377 Spirits #01 - Granbury',
      register: session.registerId,
      employeeId: session.cashierId,
      employeeName: session.cashierName,
      selectedMethod: session.method,
      amount: session.amount,
      result: 'authorized', // will be updated upon finalization
      deviceSessionRef: session.mode === 'customer' ? 'Customer Phone Browser' : 'Store Mobile Terminal (Tap to Pay)',
      reasonForFallback: session.fallbackReason,
    });

    return session;
  }

  // Lookup session by ID or opaqueToken
  getSession(idOrToken: string): PaymentSession | null {
    let session = this.sessions.get(idOrToken);
    if (!session) {
      for (const s of this.sessions.values()) {
        if (s.opaqueToken === idOrToken) {
          session = s;
          break;
        }
      }
    }

    if (!session) return null;

    // PAY-022: Check if expired
    if (session.status !== 'payment_complete' && session.status !== 'failed' && session.status !== 'cancelled') {
      if (new Date() > new Date(session.expiresAt)) {
        session.status = 'expired';
        session.updatedAt = new Date().toISOString();
      }
    }

    return session;
  }

  // PAY-011: Step 2 - Connected
  connectSession(idOrToken: string): PaymentSession | null {
    const session = this.getSession(idOrToken);
    if (!session) return null;
    if (session.status === 'qr_created') {
      session.status = 'customer_connected';
      session.updatedAt = new Date().toISOString();
    }
    return session;
  }

  // PAY-011: Step 3 - Entering Payment Info
  startEntrySession(idOrToken: string): PaymentSession | null {
    const session = this.getSession(idOrToken);
    if (!session) return null;
    if (session.status === 'customer_connected' || session.status === 'qr_created') {
      session.status = 'entering_payment';
      session.updatedAt = new Date().toISOString();
    }
    return session;
  }

  // PAY-023: Cashier cancels mobile session
  cancelSession(sessionId: string, cashierName: string): PaymentSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    if (session.status === 'payment_complete') {
      throw new Error('Cannot cancel a payment that has already completed');
    }

    session.status = 'cancelled';
    session.updatedAt = new Date().toISOString();

    // Release lock
    this.sessionLocks.delete(sessionId);

    // Record audit
    this.recordAudit({
      orderNumber: session.orderNumber,
      paymentAttemptId: session.id,
      store: '377 Spirits #01 - Granbury',
      register: session.registerId,
      employeeId: session.cashierId,
      employeeName: cashierName,
      selectedMethod: session.method,
      amount: session.amount,
      result: 'cancelled',
      deviceSessionRef: 'POS Register Cancel Request',
      reasonForFallback: 'Cashier cancelled pending fallback session',
    });

    return session;
  }

  // PAY-012, PAY-013, PAY-015, PAY-019, PAY-020, PAY-021, PAY-024:
  // Authorize and complete payment session
  async authorizeSession(params: {
    sessionId: string;
    idempotencyKey: string;
    cardBrand?: string;
    cardLast4?: string;
    entryMode?: string;
    postalCode?: string;
    simulateFailure?: 'none' | 'card_declined' | 'expired_card' | 'terminal_offline';
  }): Promise<PaymentSession> {
    const session = this.sessions.get(params.sessionId);
    if (!session) {
      throw new Error('Payment session not found');
    }

    if (session.status === 'payment_complete') {
      // PAY-021: Idempotent return if already completed
      return session;
    }

    if (session.status === 'cancelled') {
      throw new Error('Payment session was cancelled by cashier');
    }

    if (session.status === 'expired') {
      throw new Error('Payment session has expired. Please ask cashier for a new QR code.');
    }

    // PAY-024: Simultaneous Attempt Protection
    const currentLock = this.sessionLocks.get(session.id);
    if (currentLock && Date.now() - currentLock.lockedAt < 30000) {
      throw new Error('Payment is currently being processed by another device');
    }

    // Acquire lock
    this.sessionLocks.set(session.id, {
      lockedAt: Date.now(),
      lockedBy: params.entryMode || 'device',
    });

    session.status = 'processing';
    session.updatedAt = new Date().toISOString();

    // Simulate network processing delay for realistic UX
    await new Promise(resolve => setTimeout(resolve, 800));

    // Check for simulated failures
    if (params.simulateFailure === 'card_declined') {
      // PAY-015: Declined cards MUST NOT be treated as reader failure
      session.status = 'failed';
      session.isDeclined = true;
      session.failureReason = 'Card Declined: Insufficient Funds (Decline Code 05)';
      session.failureCode = 'card_declined';
      session.updatedAt = new Date().toISOString();
      this.sessionLocks.delete(session.id);

      this.recordAudit({
        orderNumber: session.orderNumber,
        paymentAttemptId: session.id,
        store: '377 Spirits #01 - Granbury',
        register: session.registerId,
        employeeId: session.cashierId,
        employeeName: session.cashierName,
        selectedMethod: session.method,
        amount: session.amount,
        result: 'failed',
        deviceSessionRef: params.entryMode || 'Payment Processor',
        reasonForFallback: 'Card Declined by Issuer',
        failureCode: '05_DO_NOT_HONOR',
      });

      return session;
    }

    if (params.simulateFailure === 'expired_card') {
      session.status = 'failed';
      session.isDeclined = true;
      session.failureReason = 'Card Expired: Please use a valid card (Decline Code 54)';
      session.failureCode = 'card_expired';
      session.updatedAt = new Date().toISOString();
      this.sessionLocks.delete(session.id);

      this.recordAudit({
        orderNumber: session.orderNumber,
        paymentAttemptId: session.id,
        store: '377 Spirits #01 - Granbury',
        register: session.registerId,
        employeeId: session.cashierId,
        employeeName: session.cashierName,
        selectedMethod: session.method,
        amount: session.amount,
        result: 'failed',
        deviceSessionRef: params.entryMode || 'Payment Processor',
        reasonForFallback: 'Card Expired',
        failureCode: '54_EXPIRED_CARD',
      });

      return session;
    }

    if (params.simulateFailure === 'terminal_offline') {
      session.status = 'failed';
      session.isDeclined = false; // Hardware failure, NOT card decline
      session.failureReason = 'Reader Communication Error: Terminal Timeout';
      session.failureCode = 'reader_timeout';
      session.updatedAt = new Date().toISOString();
      this.sessionLocks.delete(session.id);

      return session;
    }

    // Success path (PAY-012, PAY-020: Tokenization - never raw PAN/CVV)
    const processorTxId = `ch_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const processorToken = `tok_${Math.random().toString(36).substring(2, 12)}`;
    const authCode = `APX-${Math.floor(100000 + Math.random() * 900000)}`;
    const brand = params.cardBrand || 'Visa';
    const last4 = params.cardLast4 || '4242';

    session.paymentResult = {
      transactionId: processorTxId,
      token: processorToken,
      brand,
      last4,
      authCode,
      capturedAt: new Date().toISOString(),
      entryMode: params.entryMode || session.method,
    };

    session.status = 'authorized';
    session.updatedAt = new Date().toISOString();

    // Transition to payment_complete
    session.status = 'payment_complete';

    // Release lock
    this.sessionLocks.delete(session.id);

    // Record audit (PAY-028)
    this.recordAudit({
      orderNumber: session.orderNumber,
      paymentAttemptId: session.id,
      store: '377 Spirits #01 - Granbury',
      register: session.registerId,
      employeeId: session.cashierId,
      employeeName: session.cashierName,
      selectedMethod: session.method,
      processorTxId,
      amount: session.amount,
      result: 'authorized',
      deviceSessionRef: `${session.mode === 'customer' ? 'Customer Web Pay' : 'Employee Tap to Pay'} (${brand} •••• ${last4})`,
      reasonForFallback: session.fallbackReason,
    });

    return session;
  }

  // PAY-028: Audit logger
  recordAudit(params: {
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
  }) {
    const log: PaymentAuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ...params,
      timestamp: new Date().toISOString(),
    };
    this.auditLogs.unshift(log);
    // Keep last 200 logs
    if (this.auditLogs.length > 200) {
      this.auditLogs.pop();
    }
    return log;
  }

  getAuditLogs(): PaymentAuditLog[] {
    return [...this.auditLogs];
  }
}

export const paymentFallbackService = new PaymentFallbackService();
