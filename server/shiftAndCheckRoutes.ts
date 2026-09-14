import { Router, Request, Response } from 'express';
import { db } from './db.js';
import {
  Shift,
  ShiftDenominationCount,
  IssuedCheck,
  CheckCashingTransaction,
  CheckQrSession,
  DepositBatch,
  User,
} from '../src/types.js';
import { calculateShiftSummary, calculateDenominationTotal } from './shiftService.js';
import {
  amountToWrittenWords,
  calculateCheckCashingFee,
  checkForDuplicateCheck,
  evaluateCheckRisk,
} from './checkService.js';

export const shiftAndCheckRouter = Router();

function getAuthUser(req: Request): User {
  const userId = (req.headers['x-user-id'] as string) || 'usr-1';
  const user = db.users.find(u => u.id === userId && u.active);
  return user || db.users[0];
}

// ============================================================================
// SR-01 to SR-25: SHIFT MANAGEMENT ENDPOINTS
// ============================================================================
// REGISTERS & TERMINALS (SR-01)
// ============================================================================
shiftAndCheckRouter.get('/registers', (req: Request, res: Response) => {
  const registers = [
    {
      id: 'reg-1',
      name: 'Terminal #01 (Front Register)',
      location: 'Main Checkout Counter',
      status: 'active',
      currentCashier: 'Elena Rostova',
      activeShiftId: db.shifts.find(s => s.status === 'open' && s.registerId === 'reg-1')?.id || null,
    },
    {
      id: 'reg-2',
      name: 'Terminal #02 (Express / Drive-Thru)',
      location: 'Secondary Express Counter',
      status: 'active',
      currentCashier: null,
      activeShiftId: db.shifts.find(s => s.status === 'open' && s.registerId === 'reg-2')?.id || null,
    },
  ];
  res.json({ registers });
});

// GET /api/shifts/current - Get active open shift with real-time calculated summary
shiftAndCheckRouter.get('/shifts/current', (req: Request, res: Response) => {
  const registerId = (req.query.registerId as string) || 'reg-1';
  const cashierId = req.query.cashierId as string;

  // Look for open shift
  let openShift = db.shifts.find(s => s.status === 'open' && (registerId ? s.registerId === registerId : true));
  if (!openShift && cashierId) {
    openShift = db.shifts.find(s => s.status === 'open' && s.cashierId === cashierId);
  }

  if (!openShift) {
    // Check if there is any open shift at all
    openShift = db.shifts.find(s => s.status === 'open');
  }

  if (!openShift) {
    // Return last closed shift as context for starting a new shift
    const lastClosed = db.shifts.find(s => s.status === 'closed');
    return res.json({
      hasActiveShift: false,
      lastClosedShift: lastClosed || null,
      suggestedStartingCash: lastClosed?.reconciliation?.actualCash || 200.00,
    });
  }

  // Calculate live summary
  const summary = calculateShiftSummary(openShift);
  const durationMinutes = Math.max(0, Math.floor((Date.now() - new Date(openShift.startTime).getTime()) / 60000));

  res.json({
    hasActiveShift: true,
    shift: openShift,
    summary,
    durationMinutes,
  });
});

// POST /api/shifts/start - Start new shift (SR-01)
shiftAndCheckRouter.post('/shifts/start', (req: Request, res: Response) => {
  const { cashierId, registerId, registerName, startingCash, pin, inheritFromPrevious, notes } = req.body;

  const cashier = db.users.find(u => u.id === cashierId && u.active);
  if (!cashier) {
    return res.status(404).json({ error: 'Cashier not found or inactive' });
  }

  // Validate PIN (SR-01)
  if (!cashier.pin || cashier.pin !== pin) {
    return res.status(401).json({ error: 'Invalid cashier PIN' });
  }

  // Check duplicate open shifts for cashier or register (SR-01)
  const existingCashierShift = db.shifts.find(s => s.status === 'open' && s.cashierId === cashierId);
  if (existingCashierShift) {
    return res.status(400).json({
      error: `Cashier ${cashier.name} already has an active open shift (${existingCashierShift.shiftNumber}). Please close the existing shift first.`,
    });
  }

  const existingRegisterShift = db.shifts.find(s => s.status === 'open' && s.registerId === registerId);
  if (existingRegisterShift) {
    return res.status(400).json({
      error: `Register ${registerName || registerId} already has an active open shift (${existingRegisterShift.shiftNumber}).`,
    });
  }

  const shiftCount = db.shifts.length + 1;
  const shiftNumber = `SH-${(1000 + shiftCount).toString()}`;
  const now = new Date().toISOString();

  const newShift: Shift = {
    id: `sh-${Date.now()}`,
    shiftNumber,
    storeId: 'str-1',
    registerId: registerId || 'reg-1',
    registerName: registerName || 'Terminal #01 (Front Register)',
    cashierId: cashier.id,
    cashierName: cashier.name,
    status: 'open',
    startTime: now,
    startingCash: parseFloat(startingCash) || 200.00,
    startingCashInherited: !!inheritFromPrevious,
    currentSales: 0,
    transactionCount: 0,
    cashMovements: [],
    notes: notes || undefined,
    createdAt: now,
    updatedAt: now,
  };

  db.shifts.unshift(newShift);

  db.addAudit(
    cashier.id,
    cashier.name,
    cashier.role,
    'SHIFT_START',
    'security',
    newShift.id,
    `Started shift ${shiftNumber} on ${newShift.registerName} with starting cash $${newShift.startingCash.toFixed(2)}`
  );

  const summary = calculateShiftSummary(newShift);

  res.status(201).json({
    success: true,
    shift: newShift,
    summary,
  });
});

// GET /api/shifts - List all shifts with filters (SR-20)
shiftAndCheckRouter.get('/shifts', (req: Request, res: Response) => {
  const { status, cashierId, registerId, date } = req.query;

  let list = [...db.shifts];

  if (status && typeof status === 'string') {
    list = list.filter(s => s.status === status);
  }
  if (cashierId && typeof cashierId === 'string') {
    list = list.filter(s => s.cashierId === cashierId);
  }
  if (registerId && typeof registerId === 'string') {
    list = list.filter(s => s.registerId === registerId);
  }
  if (date && typeof date === 'string') {
    list = list.filter(s => s.startTime.startsWith(date));
  }

  res.json({
    shifts: list.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()),
  });
});

// GET /api/shifts/:id - Get shift details & summary
shiftAndCheckRouter.get('/shifts/:id', (req: Request, res: Response) => {
  const shift = db.shifts.find(s => s.id === req.params.id);
  if (!shift) {
    return res.status(404).json({ error: 'Shift not found' });
  }

  const summary = shift.status === 'closed' && shift.summary ? shift.summary : calculateShiftSummary(shift);

  res.json({
    shift,
    summary,
  });
});

