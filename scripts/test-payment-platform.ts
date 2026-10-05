import fs from 'fs';
import os from 'os';
import path from 'path';
import assert from 'node:assert/strict';

async function main() {
  const testRoot = path.join(os.tmpdir(), `kabira-payment-e2e-${process.pid}`);
  fs.rmSync(testRoot, { recursive: true, force: true });
  fs.mkdirSync(testRoot, { recursive: true });
  process.env.LOCALAPPDATA = testRoot;

  // Dynamic import is intentional: PaymentRepository reads LOCALAPPDATA at module load.
  const { paymentService } = await import('../server/payment/PaymentService.js');

  const storeId = 'test-store';
  const registerId = 'test-register';

  const config = paymentService.saveConfig({
    storeId,
    registerId,
    provider: 'mock',
    processor: 'KaBiRa Sandbox',
    terminalModel: 'KaBiRa Test Terminal',
    terminalId: 'MOCK-E2E-01',
    connectionType: 'cloud',
    environment: 'sandbox',
    isEnabled: true,
    autoConnect: true,
    allowRefund: true,
    allowVoid: true,
    allowManualEntry: false,
  });

  assert.equal(config.provider, 'mock');
  assert.equal(config.environment, 'sandbox');

  const status = await paymentService.connect(storeId, registerId);
  assert.equal(status.connected, true);
  assert.equal(status.provider, 'mock');

  const approved = await paymentService.sale({
    storeId,
    registerId,
    orderId: 'ORDER-APPROVED',
    amount: 42.75,
    testOutcome: 'approved',
  });

  assert.equal(approved.status, 'approved');
  assert.equal(approved.success, true);
  assert.equal(approved.amount, 42.75);
  assert.equal(approved.cardBrand, 'Visa');
  assert.equal(approved.last4, '4242');
  assert.ok(approved.providerTransactionId);

  const declined = await paymentService.sale({
    storeId,
    registerId,
    orderId: 'ORDER-DECLINED',
    amount: 10,
    testOutcome: 'declined',
  });

  assert.equal(declined.status, 'declined');
  assert.equal(declined.success, false);
  assert.equal(declined.responseCode, '51');

  const timeout = await paymentService.sale({
    storeId,
    registerId,
    orderId: 'ORDER-TIMEOUT',
    amount: 5,
    testOutcome: 'timeout',
  });

  assert.equal(timeout.status, 'timeout');
  assert.equal(timeout.success, false);

  const cancelled = await paymentService.sale({
    storeId,
    registerId,
    orderId: 'ORDER-CANCELLED',
    amount: 7.5,
    testOutcome: 'cancelled',
  });

  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.success, false);

  const refund = await paymentService.refund({
    storeId,
    registerId,
    orderId: 'ORDER-APPROVED',
    providerTransactionId: approved.providerTransactionId!,
    amount: 12.75,
  });

  assert.equal(refund.status, 'refunded');
  assert.equal(refund.success, true);
  assert.equal(refund.amount, 12.75);

  const voidResult = await paymentService.void({
    storeId,
    registerId,
    orderId: 'ORDER-APPROVED',
    providerTransactionId: approved.providerTransactionId!,
  });

  assert.equal(voidResult.status, 'voided');
  assert.equal(voidResult.success, true);

  await paymentService.cancel(storeId, registerId, approved.providerTransactionId);

  const transactions = paymentService.listTransactions(storeId, registerId);
  assert.equal(transactions.length, 6);
  assert.ok(transactions.some(tx => tx.status === 'approved'));
  assert.ok(transactions.some(tx => tx.status === 'declined'));
  assert.ok(transactions.some(tx => tx.status === 'timeout'));
  assert.ok(transactions.some(tx => tx.status === 'cancelled'));
  assert.ok(transactions.some(tx => tx.status === 'refunded'));
  assert.ok(transactions.some(tx => tx.status === 'voided'));


  // PAX sandbox adapter uses the same universal contract while production stays
  // blocked until a certified processor connector is installed.
  paymentService.saveConfig({
    storeId,
    registerId,
    provider: 'pax',
    processor: 'PAX Sandbox',
    terminalModel: 'A920 Simulator',
    terminalId: 'PAX-SIM-01',
    integrationMode: 'semi_integrated_lan',
    connectionType: 'lan',
    ipAddress: '127.0.0.1',
    port: 10009,
    environment: 'sandbox',
    isEnabled: true,
    autoConnect: true,
    allowRefund: true,
    allowVoid: true,
    allowManualEntry: false,
  });

  const paxStatus = await paymentService.connect(storeId, registerId);
  assert.equal(paxStatus.provider, 'pax');
  assert.equal(paxStatus.connected, true);

  const paxApproved = await paymentService.sale({
    storeId,
    registerId,
    orderId: 'ORDER-PAX-SANDBOX',
    amount: 19.99,
    testOutcome: 'approved',
  });

  assert.equal(paxApproved.provider, 'pax');
  assert.equal(paxApproved.status, 'approved');
  assert.equal(paxApproved.last4, '4242');

  const storeFile = path.join(testRoot, 'KaBiRa POS', 'data', 'payment_store.json');
  assert.equal(fs.existsSync(storeFile), true);

  console.log('KaBiRa universal payment E2E test passed.');
  console.log('Approved sale, decline, timeout, cancel, refund, void, persistence, and PAX sandbox adapter verified.');

  fs.rmSync(testRoot, { recursive: true, force: true });
}

main().catch(error => {
  console.error('KaBiRa universal payment E2E test failed.');
  console.error(error);
  process.exit(1);
});
