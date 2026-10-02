import {
  PaymentSession,
  PaymentAuditLog,
  CardFallbackMethod,
  PaymentSessionStatus,
} from '../src/types';

// In-memory payment session store with duplicate charge protection & locks
class PaymentFallbackService {
  private sessions: Map<string, PaymentSession> = new Map();

  private auditLogs: PaymentAuditLog[] = [];

  private sessionLocks: Map<
    string,
    {
      lockedAt: number;
      lockedBy: string;
    }
  > = new Map();

  // Terminal health state for PAY-014
  private terminalHealth: {
    status:
      | 'online'
      | 'offline'
      | 'chip_reader_error'
      | 'timeout';

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

  public updateConfig(
    newConfig: Partial<{
      fallbackEnabled: boolean;
      tapToPayPhoneEnabled: boolean;
      customerQrEnabled: boolean;
      customerSelfEntryAllowed: boolean;
      manualEntryAllowed: boolean;
      sessionExpiryMinutes: number;
    }>
  ) {
    this.config = {
      ...this.config,
      ...newConfig,
    };

    return this.config;
  }

  public getConfig() {
    return this.config;
  }

  constructor() {
    // Production starts with an empty payment audit trail.
    // Real audit entries are created only by actual payment activity.
  }

  // PAY-014: Get or set terminal health status
  getTerminalHealth() {
    return {
      ...this.terminalHealth,
      lastPing: new Date().toISOString(),
    };
  }

  setTerminalHealth(
    status:
      | 'online'
      | 'offline'
      | 'chip_reader_error'
      | 'timeout'
  ) {
    this.terminalHealth.status = status;

    return this.getTerminalHealth();
  }

  // PAY-004, PAY-006, PAY-009, PAY-010
  createSession(params: {
    orderNumber: string;
    amount: number;
    method: CardFallbackMethod | 'split';
    mode: 'customer' | 'employee';
    registerId: string;
    cashierId: string;
    cashierName: string;
    fallbackReason?: string;
    orderPayload?: any;
  }): PaymentSession {
    const registerId = String(
      params.registerId || ''
    ).trim();

    const cashierId = String(
      params.cashierId || ''
    ).trim();

    const cashierName = String(
      params.cashierName || ''
    ).trim();

    if (!registerId) {
      throw new Error(
        'Register identity is required to create a payment session'
      );
    }

    if (!cashierId || !cashierName) {
      throw new Error(
        'A signed-in operator is required to create a payment session'
      );
    }

    const sessionId =
      `pay_sess_${Date.now()}_` +
      Math.random()
        .toString(36)
        .substring(2, 9);

    const opaqueToken =
      `tok_` +
      Math.random()
        .toString(36)
        .substring(2, 15) +
      `_` +
      Math.random()
        .toString(36)
        .substring(2, 15);

    const idempotencyKey =
      `idemp_${Date.now()}_` +
      Math.random()
        .toString(36)
        .substring(2, 9);

    const expiryMinutes = Math.max(
      1,
      Number(
        this.config.sessionExpiryMinutes
      ) || 10
    );

    const expiresAt =
      new Date(
        Date.now() +
          expiryMinutes * 60 * 1000
      ).toISOString();

    // Fixed amount
    const fixedAmount =
      Math.round(
        Number(params.amount) * 100
      ) / 100;

    if (
      !Number.isFinite(fixedAmount) ||
      fixedAmount <= 0
    ) {
      throw new Error(
        'Payment session amount must be greater than zero'
      );
    }

    const session: PaymentSession = {
      id: sessionId,

      orderNumber:
        params.orderNumber ||
        `ORD-${Math.floor(
          10000 +
            Math.random() * 90000
        )}`,

      amount: fixedAmount,
      currency: 'USD',
      method: params.method,
      mode: params.mode,
      status: 'qr_created',

      idempotencyKey,
      opaqueToken,
      expiresAt,

      createdAt:
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString(),

      registerId,
      cashierId,
      cashierName,

      fallbackReason:
        params.fallbackReason ||
        'Cashier initiated card fallback',

      orderPayload:
        params.orderPayload,
    };

    this.sessions.set(
      sessionId,
      session
    );

    // PAY-028 audit
    this.recordAudit({
      orderNumber:
        session.orderNumber,

      paymentAttemptId:
        session.id,

      store:
        '377 Spirits #01 - Granbury',

      register:
        session.registerId,

      employeeId:
        session.cashierId,

      employeeName:
        session.cashierName,

      selectedMethod:
        session.method,

      amount:
        session.amount,

      result:
        'authorized',

      deviceSessionRef:
        session.mode === 'customer'
          ? 'Customer Phone Browser'
          : 'Store Mobile Terminal (Tap to Pay)',

      reasonForFallback:
        session.fallbackReason,
    });

    return session;
  }

  // Lookup session by ID or opaqueToken
  getSession(
    idOrToken: string
  ): PaymentSession | null {
    let session =
      this.sessions.get(idOrToken);

    if (!session) {
      for (
        const s
        of this.sessions.values()
      ) {
        if (
          s.opaqueToken ===
          idOrToken
        ) {
          session = s;
          break;
        }
      }
    }

    if (!session) {
      return null;
    }

    // PAY-022 expiry
    if (
      session.status !==
        'payment_complete' &&
      session.status !==
        'failed' &&
      session.status !==
        'cancelled'
    ) {
      if (
        new Date() >
        new Date(
          session.expiresAt
        )
      ) {
        session.status =
          'expired';

        session.updatedAt =
          new Date().toISOString();
      }
    }

    return session;
  }

  // PAY-011 Step 2
  connectSession(
    idOrToken: string
  ): PaymentSession | null {
    const session =
      this.getSession(
        idOrToken
      );

    if (!session) {
      return null;
    }

    if (
      session.status ===
      'qr_created'
    ) {
      session.status =
        'customer_connected';

      session.updatedAt =
        new Date().toISOString();
    }

    return session;
  }

  // PAY-011 Step 3
  startEntrySession(
    idOrToken: string
  ): PaymentSession | null {
    const session =
      this.getSession(
        idOrToken
      );

    if (!session) {
      return null;
    }

    if (
      session.status ===
        'customer_connected' ||
      session.status ===
        'qr_created'
    ) {
      session.status =
        'entering_payment';

      session.updatedAt =
        new Date().toISOString();
    }

    return session;
  }

  // PAY-023
  cancelSession(
    sessionId: string,
    cashierName: string
  ): PaymentSession | null {
    const session =
      this.sessions.get(
        sessionId
      );

    if (!session) {
      return null;
    }

    if (
      session.status ===
      'payment_complete'
    ) {
      throw new Error(
        'Cannot cancel a payment that has already completed'
      );
    }

    session.status =
      'cancelled';

    session.updatedAt =
      new Date().toISOString();

    this.sessionLocks.delete(
      sessionId
    );

    this.recordAudit({
      orderNumber:
        session.orderNumber,

      paymentAttemptId:
        session.id,

      store:
        '377 Spirits #01 - Granbury',

      register:
        session.registerId,

      employeeId:
        session.cashierId,

      employeeName:
        cashierName,

      selectedMethod:
        session.method,

      amount:
        session.amount,

      result:
        'cancelled',

      deviceSessionRef:
        'POS Register Cancel Request',

      reasonForFallback:
        'Cashier cancelled pending fallback session',
    });

    return session;
  }

  // PAY-012, PAY-013, PAY-015, PAY-019,
  // PAY-020, PAY-021, PAY-024
  async authorizeSession(
    params: {
      sessionId: string;
      idempotencyKey: string;
      cardBrand?: string;
      cardLast4?: string;
      entryMode?: string;
      postalCode?: string;

      simulateFailure?:
        | 'none'
        | 'card_declined'
        | 'expired_card'
        | 'terminal_offline';
    }
  ): Promise<PaymentSession> {
    const session =
      this.sessions.get(
        params.sessionId
      );

    if (!session) {
      throw new Error(
        'Payment session not found'
      );
    }

    if (
      session.status ===
      'payment_complete'
    ) {
      return session;
    }

    if (
      session.status ===
      'cancelled'
    ) {
      throw new Error(
        'Payment session was cancelled by cashier'
      );
    }

    if (
      session.status ===
      'expired'
    ) {
      throw new Error(
        'Payment session has expired. Please ask cashier for a new QR code.'
      );
    }

    const currentLock =
      this.sessionLocks.get(
        session.id
      );

    if (
      currentLock &&
      Date.now() -
        currentLock.lockedAt <
        30000
    ) {
      throw new Error(
        'Payment is currently being processed by another device'
      );
    }

    this.sessionLocks.set(
      session.id,
      {
        lockedAt:
          Date.now(),

        lockedBy:
          params.entryMode ||
          'device',
      }
    );

    session.status =
      'processing';

    session.updatedAt =
      new Date().toISOString();

    await new Promise(
      resolve =>
        setTimeout(
          resolve,
          800
        )
    );

    if (
      params.simulateFailure ===
      'card_declined'
    ) {
      session.status =
        'failed';

      session.isDeclined =
        true;

      session.failureReason =
        'Card Declined: Insufficient Funds (Decline Code 05)';

      session.failureCode =
        'card_declined';

      session.updatedAt =
        new Date().toISOString();

      this.sessionLocks.delete(
        session.id
      );

      this.recordAudit({
        orderNumber:
          session.orderNumber,

        paymentAttemptId:
          session.id,

        store:
          '377 Spirits #01 - Granbury',

        register:
          session.registerId,

        employeeId:
          session.cashierId,

        employeeName:
          session.cashierName,

        selectedMethod:
          session.method,

        amount:
          session.amount,

        result:
          'failed',

        deviceSessionRef:
          params.entryMode ||
          'Payment Processor',

        reasonForFallback:
          'Card Declined by Issuer',

        failureCode:
          '05_DO_NOT_HONOR',
      });

      return session;
    }

    if (
      params.simulateFailure ===
      'expired_card'
    ) {
      session.status =
        'failed';

      session.isDeclined =
        true;

      session.failureReason =
        'Card Expired: Please use a valid card (Decline Code 54)';

      session.failureCode =
        'card_expired';

      session.updatedAt =
        new Date().toISOString();

      this.sessionLocks.delete(
        session.id
      );

      this.recordAudit({
        orderNumber:
          session.orderNumber,

        paymentAttemptId:
          session.id,

        store:
          '377 Spirits #01 - Granbury',

        register:
          session.registerId,

        employeeId:
          session.cashierId,

        employeeName:
          session.cashierName,

        selectedMethod:
          session.method,

        amount:
          session.amount,

        result:
          'failed',

        deviceSessionRef:
          params.entryMode ||
          'Payment Processor',

        reasonForFallback:
          'Card Expired',

        failureCode:
          '54_EXPIRED_CARD',
      });

      return session;
    }

    if (
      params.simulateFailure ===
      'terminal_offline'
    ) {
      session.status =
        'failed';

      session.isDeclined =
        false;

      session.failureReason =
        'Reader Communication Error: Terminal Timeout';

      session.failureCode =
        'reader_timeout';

      session.updatedAt =
        new Date().toISOString();

      this.sessionLocks.delete(
        session.id
      );

      return session;
    }

    // Success
    const processorTxId =
      `ch_${Date.now()}_` +
      Math.random()
        .toString(36)
        .substring(2, 10);

    const processorToken =
      `tok_` +
      Math.random()
        .toString(36)
        .substring(2, 12);

    const authCode =
      `APX-${Math.floor(
        100000 +
          Math.random() * 900000
      )}`;

    const brand =
      params.cardBrand ||
      'Visa';

    const last4 =
      params.cardLast4 ||
      '4242';

    session.paymentResult = {
      transactionId:
        processorTxId,

      token:
        processorToken,

      brand,
      last4,
      authCode,

      capturedAt:
        new Date().toISOString(),

      entryMode:
        params.entryMode ||
        session.method,
    };

    session.status =
      'authorized';

    session.updatedAt =
      new Date().toISOString();

    session.status =
      'payment_complete';

    this.sessionLocks.delete(
      session.id
    );

    this.recordAudit({
      orderNumber:
        session.orderNumber,

      paymentAttemptId:
        session.id,

      store:
        '377 Spirits #01 - Granbury',

      register:
        session.registerId,

      employeeId:
        session.cashierId,

      employeeName:
        session.cashierName,

      selectedMethod:
        session.method,

      processorTxId,

      amount:
        session.amount,

      result:
        'authorized',

      deviceSessionRef:
        `${
          session.mode ===
          'customer'
            ? 'Customer Web Pay'
            : 'Employee Tap to Pay'
        } (${brand} •••• ${last4})`,

      reasonForFallback:
        session.fallbackReason,
    });

    return session;
  }

  // PAY-028 audit logger
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

    result:
      | 'authorized'
      | 'failed'
      | 'cancelled'
      | 'expired';

    deviceSessionRef: string;
    reasonForFallback?: string;
    failureCode?: string;
  }) {
    const log: PaymentAuditLog = {
      id:
        `aud-${Date.now()}-` +
        Math.random()
          .toString(36)
          .substring(2, 6),

      ...params,

      timestamp:
        new Date().toISOString(),
    };

    this.auditLogs.unshift(
      log
    );

    if (
      this.auditLogs.length >
      200
    ) {
      this.auditLogs.pop();
    }

    return log;
  }

  getAuditLogs(): PaymentAuditLog[] {
    return [
      ...this.auditLogs,
    ];
  }
}

export const paymentFallbackService =
  new PaymentFallbackService();