// POST /api/shifts/:id/cash-movement - Record Paid In / Payout (SR-09)
shiftAndCheckRouter.post('/shifts/:id/cash-movement', (req: Request, res: Response) => {
  const shift = db.shifts.find(s => s.id === req.params.id);
  if (!shift) return res.status(404).json({ error: 'Shift not found' });
  if (shift.status !== 'open') return res.status(400).json({ error: 'Cannot add cash movement to a closed shift' });

  const currentUser = getAuthUser(req);
  const { type, amount, reason } = req.body;

  if (!type || !['paid_in', 'payout'].includes(type)) {
    return res.status(400).json({ error: 'Invalid cash movement type. Must be paid_in or payout.' });
  }
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than zero.' });
  }
  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'Reason is required for cash movement.' });
  }

  const movement = {
    id: `mov-${Date.now()}`,
    shiftId: shift.id,
    type: type as 'paid_in' | 'payout',
    amount: numAmount,
    reason: reason.trim(),
    userId: currentUser.id,
    userName: currentUser.name,
    timestamp: new Date().toISOString(),
  };

  if (!shift.cashMovements) shift.cashMovements = [];
  shift.cashMovements.push(movement);
  shift.updatedAt = new Date().toISOString();

  db.addAudit(
    currentUser.id,
    currentUser.name,
    currentUser.role,
    type === 'paid_in' ? 'SHIFT_PAID_IN' : 'SHIFT_PAYOUT',
    'system',
    shift.id,
    `${type === 'paid_in' ? 'Paid In' : 'Payout'} of $${numAmount.toFixed(2)} recorded on ${shift.shiftNumber}. Reason: ${reason}`
  );

  const summary = calculateShiftSummary(shift);

  res.json({
    success: true,
    movement,
    shift,
    summary,
  });
});

// POST /api/shifts/:id/reconcile - Calculate cash reconciliation preview (SR-10, SR-11, SR-12)
shiftAndCheckRouter.post('/shifts/:id/reconcile', (req: Request, res: Response) => {
  const shift = db.shifts.find(s => s.id === req.params.id);
  if (!shift) return res.status(404).json({ error: 'Shift not found' });

  const { denominations, toleranceAmount = 5.0, reconciliationNote, managerPin } = req.body;
  const summary = calculateShiftSummary(shift);
  const actualCash = calculateDenominationTotal(denominations);
  const expectedCash = summary.expectedCash;
  const variance = Math.round((actualCash - expectedCash) * 100) / 100;

  const status: 'balanced' | 'over' | 'short' = variance === 0 ? 'balanced' : variance > 0 ? 'over' : 'short';
  const isVarianceMaterial = Math.abs(variance) > toleranceAmount;

  let managerApproved = false;
  let managerApprovedBy: string | undefined;

  if (isVarianceMaterial && managerPin) {
    const manager = db.users.find(u => (u.role === 'Manager' || u.role === 'Admin') && u.pin === managerPin && u.active);
    if (manager) {
      managerApproved = true;
      managerApprovedBy = manager.name;
    }
  }

  res.json({
    actualCash,
    expectedCash,
    variance,
    status,
    isVarianceMaterial,
    toleranceAmount,
    managerApproved,
    managerApprovedBy,
    denominations,
    reconciliationNote,
  });
});

// POST /api/shifts/:id/close - End shift atomically with final immutable snapshot (SR-02, SR-13, SR-14, SR-15, SR-24, SR-25)
shiftAndCheckRouter.post('/shifts/:id/close', (req: Request, res: Response) => {
  const shift = db.shifts.find(s => s.id === req.params.id);
  if (!shift) return res.status(404).json({ error: 'Shift not found' });
  if (shift.status === 'closed') {
    return res.json({ success: true, message: 'Shift is already closed (idempotent)', shift });
  }

  const currentUser = getAuthUser(req);
  const { denominations, toleranceAmount = 5.0, reconciliationNote, managerPin, managerApprovalReason, notes } = req.body;

  const summary = calculateShiftSummary(shift);
  const actualCash = calculateDenominationTotal(denominations);
  const expectedCash = summary.expectedCash;
  const variance = Math.round((actualCash - expectedCash) * 100) / 100;
  const isVarianceMaterial = Math.abs(variance) > toleranceAmount;

  let managerApproved = false;
  let managerApprovedBy: string | undefined;

  if (isVarianceMaterial) {
    if (!managerPin) {
      return res.status(400).json({
        error: `Variance ($${variance.toFixed(2)}) exceeds tolerance limit ($${toleranceAmount.toFixed(2)}). Manager PIN approval is required.`,
        requiresManagerPin: true,
        variance,
      });
    }
    const manager = db.users.find(u => (u.role === 'Manager' || u.role === 'Admin') && u.pin === managerPin && u.active);
    if (!manager) {
      return res.status(401).json({ error: 'Invalid manager PIN for variance approval.' });
    }
    managerApproved = true;
    managerApprovedBy = manager.name;
  }

  const now = new Date().toISOString();
  shift.status = 'closed';
  shift.endTime = now;
  shift.closedByUserId = currentUser.id;
  shift.closedByUserName = currentUser.name;
  shift.notes = notes || shift.notes;

  // Add final actualCash and variance to summary
  summary.actualCash = actualCash;
  summary.variance = variance;

  shift.reconciliation = {
    actualCash,
    expectedCash,
    variance,
    status: variance === 0 ? 'balanced' : variance > 0 ? 'over' : 'short',
    isVarianceMaterial,
    toleranceAmount,
    denominations,
    reconciliationNote,
    managerApproved,
    managerApprovedBy,
    managerApprovalReason,
    managerApprovalTime: managerApproved ? now : undefined,
  };

  shift.summary = summary;
  shift.currentSales = summary.grossSales;
  shift.transactionCount = summary.totalTransactions;
  shift.updatedAt = now;

  // Find previous closed shift on this register to calculate delta comparison (SR-16)
  const previousShift = db.shifts.find(s => s.id !== shift.id && s.registerId === shift.registerId && s.status === 'closed');
  if (previousShift && previousShift.summary) {
    const prevNet = previousShift.summary.netSales || 1;
    const prevTx = previousShift.summary.totalTransactions || 1;
    shift.previousShiftComparison = {
      netSalesChangePercent: Math.round(((summary.netSales - prevNet) / prevNet) * 1000) / 10,
      transactionsChangePercent: Math.round(((summary.totalTransactions - prevTx) / prevTx) * 1000) / 10,
    };
  }

  db.addAudit(
    currentUser.id,
    currentUser.name,
    currentUser.role,
    'SHIFT_CLOSE',
    'security',
    shift.id,
    `Closed shift ${shift.shiftNumber}. Actual cash: $${actualCash.toFixed(2)}, Expected cash: $${expectedCash.toFixed(2)}, Variance: $${variance.toFixed(2)} (${isVarianceMaterial ? 'Material variance approved by ' + managerApprovedBy : 'Within tolerance'})`
  );

  res.json({
    success: true,
    shift,
    summary,
  });
});

