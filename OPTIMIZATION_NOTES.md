# KaBiRa POS UI Unification & Cleanup

Updated: 2026-10-04

## UI standardization
- Added one shared dark-navy KaBiRa theme for Admin, Manager, and Cashier shells.
- Dashboard colors are now the visual source of truth.
- Legacy light page backgrounds, cards, tables, form controls, and borders inherit the shared dark theme.
- Cashier secondary navigation was converted from white to dark navy.
- Cashier `Shifts & Drawer` navigation was renamed to `Cash Reconcile`.
- Manager `Shifts` navigation was renamed to `Cash Reconcile`.
- Replaced the old shift/drawer page with the once-per-business-day Daily Cash Reconciliation UI.
- Customer Display floating status/controller is mounted only for Cashier sessions, so Manager/Admin no longer show the Display 2 Connected chip. Customer-display background functionality remains available to the cashier/register.

## Cleanup
Removed unreferenced legacy components that were replaced by newer workflows:
- `src/components/inventory/ShelfCounterDirectView.tsx`
- `src/components/payment/CustomerMobilePayView.tsx`
- `src/components/payment/EmployeeTapToPayView.tsx`
- `src/components/startup/DeviceSetupWizardModal.tsx`

No server routes, database structures, payment processing, inventory APIs, or hardware bridge APIs were removed.

## Startup & package optimization
- Added route-level React lazy loading for Manager/Admin/Reports/Inventory/Orders and other non-register screens.
- Cashier register, login, and navigation remain eager for faster checkout startup.
- Production startup no longer loads Vite.
- Backend runtime packages are bundled into `dist/server.cjs`.
- Windows installer/workflow no longer ships the full `node_modules` tree.
- User/order/customer history hydrates in the background.
- Normal configured terminals show the PIN pad immediately using a setup-complete startup hint.
- Successful login uses the verified user from `/auth/login` directly instead of immediately making another `/auth/me` call.
- Server-side credential verification remains authoritative.

## Windows desktop integration
- KaBiRa POS desktop shortcut is created automatically during install.
- KaBiRa icon is used for installer, desktop shortcut, Start Menu shortcut, and uninstall entry.
