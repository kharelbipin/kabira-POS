import { db } from './db.js';
import {
  IssuedCheck,
  CheckCashingTransaction,
  CheckType,
  CheckFeeRule,
  CheckIssuer,
  DepositBatch,
} from '../src/types.js';

// Number to Words Converter for Check Printing (e.g. 1250.45 -> "One Thousand Two Hundred Fifty and 45/100 Dollars")
export function amountToWrittenWords(amount: number): string {
  if (amount === 0) return 'Zero and 00/100 Dollars';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const scales = ['', 'Thousand', 'Million', 'Billion'];

  function convertGroup(n: number): string {
    let result = '';
    const h = Math.floor(n / 100);
    const rest = n % 100;

    if (h > 0) {
      result += units[h] + ' Hundred';
      if (rest > 0) result += ' ';
    }

    if (rest > 0) {
      if (rest < 20) {
        result += units[rest];
      } else {
        const t = Math.floor(rest / 10);
        const u = rest % 10;
        result += tens[t];
        if (u > 0) result += '-' + units[u];
      }
    }
    return result;
  }

  const dollars = Math.floor(amount);
  const cents = Math.round((amount - dollars) * 100);

  if (dollars === 0) {
    return `Zero and ${cents.toString().padStart(2, '0')}/100 Dollars`;
  }

  let words = '';
  let tempDollars = dollars;
  let scaleIndex = 0;

  while (tempDollars > 0) {
    const group = tempDollars % 1000;
    if (group > 0) {
      const groupWords = convertGroup(group);
      const scale = scales[scaleIndex];
      words = groupWords + (scale ? ' ' + scale : '') + (words ? ' ' + words : '');
    }
    tempDollars = Math.floor(tempDollars / 1000);
    scaleIndex++;
  }

  return `${words} and ${cents.toString().padStart(2, '0')}/100 Dollars`;
}

// Calculate Cashing Fee based on rules
export function calculateCheckCashingFee(
  checkType: CheckType,
  amount: number,
  ruleOverride?: Partial<CheckFeeRule>
): { feePercent: number; feeMin: number; feeMax?: number; calculatedFee: number; finalFee: number; customerPayout: number } {
  const rule = db.checkFeeRules.find(r => r.checkType === checkType && r.active) || {
    id: 'default',
    checkType,
    label: 'Standard',
    feePercent: 2.0,
    minFee: 3.0,
    maxFee: 75.0,
    description: 'Default rate',
    active: true,
  };

  const feePercent = ruleOverride?.feePercent ?? rule.feePercent;
  const feeMin = ruleOverride?.minFee ?? rule.minFee;
  const feeMax = ruleOverride?.maxFee ?? rule.maxFee;

  const rawFee = Math.round((amount * (feePercent / 100)) * 100) / 100;
  let finalFee = Math.max(rawFee, feeMin);
  if (feeMax && finalFee > feeMax) {
    finalFee = feeMax;
  }
  finalFee = Math.round(finalFee * 100) / 100;

  const customerPayout = Math.max(0, Math.round((amount - finalFee) * 100) / 100);

  return {
    feePercent,
    feeMin,
    feeMax,
    calculatedFee: rawFee,
    finalFee,
    customerPayout,
  };
}

// Duplicate Check Detection (CC-022)
export function checkForDuplicateCheck(routing: string, account: string, checkNumber: string, excludeId?: string) {
  const normRouting = routing.trim();
  const normAccount = account.trim().replace(/^0+/, '');
  const normCheckNum = checkNumber.trim().replace(/^0+/, '');

  const duplicate = db.checkCashingTransactions.find(t => {
    if (excludeId && t.id === excludeId) return false;
    if (t.status === 'declined') return false;
    const tRouting = t.micrRoutingNumber.trim();
    const tAccount = t.micrAccountNumber.trim().replace(/^0+/, '');
    const tCheck = t.checkNumber.trim().replace(/^0+/, '');
    return tRouting === normRouting && tAccount === normAccount && tCheck === normCheckNum;
  });

  return duplicate || null;
}

// Evaluate Risk and Check if Manager Approval is Required (CC-032, CC-040)
export function evaluateCheckRisk(data: {
  amount: number;
  checkType: CheckType;
  issuer?: CheckIssuer;
  isDuplicate: boolean;
  idConfidence?: number;
  customerHistoryGood?: boolean;
}): { requiresApproval: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Face value thresholds
  if (data.amount >= 2500) {
    reasons.push(`High Face Value: $${data.amount.toFixed(2)} exceeds $2,500 threshold (Manager approval required)`);
  } else if (data.amount >= 1000) {
    reasons.push(`Face Value: $${data.amount.toFixed(2)} exceeds $1,000 threshold (Verification recommended)`);
  }

  // Duplicate match
  if (data.isDuplicate) {
    reasons.push('CRITICAL: Duplicate check detected with matching routing, account, and check number');
  }

  // Issuer risk
  if (!data.issuer) {
    reasons.push('Unverified/New Issuer: First time this company check is being cashed at this store');
  } else {
    if (data.issuer.status === 'blocked' || data.issuer.riskRating === 'blocked') {
      reasons.push('BLOCKED ISSUER: Issuer is on blocked list due to prior bad/unpaid checks');
    } else if (data.issuer.riskRating === 'high') {
      reasons.push(`High Risk Issuer: Issuer has ${data.issuer.returnedChecksCount} previous returned checks`);
    }
  }

  // Personal checks have inherent elevated risk
  if (data.checkType === 'personal') {
    reasons.push('Personal Check: Personal third-party checks carry elevated return risk');
  }

  // Low ID confidence
  if (data.idConfidence !== undefined && data.idConfidence < 80) {
    reasons.push(`Low ID Match Confidence (${data.idConfidence}%): Visual document inspection required`);
  }

  const requiresApproval =
    data.amount >= 1500 ||
    data.isDuplicate ||
    data.checkType === 'personal' ||
    (data.issuer?.riskRating === 'high' || data.issuer?.riskRating === 'blocked') ||
    reasons.length >= 2;

  return { requiresApproval, reasons };
}