// POST /api/shifts/:id/override - Manager override (SR-22)
shiftAndCheckRouter.post('/shifts/:id/override', (req: Request, res: Response) => {
  const shift = db.shifts.find(s => s.id === req.params.id);
  if (!shift) return res.status(404).json({ error: 'Shift not found' });

  const { managerPin, reason, action } = req.body;
  const manager = db.users.find(u => (u.role === 'Manager' || u.role === 'Admin') && u.pin === managerPin && u.active);
  if (!manager) return res.status(401).json({ error: 'Invalid manager PIN' });

  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'Override reason is required' });
  }

  db.addAudit(
    manager.id,
    manager.name,
    manager.role,
    'SHIFT_OVERRIDE',
    'security',
    shift.id,
    `Manager ${manager.name} performed override [${action || 'FORCE_CLOSE'}] on ${shift.shiftNumber}. Reason: ${reason}`
  );

  res.json({
    success: true,
    message: `Manager override logged successfully by ${manager.name}`,
  });
});

// POST /api/shifts/:id/email - Email shift report (SR-18)
shiftAndCheckRouter.post('/shifts/:id/email', (req: Request, res: Response) => {
  const shift = db.shifts.find(s => s.id === req.params.id);
  if (!shift) return res.status(404).json({ error: 'Shift not found' });

  const currentUser = getAuthUser(req);
  const { recipientEmail } = req.body;

  if (!recipientEmail || !recipientEmail.includes('@')) {
    return res.status(400).json({ error: 'Valid recipient email required' });
  }

  db.addAudit(
    currentUser.id,
    currentUser.name,
    currentUser.role,
    'SHIFT_EMAIL_REPORT',
    'system',
    shift.id,
    `Emailed shift report ${shift.shiftNumber} to ${recipientEmail}`
  );

  res.json({
    success: true,
    message: `Shift report for ${shift.shiftNumber} sent to ${recipientEmail}`,
  });
});

// ============================================================================
// CK-01 to CK-34: CHECK MANAGEMENT & ISSUANCE ENDPOINTS
// ============================================================================

// GET /api/checks/bank-accounts - List active bank accounts (CK-13)
shiftAndCheckRouter.get('/checks/bank-accounts', (req: Request, res: Response) => {
  res.json({
    bankAccounts: db.bankAccounts.filter(b => b.active),
  });
});

// GET /api/checks/issued - List issued checks with filtering (CK-01, CK-02, CK-32)
shiftAndCheckRouter.get('/checks/issued', (req: Request, res: Response) => {
  const { payeeType, status, search, bankAccountId } = req.query;

  let checks = [...db.issuedChecks];

  if (payeeType && typeof payeeType === 'string' && payeeType !== 'all') {
    checks = checks.filter(c => c.payeeType === payeeType);
  }
  if (status && typeof status === 'string' && status !== 'all') {
    checks = checks.filter(c => c.status === status);
  }
  if (bankAccountId && typeof bankAccountId === 'string') {
    checks = checks.filter(c => c.bankAccountId === bankAccountId);
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    checks = checks.filter(c =>
      c.checkNumber.toLowerCase().includes(q) ||
      c.payeeName.toLowerCase().includes(q) ||
      c.memo.toLowerCase().includes(q)
    );
  }

  res.json({
    checks: checks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  });
});

// GET /api/checks/issued/:id
shiftAndCheckRouter.get('/checks/issued/:id', (req: Request, res: Response) => {
  const check = db.issuedChecks.find(c => c.id === req.params.id);
  if (!check) return res.status(404).json({ error: 'Issued check not found' });
  res.json({ check });
});

// POST /api/checks/issued - Create new check (CK-03 to CK-15)
shiftAndCheckRouter.post('/checks/issued', (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  const {
    payeeType,
    payeeId,
    payeeName,
    payeeAddress,
    payeeEmail,
    payeePhone,
    amount,
    date,
    bankAccountId,
    memo,
    paymentCategory,
    allocations = [],
    templateLayout = 'check_top',
    overrideCheckNumber,
  } = req.body;

  const effectivePayeeType = payeeType || 'vendor';
  const effectiveCategory = paymentCategory || (req.body as any).category || 'Vendor Invoice';

  if (!payeeName || !amount || !bankAccountId) {
    return res.status(400).json({ error: 'Missing required check details (payeeName, amount, bankAccountId)' });
  }

  const bankAccount = db.bankAccounts.find(b => b.id === bankAccountId);
  if (!bankAccount) return res.status(404).json({ error: 'Selected bank account not found' });

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Check amount must be positive' });
  }

  let checkNum = overrideCheckNumber ? overrideCheckNumber.toString() : bankAccount.nextCheckNumber.toString();
  if (!overrideCheckNumber) {
    bankAccount.nextCheckNumber += 1;
  }

  // Written amount in words
  const writtenAmount = amountToWrittenWords(numAmount);

  // Determine approval requirement based on tiered thresholds (CK-19)
  let approvalRequiredRole: 'Admin' | 'Manager' | 'Owner' = 'Admin';
  let initialStatus: 'draft' | 'pending_approval' | 'approved' = 'pending_approval';

  if (numAmount <= 500) {
    approvalRequiredRole = 'Admin';
    if (currentUser.role === 'Admin' || currentUser.role === 'Manager') {
      initialStatus = 'approved';
    }
  } else if (numAmount <= 2500) {
    approvalRequiredRole = 'Manager';
    if (currentUser.role === 'Manager' || currentUser.role === 'Admin') {
      // Segregation of duties: if currentUser created it, manager approval required from someone else
      initialStatus = 'pending_approval';
    }
  } else {
    approvalRequiredRole = 'Owner';
    initialStatus = 'pending_approval';
  }

  const now = new Date().toISOString();
  const newCheck: IssuedCheck = {
    id: `chk-${Date.now()}`,
    checkNumber: checkNum,
    payeeType: effectivePayeeType,
    payeeId: payeeId || `payee-${Date.now()}`,
    payeeName,
    payeeAddress: payeeAddress || 'Granbury, TX',
    payeeEmail,
    payeePhone,
    amount: numAmount,
    writtenAmount,
    date: date || now.slice(0, 10),
    bankAccountId: bankAccount.id,
    bankAccountName: bankAccount.accountName,
    bankAccountNumberMasked: bankAccount.accountNumberMasked,
    routingNumber: bankAccount.routingNumber,
    memo: memo || `${effectiveCategory} check`,
    paymentCategory: effectiveCategory,
    allocations: allocations.length > 0 ? allocations : [
      {
        id: `alloc-${Date.now()}`,
        description: memo || 'Payment disbursement',
        amountPaid: numAmount,
      },
    ],
    status: initialStatus,
    approvalRequiredRole,
    createdByUserId: currentUser.id,
    createdByUserName: currentUser.name,
    approvedByUserId: initialStatus === 'approved' ? currentUser.id : undefined,
    approvedByUserName: initialStatus === 'approved' ? currentUser.name : undefined,
    approvedAt: initialStatus === 'approved' ? now : undefined,
    printCount: 0,
    templateLayout,
    createdAt: now,
    updatedAt: now,
  };

  db.issuedChecks.unshift(newCheck);

  db.addAudit(
    currentUser.id,
    currentUser.name,
    currentUser.role,
    'CHECK_ISSUED_CREATE',
    'system',
    newCheck.id,
    `Created check #${checkNum} for $${numAmount.toFixed(2)} payable to ${payeeName} (${newCheck.paymentCategory}). Status: ${newCheck.status}`
  );

  res.status(201).json({
    success: true,
    check: newCheck,
  });
});

