import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Banknote,
  Check,
  CreditCard,
  Gift,
  KeyRound,
  Loader2,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react';
import { api } from '../utils/api';
import { playBeep } from '../utils/audio';
import {
  CartItem,
  Customer,
  Order,
  PaymentDetail,
  StoreSettings,
  User,
} from '../types';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  customer?: Customer | null;
  currentUser?: User | null;
  settings?: StoreSettings | null;
  orderDiscountPercent?: number;
  orderDiscountAmount?: number;
  pointsRedeemed?: number;
  pointsDiscountAmount?: number;
  onOrderComplete: (order: Order) => void;
  onOpenDrawer?: () => Promise<void> | void;
}

type CheckoutMethod =
  | 'cash'
  | 'card'
  | 'gift_card'
  | 'cheque'
  | 'store_credit';

type TerminalOutcome =
  | 'approved'
  | 'declined'
  | 'cancelled'
  | 'timeout';

interface TenderEntry {
  id: string;
  method: CheckoutMethod;
  amount: number;
  paymentDetail?: PaymentDetail;
}

export const CheckoutModal: React.FC<
  CheckoutModalProps
> = ({
  isOpen,
  onClose,
  cartItems,
  subtotal,
  discountTotal,
  taxTotal,
  grandTotal,
  customer,
  currentUser,
  settings,
  pointsRedeemed = 0,
  pointsDiscountAmount = 0,
  onOrderComplete,
  onOpenDrawer,
}) => {
  const [tenders, setTenders] = useState<TenderEntry[]>([]);

  const [amountInput, setAmountInput] = useState<string>('');

  const [showAmountPad, setShowAmountPad] =
    useState<boolean>(false);

  const [pendingMethod, setPendingMethod] =
    useState<CheckoutMethod | null>(null);

  const [isProcessing, setIsProcessing] =
    useState<boolean>(false);

  const [generalError, setGeneralError] =
    useState<string | null>(null);

  const [needsManagerApproval, setNeedsManagerApproval] =
    useState<boolean>(false);

  const [managerApproved, setManagerApproved] =
    useState<boolean>(false);

  const [managerPin, setManagerPin] =
    useState<string>('');

  const [managerError, setManagerError] =
    useState<string | null>(null);

  const [isVerifyingManager, setIsVerifyingManager] =
    useState<boolean>(false);

  const [activeCardCharge, setActiveCardCharge] =
    useState<number | null>(null);

  const [showTerminalSimulation, setShowTerminalSimulation] =
    useState<boolean>(false);

  const getAuthenticatedCashier = (): User | null => {
    if (!currentUser?.id || !currentUser?.name) {
      playBeep('error');

      setGeneralError(
        'A signed-in operator is required before collecting payment.'
      );

      return null;
    }

    return currentUser;
  };

  const totalPaid = useMemo(
    () =>
      tenders.reduce(
        (sum, tender) => sum + Number(tender.amount || 0),
        0
      ),
    [tenders]
  );

  const remainingBalance = Math.max(
    0,
    Number((grandTotal - totalPaid).toFixed(2))
  );

  const changeDue = Math.max(
    0,
    Number((totalPaid - grandTotal).toFixed(2))
  );

  const paymentComplete =
    remainingBalance <= 0.009 && totalPaid > 0;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setTenders([]);
    setAmountInput('');
    setPendingMethod(null);
    setShowAmountPad(false);
    setGeneralError(null);
    setManagerApproved(false);
    setManagerPin('');
    setManagerError(null);
    setActiveCardCharge(null);
    setShowTerminalSimulation(false);

    const manualApprovalRequired =
      settings?.cashierManualCardEntry ===
      'manager_required';

    setNeedsManagerApproval(
      Boolean(manualApprovalRequired)
    );
  }, [isOpen, settings]);

  if (!isOpen) {
    return null;
  }

  const roundMoney = (value: number) =>
    Math.round(value * 100) / 100;

  const getActiveAmount = () => {
    const parsed = Number(amountInput);

    if (
      amountInput.trim() &&
      Number.isFinite(parsed) &&
      parsed > 0
    ) {
      return roundMoney(
        Math.min(parsed, remainingBalance)
      );
    }

    return roundMoney(remainingBalance);
  };

  const openAmountPad = (
    method: CheckoutMethod
  ) => {
    if (remainingBalance <= 0) {
      return;
    }

    setPendingMethod(method);
    setAmountInput(
      remainingBalance.toFixed(2)
    );
    setShowAmountPad(true);
    setGeneralError(null);
  };

  const appendAmountDigit = (
    value: string
  ) => {
    if (value === '.') {
      if (
        amountInput.includes('.')
      ) {
        return;
      }

      setAmountInput(
        amountInput
          ? `${amountInput}.`
          : '0.'
      );

      return;
    }

    const decimalPart =
      amountInput.split('.')[1];

    if (
      decimalPart &&
      decimalPart.length >= 2
    ) {
      return;
    }

    const next =
      amountInput === '0'
        ? value
        : `${amountInput}${value}`;

    setAmountInput(next);
  };

  const clearAmount = () => {
    setAmountInput('');
  };

  const closeAmountPad = () => {
    setShowAmountPad(false);
    setPendingMethod(null);
    setAmountInput('');
  };

  const addTender = (
    method: CheckoutMethod,
    amount: number,
    paymentDetail?: PaymentDetail
  ) => {
    const normalizedAmount =
      roundMoney(amount);

    if (
      normalizedAmount <= 0
    ) {
      setGeneralError(
        'Payment amount must be greater than zero.'
      );

      return;
    }

    setTenders(prev => [
      ...prev,
      {
        id:
          `tender_${Date.now()}_` +
          Math.random()
            .toString(36)
            .substring(2, 7),
        method,
        amount:
          normalizedAmount,
        paymentDetail,
      },
    ]);

    setGeneralError(null);
  };

  const removeTender = (
    id: string
  ) => {
    setTenders(prev =>
      prev.filter(
        tender =>
          tender.id !== id
      )
    );
  };

  const verifyManagerApproval =
    async () => {
      const normalizedPin =
        managerPin.trim();

      if (
        !/^\d{4,12}$/.test(
          normalizedPin
        )
      ) {
        setManagerError(
          'Enter a valid manager PIN.'
        );

        return;
      }

      setIsVerifyingManager(true);
      setManagerError(null);

      try {
        const result =
          await api.verifyManagerPin(
            normalizedPin,
            'Checkout manual card approval'
          );

        if (!result.approved) {
          throw new Error(
            result.error ||
              'Manager approval denied.'
          );
        }

        setManagerApproved(true);
        setManagerPin('');
        playBeep('success');
      } catch (err: any) {
        setManagerApproved(false);

        setManagerError(
          err?.message ||
            'Manager approval failed.'
        );

        playBeep('error');
      } finally {
        setIsVerifyingManager(
          false
        );
      }
    };

  const handlePayCash = (
    overrideAmount?: number
  ) => {
    const cashier =
      getAuthenticatedCashier();

    if (!cashier) {
      return;
    }

    const amount =
      overrideAmount ??
      getActiveAmount();

    if (amount <= 0) {
      setGeneralError(
        'Enter a valid cash amount.'
      );

      return;
    }

    addTender(
      'cash',
      amount,
      {
        method: 'cash',
        amount,
        cashierId:
          cashier.id,
        cashierName:
          cashier.name,
      } as PaymentDetail
    );

    closeAmountPad();
  };

  const handleInitiateCardPayment =
    (
      overrideAmount?: number
    ) => {
      const cashier =
        getAuthenticatedCashier();

      if (!cashier) {
        return;
      }

      if (
        needsManagerApproval &&
        !managerApproved
      ) {
        setGeneralError(
          'Manager approval is required before manual card fallback.'
        );

        return;
      }

      const amount =
        overrideAmount ??
        getActiveAmount();

      if (amount <= 0) {
        setGeneralError(
          'Enter a valid card amount.'
        );

        return;
      }

      setActiveCardCharge(
        amount
      );

      setShowTerminalSimulation(
        true
      );

      setGeneralError(null);

      closeAmountPad();
    };

  const handleTerminalOutcome =
    async (
      outcome: TerminalOutcome
    ) => {
      const cashier =
        getAuthenticatedCashier();

      if (!cashier) {
        return;
      }

      if (
        !activeCardCharge ||
        activeCardCharge <= 0
      ) {
        return;
      }

      const amount =
        activeCardCharge;

      if (
        outcome ===
        'approved'
      ) {
        const txId =
          `tx_${Date.now()}_` +
          Math.random()
            .toString(36)
            .substring(2, 8);

        addTender(
          'card',
          amount,
          {
            method: 'card',
            amount,
            cardBrand:
              'Visa',
            cardLast4:
              '4242',
            authCode:
              `APX-${Math.floor(
                100000 +
                  Math.random() *
                    900000
              )}`,
            transactionId:
              txId,
            cashierId:
              cashier.id,
            cashierName:
              cashier.name,
          } as PaymentDetail
        );

        playBeep('success');
      } else if (
        outcome ===
        'declined'
      ) {
        setGeneralError(
          'Card declined. Try another payment method.'
        );

        playBeep('error');
      } else if (
        outcome ===
        'timeout'
      ) {
        setGeneralError(
          'Card terminal timed out. Try again or use another payment method.'
        );

        playBeep('error');
      } else {
        setGeneralError(
          'Card payment was cancelled.'
        );
      }

    setActiveCardCharge(null);
    setShowTerminalSimulation(false);
  };

  const handlePayOther = (
    methodType:
      | 'gift_card'
      | 'cheque'
      | 'store_credit'
  ) => {
    const cashier =
      getAuthenticatedCashier();

    if (!cashier) {
      return;
    }

    const amt =
      getActiveAmount();

    if (amt <= 0) {
      setGeneralError(
        'Enter a valid payment amount.'
      );

      return;
    }

    addTender(
      methodType,
      amt,
      {
        method:
          methodType,
        amount:
          amt,
        cashierId:
          cashier.id,
        cashierName:
          cashier.name,
      } as PaymentDetail
    );

    closeAmountPad();
  };

  const handleAmountDone =
    () => {
      if (!pendingMethod) {
        closeAmountPad();
        return;
      }

      const amount =
        getActiveAmount();

      if (amount <= 0) {
        setGeneralError(
          'Enter a valid payment amount.'
        );

        return;
      }

      if (
        pendingMethod ===
        'cash'
      ) {
        handlePayCash(
          amount
        );

        return;
      }

      if (
        pendingMethod ===
        'card'
      ) {
        handleInitiateCardPayment(
          amount
        );

        return;
      }

      handlePayOther(
        pendingMethod
      );
    };

  const buildPayments =
    (): PaymentDetail[] => {
      return tenders.map(
        tender => {
          if (
            tender.paymentDetail
          ) {
            return {
              ...tender.paymentDetail,
              amount:
                tender.amount,
            };
          }

          return {
            method:
              tender.method,
            amount:
              tender.amount,
          } as PaymentDetail;
        }
      );
    };

  const completeSale =
    async () => {
      const cashier =
        getAuthenticatedCashier();

      if (!cashier) {
        return;
      }

      if (
        !paymentComplete
      ) {
        setGeneralError(
          'The order must be paid in full before completing the sale.'
        );

        return;
      }

      if (
        cartItems.length ===
        0
      ) {
        setGeneralError(
          'There are no items in the order.'
        );

        return;
      }

      setIsProcessing(true);
      setGeneralError(null);

      try {
        const payments =
          buildPayments();

        const primaryPayment =
          payments[0];

        const order =
          await api.createOrder(
            {
              items:
                cartItems,

              customerId:
                customer?.id,

              customerName:
                customer?.name,

              customerPhone:
                customer?.phone,

              subtotal,
              discountTotal,
              taxTotal,
              grandTotal,

              pointsRedeemed,
              pointsDiscountAmount,

              cashierId:
                cashier.id,

              cashierName:
                cashier.name,

              payment:
                primaryPayment,

              payments,
            }
          );

        const cashTenderUsed =
          tenders.some(
            tender =>
              tender.method ===
                'cash' &&
              tender.amount >
                0
          );

        if (
          cashTenderUsed &&
          onOpenDrawer
        ) {
          try {
            await onOpenDrawer();
          } catch (drawerErr) {
            console.error(
              'Sale completed but cash drawer did not open:',
              drawerErr
            );
          }
        }

        playBeep('success');

        onOrderComplete(
          order
        );
      } catch (err: any) {
        setGeneralError(
          err?.message ||
            'Unable to complete sale.'
        );

        playBeep('error');
      } finally {
        setIsProcessing(false);
      }
    };

  const getMethodLabel = (
    method: CheckoutMethod
  ) => {
    switch (method) {
      case 'cash':
        return 'Cash';

      case 'card':
        return 'Card';

      case 'gift_card':
        return 'Gift Card';

      case 'cheque':
        return 'Check';

      case 'store_credit':
        return 'Store Credit';

      default:
        return method;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl max-h-[95vh] overflow-y-auto rounded-2xl border border-[#2A2A2A] bg-[#0E0E0E] shadow-2xl text-[#E5E5E5]">

        {/* HEADER */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#262626] bg-[#0A0A0A] px-6 py-4">

          <div>

            <h2 className="text-xl font-bold">
              Checkout
            </h2>

            <p className="text-xs text-[#777777] mt-1">
              Collect payment and complete sale
            </p>

          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-lg p-2 text-[#777777] hover:bg-[#1A1A1A] hover:text-white disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>

        </div>

        <div className="grid gap-5 p-6 lg:grid-cols-[1fr_340px]">

          {/* LEFT */}
          <div className="space-y-5">

            {generalError && (
              <div className="flex items-start gap-2 rounded-xl border border-red-800 bg-red-950/30 p-3 text-sm text-red-300">

                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

                <span>
                  {generalError}
                </span>

              </div>
            )}

            {/* PAYMENT METHODS */}
            <div>

              <div className="mb-3 flex items-center justify-between">

                <h3 className="font-bold">
                  Payment Method
                </h3>

                <span className="text-xs text-[#777777]">
                  Remaining $
                  {remainingBalance.toFixed(
                    2
                  )}
                </span>

              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">

                <button
                  type="button"
                  onClick={() =>
                    openAmountPad(
                      'cash'
                    )
                  }
                  disabled={
                    remainingBalance <=
                      0 ||
                    isProcessing
                  }
                  className="rounded-xl border border-[#303030] bg-[#171717] p-4 text-left hover:border-[#C5A059] hover:bg-[#1D1D1D] disabled:opacity-40"
                >
                  <Banknote className="mb-2 h-6 w-6 text-[#C5A059]" />

                  <div className="font-bold">
                    Cash
                  </div>

                  <div className="text-xs text-[#777777]">
                    Cash tender
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    openAmountPad(
                      'card'
                    )
                  }
                  disabled={
                    remainingBalance <=
                      0 ||
                    isProcessing
                  }
                  className="rounded-xl border border-[#303030] bg-[#171717] p-4 text-left hover:border-[#C5A059] hover:bg-[#1D1D1D] disabled:opacity-40"
                >
                  <CreditCard className="mb-2 h-6 w-6 text-[#C5A059]" />

                  <div className="font-bold">
                    Card
                  </div>

                  <div className="text-xs text-[#777777]">
                    Terminal / fallback
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    openAmountPad(
                      'gift_card'
                    )
                  }
                  disabled={
                    remainingBalance <=
                      0 ||
                    isProcessing
                  }
                  className="rounded-xl border border-[#303030] bg-[#171717] p-4 text-left hover:border-[#C5A059] hover:bg-[#1D1D1D] disabled:opacity-40"
                >
                  <Gift className="mb-2 h-6 w-6 text-[#C5A059]" />

                  <div className="font-bold">
                    Gift Card
                  </div>

                  <div className="text-xs text-[#777777]">
                    Gift-card tender
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    openAmountPad(
                      'cheque'
                    )
                  }
                  disabled={
                    remainingBalance <=
                      0 ||
                    isProcessing
                  }
                  className="rounded-xl border border-[#303030] bg-[#171717] p-4 text-left hover:border-[#C5A059] hover:bg-[#1D1D1D] disabled:opacity-40"
                >
                  <Check className="mb-2 h-6 w-6 text-[#C5A059]" />

                  <div className="font-bold">
                    Check
                  </div>

                  <div className="text-xs text-[#777777]">
                    Check payment
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    openAmountPad(
                      'store_credit'
                    )
                  }
                  disabled={
                    remainingBalance <=
                      0 ||
                    isProcessing
                  }
                  className="rounded-xl border border-[#303030] bg-[#171717] p-4 text-left hover:border-[#C5A059] hover:bg-[#1D1D1D] disabled:opacity-40"
                >
                  <Smartphone className="mb-2 h-6 w-6 text-[#C5A059]" />

                  <div className="font-bold">
                    Store Credit
                  </div>

                  <div className="text-xs text-[#777777]">
                    Customer credit
                  </div>
                </button>

              </div>
            </div>

            {/* MANAGER APPROVAL */}
            {needsManagerApproval &&
              !managerApproved && (
                <div className="rounded-xl border border-[#3A3321] bg-[#17140B] p-4">

                  <div className="mb-3 flex items-start gap-3">

                    <ShieldCheck className="mt-0.5 h-5 w-5 text-[#C5A059]" />

                    <div>

                      <div className="font-bold">
                        Manager Approval
                      </div>

                      <div className="text-xs text-[#8E8E8E]">
                        Required for manual card fallback
                      </div>

                    </div>

                  </div>

                  {managerError && (
                    <div className="mb-3 text-xs text-red-400">
                      {managerError}
                    </div>
                  )}

                  <div className="flex gap-2">

                    <div className="relative flex-1">

                      <KeyRound className="absolute left-3 top-3 h-4 w-4 text-[#777777]" />

                      <input
                        type="password"
                        inputMode="numeric"
                        autoComplete="off"
                        value={managerPin}
                        maxLength={12}
                        onChange={e => {
                          setManagerPin(
                            e.target.value.replace(
                              /\D/g,
                              ''
                            )
                          );

                          setManagerError(
                            null
                          );
                        }}
                        onKeyDown={e => {
                          if (
                            e.key ===
                            'Enter'
                          ) {
                            e.preventDefault();

                            if (
                              !isVerifyingManager
                            ) {
                              void verifyManagerApproval();
                            }
                          }
                        }}
                        className="w-full rounded-lg border border-[#303030] bg-[#111111] py-2.5 pl-9 pr-3 font-mono tracking-widest outline-none focus:border-[#C5A059]"
                        placeholder="Manager PIN"
                        disabled={
                          isVerifyingManager
                        }
                      />

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        void verifyManagerApproval()
                      }
                      disabled={
                        isVerifyingManager ||
                        !managerPin
                      }
                      className="rounded-lg bg-[#C5A059] px-4 text-sm font-bold text-black disabled:opacity-40"
                    >
                      {isVerifyingManager
                        ? 'Checking...'
                        : 'Approve'}
                    </button>

                  </div>
                </div>
              )}

            {managerApproved && (
              <div className="flex items-center gap-2 rounded-xl border border-green-900 bg-green-950/20 p-3 text-sm text-green-400">

                <ShieldCheck className="h-4 w-4" />

                Manager approval verified

              </div>
            )}

            {/* TENDERS */}
            <div>

              <h3 className="mb-3 font-bold">
                Payments
              </h3>

              {tenders.length ===
              0 ? (
                <div className="rounded-xl border border-dashed border-[#303030] p-6 text-center text-sm text-[#666666]">
                  No payment entered yet.
                </div>
              ) : (
                <div className="space-y-2">

                  {tenders.map(
                    tender => (
                      <div
                        key={
                          tender.id
                        }
                        className="flex items-center justify-between rounded-xl border border-[#282828] bg-[#151515] px-4 py-3"
                      >

                        <div>

                          <div className="font-medium">
                            {getMethodLabel(
                              tender.method
                            )}
                          </div>

                          <div className="text-xs text-[#777777]">
                            $
                            {tender.amount.toFixed(
                              2
                            )}
                          </div>

                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removeTender(
                              tender.id
                            )
                          }
                          disabled={
                            isProcessing
                          }
                          className="rounded-lg px-3 py-1 text-xs font-bold text-red-400 hover:bg-red-950/30 disabled:opacity-50"
                        >
                          Remove
                        </button>

                      </div>
                    )
                  )}

                </div>
              )}
            </div>

          </div>

          {/* SUMMARY */}
          <div className="h-fit rounded-2xl border border-[#292929] bg-[#121212] p-5">

            <h3 className="mb-4 text-lg font-bold">
              Order Summary
            </h3>

            <div className="space-y-2 text-sm">

              <div className="flex justify-between text-[#9A9A9A]">
                <span>
                  Subtotal
                </span>
                <span>
                  $
                  {subtotal.toFixed(
                    2
                  )}
                </span>
              </div>

              <div className="flex justify-between text-[#9A9A9A]">
                <span>
                  Discount
                </span>
                <span>
                  -$
                  {discountTotal.toFixed(
                    2
                  )}
                </span>
              </div>

              <div className="flex justify-between text-[#9A9A9A]">
                <span>
                  Tax
                </span>
                <span>
                  $
                  {taxTotal.toFixed(
                    2
                  )}
                </span>
              </div>

              {pointsDiscountAmount >
                0 && (
                <div className="flex justify-between text-[#9A9A9A]">
                  <span>
                    Rewards
                  </span>
                  <span>
                    -$
                    {pointsDiscountAmount.toFixed(
                      2
                    )}
                  </span>
                </div>
              )}

              <div className="my-3 border-t border-[#292929]" />

              <div className="flex justify-between text-xl font-bold">
                <span>
                  Total
                </span>
                <span>
                  $
                  {grandTotal.toFixed(
                    2
                  )}
                </span>
              </div>

              <div className="flex justify-between text-[#9A9A9A]">
                <span>
                  Paid
                </span>
                <span>
                  $
                  {totalPaid.toFixed(
                    2
                  )}
                </span>
              </div>

              <div className="flex justify-between font-bold text-[#C5A059]">
                <span>
                  Remaining
                </span>
                <span>
                  $
                  {remainingBalance.toFixed(
                    2
                  )}
                </span>
              </div>

              {changeDue >
                0 && (
                <div className="flex justify-between font-bold text-green-400">
                  <span>
                    Change Due
                  </span>
                  <span>
                    $
                    {changeDue.toFixed(
                      2
                    )}
                  </span>
                </div>
              )}

            </div>

            <button
              type="button"
              onClick={() =>
                void completeSale()
              }
              disabled={
                !paymentComplete ||
                isProcessing
              }
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#C5A059] py-3 font-bold text-black hover:bg-[#D4B06A] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Complete Sale
                </>
              )}
            </button>

          </div>

        </div>

        {/* AMOUNT PAD */}
        {showAmountPad && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4">

            <div className="w-full max-w-sm rounded-2xl border border-[#303030] bg-[#111111] p-5 shadow-2xl">

              <div className="mb-4 flex items-center justify-between">

                <div>

                  <div className="font-bold">
                    Enter Amount
                  </div>

                  <div className="text-xs text-[#777777]">
                    {pendingMethod
                      ? getMethodLabel(
                          pendingMethod
                        )
                      : 'Payment'}
                  </div>

                </div>

                <button
                  type="button"
                  onClick={
                    closeAmountPad
                  }
                  className="rounded-lg p-2 text-[#777777] hover:bg-[#1A1A1A]"
                >
                  <X className="h-4 w-4" />
                </button>

              </div>

              <div className="mb-4 rounded-xl border border-[#303030] bg-black px-4 py-3 text-right text-3xl font-bold">
                $
                {amountInput ||
                  '0.00'}
              </div>

              <div className="grid grid-cols-3 gap-2">

                {[
                  '1',
                  '2',
                  '3',
                  '4',
                  '5',
                  '6',
                  '7',
                  '8',
                  '9',
                  '.',
                  '0',
                  '00',
                ].map(
                  key => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        if (
                          key ===
                          '00'
                        ) {
                          appendAmountDigit(
                            '0'
                          );
                          appendAmountDigit(
                            '0'
                          );
                        } else {
                          appendAmountDigit(
                            key
                          );
                        }
                      }}
                      className="h-14 rounded-xl border border-[#303030] bg-[#181818] text-lg font-bold hover:border-[#C5A059] hover:bg-[#202020]"
                    >
                      {key}
                    </button>
                  )
                )}

              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">

                <button
                  type="button"
                  onClick={
                    clearAmount
                  }
                  className="rounded-xl border border-[#303030] py-3 text-sm font-bold text-[#AAAAAA] hover:bg-[#1A1A1A]"
                >
                  Clear
                </button>

                <button
                  type="button"
                  onClick={
                    handleAmountDone
                  }
                  className="rounded-xl bg-[#C5A059] py-3 text-sm font-bold text-black hover:bg-[#D4B06A]"
                >
                  Done
                </button>

              </div>

            </div>
          </div>
        )}

        {/* CARD SIMULATION */}
        {showTerminalSimulation && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 p-4">

            <div className="w-full max-w-md rounded-2xl border border-[#303030] bg-[#111111] p-6">

              <div className="mb-5 text-center">

                <CreditCard className="mx-auto mb-3 h-10 w-10 text-[#C5A059]" />

                <h3 className="text-lg font-bold">
                  Card Terminal
                </h3>

                <p className="mt-1 text-sm text-[#777777]">
                  Amount $
                  {activeCardCharge?.toFixed(
                    2
                  )}
                </p>

              </div>

              <div className="grid grid-cols-2 gap-3">

                <button
                  type="button"
                  onClick={() =>
                    void handleTerminalOutcome(
                      'approved'
                    )
                  }
                  className="rounded-xl bg-green-700 py-3 font-bold text-white hover:bg-green-600"
                >
                  Approved
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void handleTerminalOutcome(
                      'declined'
                    )
                  }
                  className="rounded-xl bg-red-800 py-3 font-bold text-white hover:bg-red-700"
                >
                  Declined
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void handleTerminalOutcome(
                      'timeout'
                    )
                  }
                  className="rounded-xl border border-[#333333] bg-[#191919] py-3 font-bold text-[#D0D0D0]"
                >
                  Timeout
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void handleTerminalOutcome(
                      'cancelled'
                    )
                  }
                  className="rounded-xl border border-[#333333] bg-[#191919] py-3 font-bold text-[#D0D0D0]"
                >
                  Cancel
                </button>

              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
