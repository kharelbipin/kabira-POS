// Global physical barcode scanner keypress listener (DV-04)
useEffect(() => {
  let buffer = '';
  let lastKeyTime = Date.now();

  const handleKeyDown = (e: KeyboardEvent) => {
    // Do not trigger POS shortcuts or barcode buffering while the
    // cashier is actively typing/editing inside a form control.
    const target = e.target as HTMLElement | null;

    const isTypingTarget = Boolean(
      target?.closest(
        'input, textarea, select, [contenteditable="true"]'
      )
    );

    if (isTypingTarget) {
      return;
    }

    // ----------------------------------------------------------
    // POS KEYBOARD SHORTCUTS
    // ----------------------------------------------------------
    // F3 = Scan
    // F4 = Add Item
    // F6 = Lotto Sale
    // F7 = Lotto Payout
    // F8 = Open Drawer
    // F9 = Complete Checkout
    // ----------------------------------------------------------

    if (e.key === 'F3') {
      e.preventDefault();

      if (onOpenScannerModal) {
        onOpenScannerModal();
      }

      return;
    }

    if (e.key === 'F4') {
      e.preventDefault();

      setShowAddManualModal(true);

      return;
    }

    if (e.key === 'F6') {
      e.preventDefault();

      setShowLottoSaleModal(true);

      return;
    }

    if (e.key === 'F7') {
      e.preventDefault();

      setShowLottoPayoutModal(true);

      return;
    }

    if (e.key === 'F8') {
      e.preventDefault();

      setShowManualDrawerModal(true);

      return;
    }

    if (e.key === 'F9') {
      e.preventDefault();

      if (cartItems.length > 0) {
        onProceedToCheckout();
      }

      return;
    }

    // ----------------------------------------------------------
    // PHYSICAL USB BARCODE SCANNER BUFFER
    // ----------------------------------------------------------

    const currentTime = Date.now();

    // Normal human typing has larger gaps.
    // Scanner input arrives extremely quickly.
    if (currentTime - lastKeyTime > 150) {
      buffer = '';
    }

    lastKeyTime = currentTime;

    if (e.key === 'Enter') {
      if (buffer.length >= 4) {
        e.preventDefault();

        handleDirectBarcodeScan(buffer);

        buffer = '';
      }

      return;
    }

    if (e.key.length === 1) {
      buffer += e.key;
    }
  };

  window.addEventListener(
    'keydown',
    handleKeyDown
  );

  return () => {
    window.removeEventListener(
      'keydown',
      handleKeyDown
    );
  };
}, [
  products,
  cartItems,
  onOpenScannerModal,
  onProceedToCheckout,
]);