// POST /api/checks/issued/:id/approve - Approve check (CK-21)
shiftAndCheckRouter.post('/checks/issued/:id/approve', (req: Request, res: Response) => {
  const check = db.issuedChecks.find(c => c.id === req.params.id);
  if (!check) return res.status(404).json({ error: 'Check not found' });

  const currentUser = getAuthUser(req);

  // Segregation of duties (CK-20): creator cannot approve their own check if amount > 500
  if (check.amount > 500 && check.createdByUserId === currentUser.id && currentUser.role !== 'Admin') {
    return res.status(403).json({
      error: 'Segregation of duties policy: You cannot approve a check you personally created.',
    });
  }

  check.status = 'approved';
  check.approvedByUserId = currentUser.id;
  check.approvedByUserName = currentUser.name;
  check.approvedAt = new Date().toISOString();
  check.updatedAt = new Date().toISOString();

  db.addAudit(
    currentUser.id,
    currentUser.name,
    currentUser.role,
    'CHECK_APPROVED',
    'security',
    check.id,
    `Approved check #${check.checkNumber} for $${check.amount.toFixed(2)} to ${check.payeeName}`
  );

  res.json({ success: true, check });
});

// POST /api/checks/issued/:id/reject - Reject check (CK-21)
shiftAndCheckRouter.post('/checks/issued/:id/reject', (req: Request, res: Response) => {
  const check = db.issuedChecks.find(c => c.id === req.params.id);
  if (!check) return res.status(404).json({ error: 'Check not found' });

  const currentUser = getAuthUser(req);
  const { reason } = req.body;
  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'Rejection reason is required' });
  }

  check.status = 'rejected';
  check.rejectedReason = reason.trim();
  check.updatedAt = new Date().toISOString();

  db.addAudit(
    currentUser.id,
    currentUser.name,
    currentUser.role,
    'CHECK_REJECTED',
    'security',
    check.id,
    `Rejected check #${check.checkNumber}. Reason: ${reason}`
  );

  res.json({ success: true, check });
});

// POST /api/checks/issued/:id/print - Mark printed (CK-22, CK-26)
shiftAndCheckRouter.post('/checks/issued/:id/print', (req: Request, res: Response) => {
  const check = db.issuedChecks.find(c => c.id === req.params.id);
  if (!check) return res.status(404).json({ error: 'Check not found' });

  const currentUser = getAuthUser(req);
  const now = new Date().toISOString();

  check.status = 'printed';
  check.printCount = (check.printCount || 0) + 1;
  check.printedAt = now;
  check.printedByUserId = currentUser.id;
  check.printedByUserName = currentUser.name;
  check.updatedAt = now;

  db.addAudit(
    currentUser.id,
    currentUser.name,
    currentUser.role,
    'CHECK_PRINTED',
    'system',
    check.id,
    `Printed check #${check.checkNumber} for $${check.amount.toFixed(2)} (Count: ${check.printCount})`
  );

  res.json({ success: true, check });
});

// POST /api/checks/issued/:id/reprint - Reprint check with mandatory reason (CK-27, CK-28)
shiftAndCheckRouter.post('/checks/issued/:id/reprint', (req: Request, res: Response) => {
  const check = db.issuedChecks.find(c => c.id === req.params.id);
  if (!check) return res.status(404).json({ error: 'Check not found' });

  const currentUser = getAuthUser(req);
  const { reprintReason } = req.body;
  if (!reprintReason || !reprintReason.trim()) {
    return res.status(400).json({ error: 'Reprint reason is required (e.g. Printer Jam, Mutilated Paper)' });
  }

  const now = new Date().toISOString();
  check.printCount = (check.printCount || 1) + 1;
  check.reprintReason = reprintReason.trim();
  check.isReprint = true;
  check.printedAt = now;
  check.printedByUserId = currentUser.id;
  check.printedByUserName = currentUser.name;
  check.updatedAt = now;

  db.addAudit(
    currentUser.id,
    currentUser.name,
    currentUser.role,
    'CHECK_REPRINTED',
    'security',
    check.id,
    `Reprinted check #${check.checkNumber} (Print count: ${check.printCount}). Reason: ${reprintReason}`
  );

  res.json({ success: true, check });
});

// POST /api/checks/issued/:id/void - Void check (CK-29, CK-30)
shiftAndCheckRouter.post('/checks/issued/:id/void', (req: Request, res: Response) => {
  const check = db.issuedChecks.find(c => c.id === req.params.id);
  if (!check) return res.status(404).json({ error: 'Check not found' });

  const currentUser = getAuthUser(req);
  const { voidReason } = req.body;
  if (!voidReason || !voidReason.trim()) {
    return res.status(400).json({ error: 'Void reason is required' });
  }

  const now = new Date().toISOString();
  check.status = 'voided';
  check.voidReason = voidReason.trim();
  check.voidedAt = now;
  check.voidedByUserId = currentUser.id;
  check.voidedByUserName = currentUser.name;
  check.updatedAt = now;

  db.addAudit(
    currentUser.id,
    currentUser.name,
    currentUser.role,
    'CHECK_VOIDED',
    'security',
    check.id,
    `Voided check #${check.checkNumber} for $${check.amount.toFixed(2)}. Reason: ${voidReason}`
  );

  res.json({ success: true, check });
});

// POST /api/checks/issued/:id/reissue - Reissue voided check (CK-31)
shiftAndCheckRouter.post('/checks/issued/:id/reissue', (req: Request, res: Response) => {
  const oldCheck = db.issuedChecks.find(c => c.id === req.params.id);
  if (!oldCheck) return res.status(404).json({ error: 'Check not found' });
  if (oldCheck.status !== 'voided') {
    return res.status(400).json({ error: 'Only voided checks can be reissued.' });
  }

  const currentUser = getAuthUser(req);
  const bankAccount = db.bankAccounts.find(b => b.id === oldCheck.bankAccountId) || db.bankAccounts[0];
  const newCheckNumber = bankAccount.nextCheckNumber.toString();
  bankAccount.nextCheckNumber += 1;

  const now = new Date().toISOString();
  const reissuedCheck: IssuedCheck = {
    ...oldCheck,
    id: `chk-${Date.now()}`,
    checkNumber: newCheckNumber,
    status: 'approved',
    reissuedFromCheckId: oldCheck.id,
    printCount: 0,
    printedAt: undefined,
    voidReason: undefined,
    voidedAt: undefined,
    createdAt: now,
    updatedAt: now,
  };

  oldCheck.status = 'reissued';
  oldCheck.reissuedCheckId = reissuedCheck.id;
  oldCheck.updatedAt = now;

  db.issuedChecks.unshift(reissuedCheck);

  db.addAudit(
    currentUser.id,
    currentUser.name,
    currentUser.role,
    'CHECK_REISSUED',
    'security',
    reissuedCheck.id,
    `Reissued voided check #${oldCheck.checkNumber} as new check #${newCheckNumber}`
  );

  res.status(201).json({
    success: true,
    newCheck: reissuedCheck,
    oldCheck,
  });
});

// ============================================================================
// CC-001 to CC-077: CHECK CASHING MODULE ENDPOINTS
// ============================================================================

// GET /api/check-cashing/dashboard - Today's metrics summary card (Phase 7)
shiftAndCheckRouter.get('/check-cashing/dashboard', (req: Request, res: Response) => {
  const transactions = db.checkCashingTransactions;
  const todayStr = new Date().toISOString().slice(0, 10);

  const todayTxs = transactions.filter(t => t.createdAt.startsWith(todayStr));
  const paidTxs = todayTxs.filter(t => t.status === 'ready_for_deposit' || t.status === 'paid' || t.status === 'deposited' || t.status === 'cleared');

  const checksCashed = paidTxs.length;
  const totalFaceValue = paidTxs.reduce((sum, t) => sum + t.checkAmount, 0);
  const totalPayout = paidTxs.reduce((sum, t) => sum + t.customerPayoutAmount, 0);
  const totalFeesEarned = paidTxs.reduce((sum, t) => sum + t.finalFee, 0);
  const avgFeePercent = totalFaceValue > 0 ? Math.round((totalFeesEarned / totalFaceValue) * 1000) / 10 : 0;

  const awaitingDepositCount = transactions.filter(t => t.status === 'ready_for_deposit').length;
  const awaitingDepositAmount = transactions
    .filter(t => t.status === 'ready_for_deposit')
    .reduce((sum, t) => sum + t.checkAmount, 0);

  const pendingReviewCount = transactions.filter(t => t.status === 'needs_manager_approval' || t.status === 'in_review').length;
  const returnedCount = transactions.filter(t => t.status === 'returned').length;
  const unrecoveredReturnedAmount = transactions
    .filter(t => t.status === 'returned')
    .reduce((sum, t) => sum + (t.checkAmount - (t.recoveredAmount || 0)), 0);

  res.json({
    today: {
      checksCashed,
      totalFaceValue: Math.round(totalFaceValue * 100) / 100,
      totalPayout: Math.round(totalPayout * 100) / 100,
      totalFeesEarned: Math.round(totalFeesEarned * 100) / 100,
      avgFeePercent,
    },
    pipeline: {
      awaitingDepositCount,
      awaitingDepositAmount: Math.round(awaitingDepositAmount * 100) / 100,
      pendingReviewCount,
      returnedCount,
      unrecoveredReturnedAmount: Math.round(unrecoveredReturnedAmount * 100) / 100,
    },
    todayStats: {
      checksCount: checksCashed,
      totalVolume: Math.round(totalFaceValue * 100) / 100,
      totalFeesCollected: Math.round(totalFeesEarned * 100) / 100,
      averageCheck: checksCashed > 0 ? Math.round((totalFaceValue / checksCashed) * 100) / 100 : 0,
    },
    readyForDepositCount: awaitingDepositCount,
    readyForDepositAmount: Math.round(awaitingDepositAmount * 100) / 100,
    returnedCount,
    returnedAmount: Math.round(unrecoveredReturnedAmount * 100) / 100,
    pendingApprovalsCount: pendingReviewCount,
  });
});

// GET /api/check-cashing/fee-rules
shiftAndCheckRouter.get('/check-cashing/fee-rules', (req: Request, res: Response) => {
  res.json({ feeRules: db.checkFeeRules });
});

// PUT /api/check-cashing/fee-rules - Update fee rules (Phase 4)
shiftAndCheckRouter.put('/check-cashing/fee-rules', (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  const { rules } = req.body;
  if (!Array.isArray(rules)) return res.status(400).json({ error: 'Rules array required' });

  db.checkFeeRules = rules;

  db.addAudit(
    currentUser.id,
    currentUser.name,
    currentUser.role,
    'CHECK_FEE_RULES_UPDATE',
    'system',
    'fee-rules',
    'Updated check cashing fee schedule and limits'
  );

  res.json({ success: true, feeRules: db.checkFeeRules });
});

// GET /api/check-cashing/issuers
shiftAndCheckRouter.get('/check-cashing/issuers', (req: Request, res: Response) => {
  const { search } = req.query;
  let list = db.checkIssuers;
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    list = list.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.bankName.toLowerCase().includes(q) ||
      i.routingNumber.includes(q)
    );
  }
  res.json({ issuers: list });
});

// POST /api/check-cashing/issuers - Create or update issuer
shiftAndCheckRouter.post('/check-cashing/issuers', (req: Request, res: Response) => {
  const { name, bankName, routingNumber, accountNumberMasked, phone, address, riskRating = 'low' } = req.body;
  if (!name || !bankName || !routingNumber) {
    return res.status(400).json({ error: 'Name, bank name, and routing number required' });
  }

  const existing = db.checkIssuers.find(i => i.routingNumber === routingNumber && i.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    existing.bankName = bankName;
    existing.phone = phone || existing.phone;
    existing.address = address || existing.address;
    existing.riskRating = riskRating;
    return res.json({ success: true, issuer: existing });
  }

  const newIssuer = {
    id: `iss-${Date.now()}`,
    name,
    bankName,
    routingNumber,
    accountNumberMasked: accountNumberMasked || '****0000',
    phone,
    address,
    totalChecksCashed: 0,
    totalAmountCashed: 0,
    returnedChecksCount: 0,
    riskRating,
    status: 'verified' as const,
    createdAt: new Date().toISOString(),
  };

  db.checkIssuers.push(newIssuer);
  res.status(201).json({ success: true, issuer: newIssuer });
});

// POST /api/check-cashing/extract - High-fidelity AI OCR Check Extraction simulation (CC-016)
shiftAndCheckRouter.post('/check-cashing/extract', (req: Request, res: Response) => {
  const { checkType = 'payroll', checkFrontUrl } = req.body;

  // Simulate OCR scan with realistic extraction
  const sampleIssuers = [
    { name: 'Granbury Construction & Remodeling LLC', bank: 'First National Bank of Texas', routing: '111900038', account: '4928' },
    { name: 'Texas Health Resources Hospital', bank: 'JPMorgan Chase Bank, N.A.', routing: '111000025', account: '1092' },
    { name: 'United States Treasury (IRS / SSA)', bank: 'Federal Reserve Bank of Dallas', routing: '111000038', account: '0001' },
    { name: 'Lone Star Mutual Casualty Co.', bank: 'Frost Bank', routing: '114000093', account: '7712' },
  ];

  const picked = sampleIssuers[Math.floor(Math.random() * sampleIssuers.length)];
  const randomCheckNum = (10000 + Math.floor(Math.random() * 90000)).toString();
  const sampleAmounts = [450.00, 780.00, 1150.00, 1425.50, 2100.00];
  const pickedAmount = sampleAmounts[Math.floor(Math.random() * sampleAmounts.length)];

  res.json({
    success: true,
    extractedData: {
      checkType,
      checkNumber: randomCheckNum,
      checkDate: new Date().toISOString().slice(0, 10),
      checkAmount: pickedAmount,
      micrRoutingNumber: picked.routing,
      micrAccountNumber: picked.account,
      issuerName: picked.name,
      issuerBankName: picked.bank,
      ocrConfidence: 96,
      extractedConfidence: 96,
    },
  });
});

// GET /api/check-cashing/transactions - List check cashing transactions
shiftAndCheckRouter.get('/check-cashing/transactions', (req: Request, res: Response) => {
  const { status, checkType, search } = req.query;

  let list = [...db.checkCashingTransactions];

  if (status && typeof status === 'string' && status !== 'all') {
    list = list.filter(t => t.status === status);
  }
  if (checkType && typeof checkType === 'string' && checkType !== 'all') {
    list = list.filter(t => t.checkType === checkType);
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    list = list.filter(t =>
      t.transactionNumber.toLowerCase().includes(q) ||
      t.customerName.toLowerCase().includes(q) ||
      t.issuerName.toLowerCase().includes(q) ||
      t.checkNumber.toLowerCase().includes(q)
    );
  }

  res.json({
    transactions: list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  });
});

// POST /api/check-cashing/transactions - Create new transaction (Phase 1-4)
shiftAndCheckRouter.post('/check-cashing/transactions', (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  const {
    customerId,
    customerName,
    customerPhone,
    customerIdType,
    customerIdNumber,
    customerIdState,
    customerIdExp,
    customerIdFrontUrl,
    customerIdBackUrl,
    idConfidence = 96,
    checkType = 'payroll',
    checkNumber,
    checkDate,
    checkAmount,
    micrRoutingNumber,
    micrAccountNumber,
    checkFrontUrl,
    checkBackUrl,
    issuerName,
    issuerBankName,
    issuerPhone,
    feePercentOverride,
    feeOverrideReason,
    instantPayout = false,
  } = req.body;

  if (!customerName || !checkAmount || !micrRoutingNumber || !micrAccountNumber || !checkNumber) {
    return res.status(400).json({ error: 'Missing customer or check information' });
  }

  const numAmount = parseFloat(checkAmount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Invalid check amount' });
  }

  // Duplicate Check Detection (CC-022)
  const duplicate = checkForDuplicateCheck(micrRoutingNumber, micrAccountNumber, checkNumber);
  const isDuplicate = !!duplicate;

  // Check or register Issuer
  let issuer = db.checkIssuers.find(i => i.routingNumber === micrRoutingNumber && i.name.toLowerCase() === (issuerName || '').toLowerCase());
  if (!issuer && issuerName) {
    issuer = {
      id: `iss-${Date.now()}`,
      name: issuerName,
      bankName: issuerBankName || 'Verified US Bank',
      routingNumber: micrRoutingNumber,
      accountNumberMasked: `****${micrAccountNumber.slice(-4)}`,
      phone: issuerPhone,
      totalChecksCashed: 0,
      totalAmountCashed: 0,
      returnedChecksCount: 0,
      riskRating: 'low',
      status: 'verified',
      createdAt: new Date().toISOString(),
    };
    db.checkIssuers.push(issuer);
  }

  // Fee engine calculation (Phase 4)
  const feeCalc = calculateCheckCashingFee(
    checkType,
    numAmount,
    feePercentOverride !== undefined ? { feePercent: parseFloat(feePercentOverride) } : undefined
  );

  // Risk & Manager Review Evaluation (Phase 3)
  const riskEval = evaluateCheckRisk({
    amount: numAmount,
    checkType,
    issuer,
    isDuplicate,
    idConfidence,
  });

  const txCount = db.checkCashingTransactions.length + 1;
  const transactionNumber = `CC-${(10240 + txCount).toString()}`;
  const now = new Date().toISOString();

  let initialStatus: CheckCashingTransaction['status'] = 'ready_for_deposit';
  if (riskEval.requiresApproval) {
    initialStatus = 'needs_manager_approval';
  } else if (!instantPayout) {
    initialStatus = 'ready_for_review';
  }

  const transaction: CheckCashingTransaction = {
    id: `cc-${Date.now()}`,
    transactionNumber,
    storeId: 'str-1',
    registerId: 'reg-1',
    cashierId: currentUser.id,
    cashierName: currentUser.name,
    customerId: customerId || `cust-${Date.now()}`,
    customerName,
    customerPhone: customerPhone || '(555) 000-0000',
    customerIdType: customerIdType || 'Driver License',
    customerIdNumber: customerIdNumber || 'ID-PENDING',
    customerIdState,
    customerIdExp,
    customerIdFrontUrl,
    customerIdBackUrl,
    idConfidence,
    checkType,
    checkNumber,
    checkDate: checkDate || now.slice(0, 10),
    checkAmount: numAmount,
    micrRoutingNumber,
    micrAccountNumber,
    checkFrontUrl,
    checkBackUrl,
    ocrConfidence: 95,
    ocrExtracted: true,
    issuerId: issuer?.id || 'iss-unknown',
    issuerName: issuer?.name || issuerName || 'Unknown Issuer',
    issuerBankName: issuer?.bankName || issuerBankName || 'Unknown Bank',
    issuerPhone: issuer?.phone,
    issuerRiskRating: issuer?.riskRating || 'low',
    isDuplicate,
    duplicateMatchNote: isDuplicate ? `Matches transaction ${duplicate?.transactionNumber}` : undefined,
    feePercent: feeCalc.feePercent,
    calculatedFee: feeCalc.calculatedFee,
    feeMin: feeCalc.feeMin,
    feeMax: feeCalc.feeMax,
    finalFee: feeCalc.finalFee,
    feeOverride: !!feePercentOverride,
    feeOverrideReason,
    feeOverriddenBy: feePercentOverride ? currentUser.name : undefined,
    customerPayoutAmount: feeCalc.customerPayout,
    requiresManagerApproval: riskEval.requiresApproval,
    reviewReasons: riskEval.reasons,
    status: initialStatus,
    paidAt: instantPayout && initialStatus === 'ready_for_deposit' ? now : undefined,
    paidByUserId: instantPayout && initialStatus === 'ready_for_deposit' ? currentUser.id : undefined,
    paidByUserName: instantPayout && initialStatus === 'ready_for_deposit' ? currentUser.name : undefined,
    payoutMethod: 'cash',
    createdAt: now,
    updatedAt: now,
  };

  db.checkCashingTransactions.unshift(transaction);

  if (issuer) {
    issuer.totalChecksCashed += 1;
    issuer.totalAmountCashed += numAmount;
  }

  db.addAudit(
    currentUser.id,
    currentUser.name,
    currentUser.role,
    'CHECK_CASHING_CREATE',
    'system',
    transaction.id,
    `Created check cashing ${transactionNumber}: Check #${checkNumber} for $${numAmount.toFixed(2)} (Fee: $${feeCalc.finalFee.toFixed(2)}, Payout: $${feeCalc.customerPayout.toFixed(2)}). Status: ${transaction.status}`
  );

  res.status(201).json({
    success: true,
    transaction,
  });
});

// POST /api/check-cashing/transactions/:id/payout - Finalize payout to customer (CC-041)
shiftAndCheckRouter.post('/check-cashing/transactions/:id/payout', (req: Request, res: Response) => {
  const transaction = db.checkCashingTransactions.find(t => t.id === req.params.id);
  if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
  if (transaction.status === 'ready_for_deposit' && transaction.paidAt) {
    return res.status(400).json({ error: 'Check payout already finalized for this transaction' });
  }

  const currentUser = getAuthUser(req);
  const now = new Date().toISOString();

  transaction.status = 'ready_for_deposit';
  transaction.paidAt = now;
  transaction.paidByUserId = currentUser.id;
  transaction.paidByUserName = currentUser.name;
  transaction.updatedAt = now;

  db.addAudit(
    currentUser.id,
    currentUser.name,
    currentUser.role,
    'CHECK_CASHING_PAYOUT',
    'security',
    transaction.id,
    `Finalized cash payout of $${transaction.customerPayoutAmount.toFixed(2)} for ${transaction.transactionNumber} (Fee collected: $${transaction.finalFee.toFixed(2)})`
  );

  res.json({ success: true, transaction });
});

// POST /api/check-cashing/transactions/:id/manager-decision - Approve / Hold / Decline (Phase 3 CC-034, CC-035)
shiftAndCheckRouter.post('/check-cashing/transactions/:id/manager-decision', (req: Request, res: Response) => {
  const transaction = db.checkCashingTransactions.find(t => t.id === req.params.id);
  if (!transaction) return res.status(404).json({ error: 'Transaction not found' });

  const { decision, note, managerPin } = req.body;
  const manager = db.users.find(u => (u.role === 'Manager' || u.role === 'Admin') && u.pin === managerPin && u.active);
  if (!manager) return res.status(401).json({ error: 'Invalid manager PIN' });

  const now = new Date().toISOString();
  transaction.managerDecision = decision;
  transaction.managerDecisionNote = note;
  transaction.managerDecisionBy = manager.name;
  transaction.managerDecisionAt = now;
  transaction.updatedAt = now;

  if (decision === 'APPROVE') {
    transaction.status = 'ready_for_deposit';
    transaction.paidAt = now;
    transaction.paidByUserId = manager.id;
    transaction.paidByUserName = manager.name;
  } else if (decision === 'DECLINE') {
    transaction.status = 'declined';
  } else if (decision === 'HOLD') {
    transaction.status = 'in_review';
  }

  db.addAudit(
    manager.id,
    manager.name,
    manager.role,
    'CHECK_CASHING_MANAGER_DECISION',
    'security',
    transaction.id,
    `Manager ${manager.name} made decision [${decision}] on ${transaction.transactionNumber}. Note: ${note || 'N/A'}`
  );

  res.json({ success: true, transaction });
});

// QR Session Generation and Mobile Simulation (Phase 2 CC-006, CC-036, CC-037)
shiftAndCheckRouter.post('/check-cashing/qr/session', (req: Request, res: Response) => {
  const token = `qr-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins

  const session: CheckQrSession = {
    id: `qrsess-${Date.now()}`,
    token,
    status: 'waiting_for_scan',
    expiresAt,
    createdAt: new Date().toISOString(),
  };

  db.checkQrSessions.push(session);

  res.json({
    success: true,
    session,
    qrUrl: `https://pos.local/mobile/check-upload?token=${token}`,
  });
});

shiftAndCheckRouter.get('/check-cashing/qr/session/:token', (req: Request, res: Response) => {
  let session = db.checkQrSessions.find(s => s.token === req.params.token || s.id === req.params.token);
  if (!session) {
    session = {
      id: `qrsess-${Date.now()}`,
      token: req.params.token,
      status: 'waiting_for_scan',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    db.checkQrSessions.push(session);
  }
  res.json({ session });
});

shiftAndCheckRouter.post('/check-cashing/qr/session/:token/submit', (req: Request, res: Response) => {
  let session = db.checkQrSessions.find(s => s.token === req.params.token || s.id === req.params.token);
  if (!session) {
    session = {
      id: `qrsess-${Date.now()}`,
      token: req.params.token,
      status: 'waiting_for_scan',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    db.checkQrSessions.push(session);
  }

  const {
    name,
    customerName,
    phone,
    customerPhone,
    idType,
    idNumber,
    idFrontUrl,
    customerIdFrontUrl,
    idBackUrl,
    customerIdBackUrl,
    checkFrontUrl,
    checkBackUrl,
    checkAmount,
    checkNumber,
    issuerName,
    checkType,
  } = req.body;

  session.status = 'ready_for_review';
  session.customerData = {
    name: name || customerName || 'Walk-in Customer',
    phone: phone || customerPhone || '',
    idType: idType || 'Driver License',
    idNumber: idNumber || '',
    idFrontUrl: idFrontUrl || customerIdFrontUrl || '',
    idBackUrl: idBackUrl || customerIdBackUrl || '',
    checkFrontUrl: checkFrontUrl || '',
    checkBackUrl: checkBackUrl || checkFrontUrl || '',
    checkAmount: parseFloat(checkAmount) || 0,
    checkNumber: checkNumber || '',
    issuerName: issuerName || '',
    checkType: checkType || 'payroll',
  };

  db.addAudit(
    'system',
    'Customer Mobile Intake',
    'Customer',
    'CHECK_MOBILE_SUBMISSION',
    'check_cashing',
    session.id,
    `Customer completed smartphone check intake for token ${session.token} (Name: ${session.customerData.name}, Check Amount: $${session.customerData.checkAmount})`
  );

  res.json({ success: true, session });
});

// GET /api/check-cashing/qr/pending - Get customer submissions waiting for cashier review
shiftAndCheckRouter.get('/check-cashing/qr/pending', (req: Request, res: Response) => {
  const pendingSessions = (db.checkQrSessions || []).filter(
    s => (s.status as string) === 'ready_for_review' || (s.status as string) === 'submitted'
  );
  res.json({ sessions: pendingSessions });
});

// Deposit Batches (Phase 5 CC-048 to CC-051)
shiftAndCheckRouter.get('/check-cashing/deposit-batches', (req: Request, res: Response) => {
  const batches = (db.depositBatches || []).map(b => ({
    ...b,
    checkCount: b.checksCount || (b as any).checkCount || b.checkIds?.length || 0,
    depositBankName: (b as any).depositBankName || b.bankAccountName || 'Operating Account',
  }));
  res.json({ batches });
});

shiftAndCheckRouter.post('/check-cashing/deposit-batch', (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  const { checkIds, transactionIds, bankAccountId, depositBankAccountId, notes } = req.body;
  const effectiveCheckIds: string[] = Array.isArray(checkIds) && checkIds.length > 0
    ? checkIds
    : (Array.isArray(transactionIds) && transactionIds.length > 0 ? transactionIds : []);

  if (effectiveCheckIds.length === 0) {
    return res.status(400).json({ error: 'Select at least one check to create deposit batch' });
  }

  const effectiveBankId = bankAccountId || depositBankAccountId;
  const bankAccount = db.bankAccounts.find(b => b.id === effectiveBankId) || db.bankAccounts[0];
  const checks = db.checkCashingTransactions.filter(t => effectiveCheckIds.includes(t.id));
  const totalAmount = checks.reduce((sum, c) => sum + c.checkAmount, 0);

  const batchCount = db.depositBatches.length + 1;
  const batchNumber = `DEP-2026-${batchCount.toString().padStart(3, '0')}`;
  const now = new Date().toISOString();

  const newBatch: DepositBatch = {
    id: `dep-${Date.now()}`,
    batchNumber,
    depositDate: now.slice(0, 10),
    bankAccountId: bankAccount.id,
    bankAccountName: bankAccount.accountName,
    depositBankName: bankAccount.bankName || bankAccount.accountName,
    checkIds: effectiveCheckIds,
    checksCount: checks.length,
    checkCount: checks.length,
    totalAmount: Math.round(totalAmount * 100) / 100,
    status: 'created',
    createdById: currentUser.id,
    createdByName: currentUser.name,
    notes,
    createdAt: now,
  };

  for (const c of checks) {
    c.status = 'deposit_batch';
    c.depositBatchId = newBatch.id;
    c.depositBatchNumber = batchNumber;
    c.updatedAt = now;
  }

  db.depositBatches.unshift(newBatch);

  db.addAudit(
    currentUser.id,
    currentUser.name,
    currentUser.role,
    'DEPOSIT_BATCH_CREATED',
    'system',
    newBatch.id,
    `Created deposit batch ${batchNumber} with ${checks.length} checks totaling $${newBatch.totalAmount.toFixed(2)} for ${bankAccount.accountName}`
  );

  res.status(201).json({ success: true, batch: newBatch });
});

shiftAndCheckRouter.post('/check-cashing/deposit-batches/:id/mark-deposited', (req: Request, res: Response) => {
  const batch = db.depositBatches.find(b => b.id === req.params.id);
  if (!batch) return res.status(404).json({ error: 'Deposit batch not found' });

  const currentUser = getAuthUser(req);
  const now = new Date().toISOString();

  batch.status = 'deposited';
  batch.depositedAt = now;

  for (const c of db.checkCashingTransactions) {
    if (c.depositBatchId === batch.id) {
      c.status = 'deposited';
      c.updatedAt = now;
    }
  }

  db.addAudit(
    currentUser.id,
    currentUser.name,
    currentUser.role,
    'DEPOSIT_BATCH_DEPOSITED',
    'system',
    batch.id,
    `Marked deposit batch ${batch.batchNumber} as deposited to bank`
  );

  res.json({ success: true, batch });
});

// Returned Checks & Bad Debt Recovery (Phase 6 CC-052 to CC-055)
shiftAndCheckRouter.post('/check-cashing/transactions/:id/mark-returned', (req: Request, res: Response) => {
  const transaction = db.checkCashingTransactions.find(t => t.id === req.params.id);
  if (!transaction) return res.status(404).json({ error: 'Transaction not found' });

  const currentUser = getAuthUser(req);
  const { returnReason, returnDate, bankReturnReference, additionalReturnFee = 35.00 } = req.body;

  if (!returnReason || !returnReason.trim()) {
    return res.status(400).json({ error: 'Return reason is required (e.g. NSF, Stop Payment, Account Closed)' });
  }

  const now = new Date().toISOString();
  transaction.status = 'returned';
  transaction.returnDate = returnDate || now.slice(0, 10);
  transaction.returnReason = returnReason.trim();
  transaction.bankReturnReference = bankReturnReference;
  transaction.additionalReturnFee = parseFloat(additionalReturnFee) || 35.00;
  transaction.recoveryStatus = 'outstanding';
  transaction.recoveredAmount = 0;
  transaction.updatedAt = now;

  // Update issuer returned count and risk rating
  const issuer = db.checkIssuers.find(i => i.id === transaction.issuerId);
  if (issuer) {
    issuer.returnedChecksCount += 1;
    if (issuer.returnedChecksCount >= 2) {
      issuer.riskRating = 'high';
      issuer.status = 'blocked';
    } else {
      issuer.riskRating = 'medium';
    }
  }

  db.addAudit(
    currentUser.id,
    currentUser.name,
    currentUser.role,
    'CHECK_RETURNED',
    'security',
    transaction.id,
    `Check ${transaction.transactionNumber} (Check #${transaction.checkNumber}, $${transaction.checkAmount.toFixed(2)}) returned by bank. Reason: ${returnReason}`
  );

  res.json({ success: true, transaction });
});

shiftAndCheckRouter.post('/check-cashing/transactions/:id/recovery', (req: Request, res: Response) => {
  const transaction = db.checkCashingTransactions.find(t => t.id === req.params.id);
  if (!transaction) return res.status(404).json({ error: 'Transaction not found' });

  const currentUser = getAuthUser(req);
  const { recoveryStatus, paymentAmount, recoveryNotes } = req.body;

  const numPayment = parseFloat(paymentAmount) || 0;
  transaction.recoveredAmount = (transaction.recoveredAmount || 0) + numPayment;
  transaction.recoveryStatus = recoveryStatus || (transaction.recoveredAmount >= transaction.checkAmount ? 'recovered' : 'partially_recovered');
  if (recoveryNotes) {
    transaction.recoveryNotes = (transaction.recoveryNotes ? transaction.recoveryNotes + ' | ' : '') + recoveryNotes;
  }
  transaction.updatedAt = new Date().toISOString();

  db.addAudit(
    currentUser.id,
    currentUser.name,
    currentUser.role,
    'CHECK_RECOVERY_PAYMENT',
    'security',
    transaction.id,
    `Recorded recovery payment of $${numPayment.toFixed(2)} on returned check ${transaction.transactionNumber}. Status: ${transaction.recoveryStatus}`
  );

  res.json({ success: true, transaction });
});

// Reports & Reconciliation (Phase 7 CC-056 to CC-065)
shiftAndCheckRouter.get('/check-cashing/reports', (req: Request, res: Response) => {
  const transactions = db.checkCashingTransactions;
  const issuers = db.checkIssuers;

  // By check type breakdown
  const typeMap: Record<string, { count: number; totalAmount: number; fees: number }> = {};
  for (const t of transactions) {
    if (!typeMap[t.checkType]) {
      typeMap[t.checkType] = { count: 0, totalAmount: 0, fees: 0 };
    }
    typeMap[t.checkType].count += 1;
    typeMap[t.checkType].totalAmount += t.checkAmount;
    typeMap[t.checkType].fees += t.finalFee;
  }

  // Issuer exposure
  const topIssuers = [...issuers].sort((a, b) => b.totalAmountCashed - a.totalAmountCashed).slice(0, 5);

  res.json({
    typeBreakdown: Object.entries(typeMap).map(([type, stats]) => ({
      type,
      count: stats.count,
      totalAmount: Math.round(stats.totalAmount * 100) / 100,
      fees: Math.round(stats.fees * 100) / 100,
    })),
    topIssuers,
    returnedChecksSummary: {
      totalCount: transactions.filter(t => t.status === 'returned').length,
      totalAmount: transactions.filter(t => t.status === 'returned').reduce((sum, t) => sum + t.checkAmount, 0),
      totalRecovered: transactions.filter(t => t.status === 'returned').reduce((sum, t) => sum + (t.recoveredAmount || 0), 0),
    },
  });
});
