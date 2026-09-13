Modern Retail POS System

A modern, multi-store Point of Sale platform designed for retail
businesses, with special support for liquor-store operations, online
ordering, real-time inventory, AI-assisted receiving and shelf counting,
check cashing, customer loyalty, mobile workflows, hardware integration,
and centralized management.

Project status: In development
Architecture: API-first, modular, cloud-connected,
offline-capable
Primary stack: ASP.NET Core 8, Angular, SQL Server / Azure SQL

1. Project Vision

The goal of this project is to build one connected business platform
instead of separate systems for the register, inventory, website,
customers, check cashing, reporting, and store management.

The POS register, online store, manager portal, employee mobile
workflows, customer mobile pages, and local hardware bridge use shared
backend services and business rules. The backend remains the source of
truth for products, pricing, inventory, orders, customers, permissions,
payments, and audit history.

The system is designed around four principles:

Fast at the register - common checkout actions require minimal
employee interaction.

Safe by design - financial, inventory, payment, and
sensitive-data changes use controlled workflows, permissions, and
audit trails.

Connected everywhere - POS, website, mobile, inventory, and
management operate from the same business data.

Exception driven - automation handles normal work while unusual
activity is surfaced for employee or manager review.

2. Main Applications

The platform is composed of several connected experiences:

POS Register

Touch-first checkout application for Windows desktops and tablets with
barcode scanning, product search, categories, customer lookup,
discounts, payments, receipts, holds, returns, shifts, drawer
management, check cashing, and operational shortcuts.

Manager / Admin Portal

Central management application for products, pricing, inventory, users,
permissions, stores, registers, devices, vendors, purchase orders,
website, promotions, customers, loyalty, reports, check cashing, audit
history, and system health.

Online Store

Customer-facing eCommerce site using the same product catalog, pricing
rules, promotions, inventory engine, customer records, loyalty system,
and order service as the POS.

Employee Mobile Experience

Mobile workflows for inventory counts, shelf photography, receiving,
restocking, task completion, manager approvals, queue busting, and other
authorized store operations.

Customer Mobile Web

No-app mobile workflows opened through secure short-lived QR codes for
use cases such as check-cashing document upload, cart handoff, order
information, and secure processor-hosted payments.

POS Bridge

Local service that securely connects cloud/backend services to store
hardware such as receipt printers, cash drawers, barcode scanners,
customer displays, label printers, scales, and supported payment
terminals.

3. Recommended Technology Stack

Frontend

Angular

TypeScript

HTML5 / CSS

Responsive touch-first UI

Progressive Web App capabilities where useful

SignalR/WebSocket updates for real-time register events

Backend

ASP.NET Core 8 Web API

C#

Entity Framework Core

REST APIs

Background workers for asynchronous operations

Optional event-driven processing through Azure Service Bus

Data

SQL Server or Azure SQL

SQLite for local POS Bridge queues/cache where required

Azure Blob Storage or equivalent protected object storage for
product/document images

Redis or equivalent distributed cache where justified

Infrastructure

Azure App Service, containers, or AKS depending on scale

Docker

Azure DevOps CI/CD

Application Insights

Serilog

Centralized configuration and secrets management

4. High-Level Architecture

Windows POS ─────────────┐
Tablet / Mobile ─────────┤
Manager Portal ──────────┤
Online Store ────────────┼──> ASP.NET Core API / Services
Customer Mobile Web ─────┤              │
                         │              ├── Catalog
                         │              ├── Pricing & Promotions
                         │              ├── Inventory
                         │              ├── Orders
                         │              ├── Customers & Loyalty
                         │              ├── Payments
                         │              ├── Check Cashing
                         │              ├── Reporting
                         │              ├── Notifications
                         │              └── Identity / Audit
                         │
                         └── POS Bridge ──> Local Store Hardware

ASP.NET Core Services
        │
        ├── SQL Server / Azure SQL
        ├── Protected Object Storage
        ├── Payment Provider
        ├── Email / SMS Provider
        ├── Accounting / ERP Integrations
        └── Optional Event Bus

The website and POS must not maintain independent copies of
business-critical inventory or order data. Both channels use the same
backend services.

5. POS Register

The primary register is designed for speed and touch operation.

Main Navigation

POS Register

Orders

Shifts & Drawer

Customers

Inventory

Check Cashing

Reports

More

Settings

Checkout Functions

Barcode scan

Product search

Category filtering

Add/remove item

Change quantity

Price check

Customer lookup

Discounts and promotions

Hold/resume order

Clear order

Split payment

Receipt printing

Digital receipt

Last receipt

Returns/refunds

Open Drawer with permission

Lotto sale/payout where enabled

Customer-facing display

6. Unified Product Catalog

A product is shared across POS, online store, inventory, purchasing,
reporting, and store mapping.

Typical product data includes:

Product ID

SKU

One or more UPC/barcodes

Product name

Brand

Description

Category / subcategory

Size / unit / pack

Cost

Regular price

Promotional price

Tax category

Images

Vendor / vendor SKU

Reorder level

Reorder quantity

Channel availability

Age/restriction configuration

Active/inactive state

Store / aisle / bay / shelf locations

Products should be deactivated instead of deleting historical
references.

7. Inventory Engine

Inventory uses a central append-oriented ledger rather than silently
changing quantity fields.

Supported movement types include:

POS Sale

Online Sale

Receiving

Customer Return

Vendor Return

Damage

Breakage

Shrink/Theft

Physical Count Adjustment

Store Transfer

Location Transfer

Reservation

Reservation Release

Manual Adjustment

Reversal

Every movement records the product, store, location, quantity, reason,
reference transaction, employee/system identity, and timestamp.

Available to Sell

A configurable formula is used for online and omnichannel availability:

Available to Sell =
On Hand
- Reserved Online
- Reserved Pickup
- Safety Stock

Reservations must be atomic so the last available unit cannot be
successfully sold to two customers.

8. AI-Assisted Inventory

AI assists employees but does not silently control inventory.

Visual Shelf Counter

Employees can photograph shelves and allow the system to propose:

Product identity

Brand

Size

Package type

Visible quantity

Shelf position

Unknown products

Empty locations

Possible misplaced products

Confidence scores

Required workflow:

Capture
→ AI Analysis
→ Proposed Count
→ Employee Review
→ Variance Review
→ Manager Approval when required
→ Confirm
→ Inventory Ledger Transaction

A photo or AI result must never directly overwrite inventory without the
configured confirmation workflow.

AI Invoice Receiving

Vendor invoices can be photographed or uploaded. OCR can extract vendor,
invoice number, product lines, quantities, and costs. The system matches
lines to existing products and creates a receiving draft. Employees
review the draft before inventory is posted.

9. Visual Store Digital Twin

The system supports a digital representation of the physical store.

Location hierarchy:

Store
→ Zone
→ Aisle
→ Side
→ Bay
→ Shelf
→ Position
→ Product

Managers can draw walls, entrances, registers, aisles, shelves, coolers,
displays, end caps, storage areas, and back rooms.

The digital twin can show:

Shelf inventory

Back stock

Low-stock areas

Out-of-stock products

Areas needing counts

Inventory variances

Restocking tasks

Misplaced products

Last shelf image

Assigned employee

Last count time

Products may have multiple physical locations.

10. Smart Restocking

The system can compare shelf stock with back stock and create exact
restocking tasks.

Example:

Move 6 × Product A 750 mL
From: Back Storage
To: Aisle 3 → Side A → Bay 2 → Shelf 3

Tasks may be organized into an efficient store route and verified by
scanning the destination shelf QR.

11. Online Store & Omnichannel Commerce

The online store uses the same backend as the POS.

Core functions include:

Shared catalog

Real-time available-to-sell inventory

Online-specific product availability

Pickup

Local delivery

Guest checkout

Customer accounts

Promotions

Loyalty

Bundles

Product substitutions

Digital receipts

Order tracking

Cart handoff to register

Website cart QR

Online order notifications at POS

Store-specific availability

Safety stock

Website content management

Website/system health monitoring

Online orders flow into the same Order Service used by the POS.

12. Orders

Supported channels may include:

POS

Website

Mobile

Queue Busting

Self Checkout

Phone Order

Typical order lifecycle:

Created
→ Payment Pending
→ Confirmed
→ Preparing
→ Ready
→ Completed

Additional states may include:

On Hold

Cancelled

Payment Failed

Refunded

Partially Refunded

Out for Delivery

Delivered

All meaningful status transitions are validated and audited.

13. Payments

The payment layer is provider-integrated and tokenized. Raw card
information must not be stored by the POS application.

Supported Payment Experiences

EMV payment terminal

Contactless payment

Tap to Pay on an authorized phone when supported by the processor

Customer QR payment

Customer self-enter card workflow using processor-hosted secure
fields/page

Authorized cashier manual card entry using processor-approved secure
components

Cash

Gift card

Store credit

Split tender where supported

Mobile Card Fallback

When the primary card terminal has a hardware or communication problem,
the POS can create a short-lived payment session.

Checkout
→ Card
→ Terminal Problem
→ Mobile Payment Fallback
→ Generate One-Time QR
→ Authorized Phone / Customer Phone
→ Processor-Hosted Payment Experience
→ Provider Authorization
→ Backend Verification
→ POS Updated in Real Time
→ Complete Order

The QR contains an opaque payment-session token, not card information or
PII.

A card decline must not be treated as a terminal failure.

The system must not store full PAN, CVV, PIN, magnetic-stripe track
data, or photographs of payment cards. Offline card handling is
permitted only through capabilities explicitly supported by the
configured payment processor.

14. Check Cashing Management

Check cashing is an integrated POS module rather than a disconnected
application.

Customer Profile

The system can maintain permitted check-cashing information such as:

Customer history

Previous checks

Total cashed

Returned/NSF history

Recovery history

Notes

Internal review flags

Protected ID references and images according to policy

Customer QR Intake

The cashier can generate a short-lived QR code. The customer scans it
with a normal phone camera and opens a secure mobile webpage without
installing an app.

Possible workflow:

Start Transaction
→ Generate QR
→ Customer Consent
→ ID Front
→ ID Back
→ Check Front
→ Check Back
→ Submit
→ OCR / Verification
→ Cashier Review
→ Manager Review when required
→ Fee Calculation
→ Approval
→ Payout

Advanced Check Verification

Verification can run multiple checks in parallel:

Image quality

ID OCR

Check OCR

Field-level confidence

Numeric vs written amount comparison

ID-to-payee comparison

Customer history

Issuer history

Exact duplicate detection

Near-duplicate/image fingerprint detection

Amount anomaly detection

Transaction velocity

Check age

Known issuer template comparison

Possible document inconsistency indicators

External verification where configured

Dynamic business rules

AI and automated signals assist the reviewer. They should not make
unsupported definitive fraud claims.

Dynamic Review

Example:

LOW
→ Cashier Review

MEDIUM
→ Supervisor Review

HIGH
→ Manager + Additional Verification

CRITICAL RULE
→ Hold

Risk/review rules are configurable and versioned.

Check Lifecycle

Draft
→ Captured
→ Processing
→ Needs Review
→ Approved
→ Paid
→ Deposited
→ Cleared

Exception states include:

Hold

Declined

Returned / NSF

Voided

Recovery Pending

Recovered

Deposit & Recovery

The module supports:

Deposit batches

Batch totals

Deposit proof/reference

Cleared status

Returned checks

Customer/issuer history updates

Recovery cases

Partial recovery

Recovery timeline

Daily reconciliation

Fee/profitability reporting

Sensitive data must be encrypted/masked and access must be
permission-controlled and audited.

15. Customer & Loyalty

The same customer profile can be used across POS and online channels
where appropriate.

Functions include:

Customer lookup

Purchase history

Loyalty enrollment

Loyalty earning

Loyalty redemption

Customer-specific offers

Digital receipts

Store credit

Gift cards

Customer wallet

Saved carts

Online account

Special orders

Product requests / waitlists

16. Promotions & Bundles

The pricing engine should run on the backend so the POS and website
calculate the same result.

Supported promotion concepts may include:

Product discount

Category discount

Brand promotion

Quantity discount

Buy X Get Y

Mix & Match

Coupon

Minimum-spend offer

Scheduled promotion

Store-specific promotion

Channel-specific promotion

Customer-tier promotion

Fixed-price bundle

Bundle example:

Party Bundle
1 eligible bottle
+ 2 eligible mixers
+ 1 eligible accessory
= configured bundle price

Margin-protection rules can warn or block unauthorized promotions below
configured thresholds.

17. Vendors, Purchase Orders & Receiving

Vendor management includes:

Vendor profiles

Vendor-specific product mapping

Vendor SKU

Cost history

Purchase orders

Suggested purchase orders

Approval thresholds

Partial receiving

Invoice matching

AI invoice OCR

Cost-change alerts

Receiving history

Purchase order lifecycle:

Draft
→ Pending Approval
→ Approved
→ Sent
→ Partially Received
→ Received

18. Shifts & Cash Drawer

Shift management includes:

Start shift

Starting cash

Resume current shift

Running shift totals

Cash sales/refunds/payouts

Cash drops

Controlled drawer opens

Closing count

Denomination count

Blind count option

Expected cash

Over/short calculation

Variance reason

Manager approval

Shift report

Print/export/email where configured

Manual Open Drawer requires permission and is audited.

19. Employee Tasks

Managers can create or automatically generate tasks for:

Restocking

Cycle counting

Receiving

Order preparation

Price verification

Shelf inspection

Device checks

Other store operations

Tasks support assignment, priority, due time, store location, status,
notes, and optional photo proof.

20. Reporting & Manager Command Center

Reports can combine all sales channels and operational modules.

Examples:

Sales

Gross margin

Inventory

Inventory variance

Shrink

Product performance

Employee activity

Promotions

Online sales

Order fulfillment

Customer/loyalty

Vendor purchasing

Check cashing

Check returns

Check recovery

Shift/drawer

Device/system health

The Manager Command Center focuses on exceptions such as:

Low stock

Large inventory variance

Delayed order

Pending approval

Register offline

Printer failure

Website/payment degradation

Drawer variance

Returned check

Vendor cost increase

21. Operational Health

The platform should expose current health for important dependencies.

Internet
Backend API
Database
Payment Provider
Payment Terminal
Online Store
Inventory Synchronization
POS Bridge
Receipt Printer
Label Printer
Barcode Scanner
Cash Drawer
Customer Display
Register Client
Document Storage
OCR Service
Notification Service

Possible states:

Healthy
Degraded
Offline
Unknown

Authorized users can access safe diagnostics and remote register
controls.

22. Remote Register Management

Authorized administrators can:

View register status

Configure register name

Map devices

Configure printers

Enable/disable features

Place a register in maintenance mode

Disable/enable a register

Review synchronization status

Run safe diagnostics

Manage update channels

Remote actions must not silently interrupt an active payment or sale
except through an explicit emergency process.

23. Offline Operation & Synchronization

The POS should remain useful during temporary connectivity problems
where business and payment rules allow it.

Local operations can use a secure queue and synchronize after
connectivity returns.

Requirements include:

Local transaction queue

Automatic reconnection

Idempotent synchronization

Conflict detection

Clear sync status

Retry handling

Audit history

Critical financial actions must never be made unsafe merely to support
offline operation.

24. POS Bridge & Hardware

The local POS Bridge abstracts device-specific integrations.

Suggested interfaces:

IBarcodeScanner
IReceiptPrinter
ICashDrawer
IPaymentTerminal
ICustomerDisplay
ILabelPrinter
IScale

Recommended implementation:

.NET Worker Service / Windows Service

Secure localhost API or IPC

SQLite local queue/cache

Windows printing / supported ESC-POS

USB HID support

Structured logging

Automatic start

Device health monitoring

Safe update mechanism

25. Roles & Permissions

Example roles:

Cashier

Senior Cashier

Supervisor

Manager

Store Admin

Inventory Employee

Check Cashing Reviewer

Accounting

Owner

System Administrator

Permissions should be granular rather than relying only on role names.

Examples:

Discount up to configured percentage

Refund up to configured amount

Price override

Void transaction

Open drawer

Inventory adjustment

Approve inventory variance

Approve check-cashing transaction

Override check-cashing fee

Publish website changes

Manage promotions

Manage users

Remote register administration

View sensitive reports

Reveal protected fields

26. Audit Trail

Important actions must create audit records.

Recommended audit fields:

AuditId
BusinessId
StoreId
RegisterId / DeviceId
UserId
Role
Action
EntityType
EntityId
PreviousValue
NewValue
Reason
Timestamp
CorrelationId / RequestId

Audit coverage includes:

Price changes

Discounts

Refunds

Voids

Drawer opens

Inventory adjustments

Receiving

User/permission changes

Check-cashing decisions

Sensitive-data access

Payment fallback initiation

Website changes

Promotion changes

Register administration

Configuration changes

Completed financial history should not be deleted by normal employees.
Corrections should use controlled reversal or adjustment transactions.

27. Security Requirements

HTTPS/TLS for network communication

Secure authentication

Role-based authorization

Short-lived tokens where appropriate

Encryption of sensitive data at rest

Secrets stored outside source code

Protected document storage

Sensitive-field masking

Audit logging

Session timeout/re-authentication for sensitive operations

Input validation

Rate limiting where appropriate

Secure headers

Dependency/security scanning

Least-privilege service access

Backup and recovery testing

Payment Security

Payment-card data should be handled through approved processor-hosted
pages, fields, SDKs, terminals, or tokenization mechanisms. The
application must not intentionally store prohibited sensitive
authentication data.

Check-Cashing Privacy

ID images, check images, account references, and other sensitive records
require restricted access, retention controls, encryption, and access
auditing.

Compliance requirements should be configurable by jurisdiction and
reviewed with qualified payment/compliance/legal professionals before
production deployment.

28. Multi-Store Model

Core entities should support:

BusinessId
StoreId
RegisterId
DeviceId

Configuration hierarchy:

Company Default
→ Store Override
→ Register / Device Override

Multi-store capabilities include:

Shared product catalog

Store-specific inventory

Optional store-specific prices

Store-specific permissions

Inventory transfers

Central reporting

Shared permitted customer history

Cross-store operational health

Store-specific online fulfillment

29. Reliability Rules

Critical operations must be idempotent.

Examples:

Payment creation

Payment completion

Refund

Order creation

Inventory posting

Receiving

Reservation

Reservation release

Check payout

Deposit posting

A double-click, retry, timeout, message redelivery, or network reconnect
must not create duplicate financial or inventory effects.

30. Suggested Repository Structure

pos-platform/
│
├── README.md
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── database/
│   ├── user-stories/
│   ├── security/
│   └── deployment/
│
├── src/
│   ├── backend/
│   │   ├── Api/
│   │   ├── Application/
│   │   ├── Domain/
│   │   ├── Infrastructure/
│   │   └── Workers/
│   │
│   ├── pos-web/
│   ├── admin-web/
│   ├── online-store/
│   ├── mobile-web/
│   └── pos-bridge/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── api/
│   └── e2e/
│
├── deploy/
│   ├── docker/
│   ├── pipelines/
│   └── infrastructure/
│
└── scripts/

31. Suggested Backend Modules

Identity
Business
Stores
Registers
Devices
Catalog
Pricing
Promotions
Inventory
Orders
Payments
Customers
Loyalty
Vendors
Purchasing
Receiving
CheckCashing
Shifts
CashManagement
Tasks
OnlineStore
Notifications
Reporting
Audit
SystemHealth
Integrations

Start as a well-structured modular application unless scale clearly
requires independent microservices. Modules can later be extracted
behind stable APIs/events.

32. Important Domain Events

Examples:

ProductCreated
ProductUpdated
PriceChanged
PromotionChanged
InventoryAdjusted
InventoryReserved
InventoryReservationReleased
ReceivingConfirmed
OrderCreated
OrderPaid
OrderReady
OrderCompleted
PaymentAuthorized
PaymentFailed
RefundCompleted
CustomerUpdated
CheckApproved
CheckPaid
CheckDeposited
CheckReturned
RecoveryReceived
RegisterStatusChanged
DeviceStatusChanged

Events should not replace synchronous validation required to safely
complete a transaction.

33. Development Principles

Keep business rules in backend/domain services, not only in the UI.

Never trust client-calculated totals without server validation.

Keep the POS and website on the same core business services.

Use an inventory ledger for traceability.

Require confirmation before AI-generated inventory changes.

Use idempotency for critical operations.

Prefer configuration over hard-coded store rules.

Keep sensitive data out of logs.

Audit privileged and financial actions.

Design for store connectivity failures.

Keep hardware integrations behind the POS Bridge.

Preserve historical transaction values even when products/prices
later change.

Separate document/risk confidence from final human authorization.

Test failure scenarios, not only successful workflows.

34. Development Phases

Phase 1 - Core POS

Authentication and permissions

Store/register setup

Product catalog

Barcode scanning

Cart

Pricing/tax

Checkout

Basic payment integration

Receipt printing

Customer management

Shift/drawer

Inventory ledger

Basic reporting

Audit trail

Phase 2 - Inventory & Purchasing

Vendors

Purchase orders

Receiving

Transfers

Cycle counting

Reorder suggestions

AI invoice receiving

Mobile inventory workflows

Phase 3 - Omnichannel

Online store

Shared inventory

Reservations

Online payment

Pickup

Delivery

Customer accounts

Loyalty

Promotions

Bundles

Substitutions

Digital receipts

Phase 4 - Advanced Store Operations

Digital store twin

AI visual shelf counting

Restocking routes

Employee tasks

Manager command center

Remote register management

Advanced system health

Phase 5 - Check Cashing

Customer QR intake

ID/check image capture

OCR

Duplicate detection

Issuer/customer history

Dynamic verification rules

Manager review

Fee calculation

Secure payout workflow

Deposit batches

Returned checks

Recovery

Analytics

Phase 6 - Advanced Payments & Reliability

Mobile card fallback

Tap to Pay integration where supported

Customer secure QR payment

Customer self-entry

Authorized manual card entry

Offline-safe workflows

Advanced synchronization

Automatic updates

Disaster recovery

35. Testing Strategy

Unit Tests

Test pricing, promotions, taxes, inventory calculations, reservation
rules, permissions, check-cashing rules, fee calculations, and state
transitions.

Integration Tests

Test database transactions, payment adapters, object storage, event
processing, POS Bridge communication, and third-party integrations.

End-to-End Tests

Test complete workflows such as:

Scan Product → Pay → Print Receipt
Online Order → Reserve Stock → Prepare → Pickup
Receive Invoice → Review → Confirm → Inventory Update
Shelf Count → Review → Approve → Inventory Adjustment
Check Capture → Verify → Approve → Pay → Deposit
Terminal Failure → Mobile Payment Fallback → Complete Order

Failure Tests

Explicitly test:

Network loss

Database timeout

Printer offline

Payment timeout

Duplicate webhook

Double-click

Browser refresh

POS restart

Bridge restart

QR expiration

OCR failure

External verification outage

Inventory conflict

Partial receiving

Failed synchronization

36. Environment Configuration

Never commit secrets to source control.

Example environment keys:

ConnectionStrings__MainDatabase=
Jwt__Issuer=
Jwt__Audience=
Jwt__SigningKey=
Storage__ConnectionString=
Payment__Provider=
Payment__ApiKey=
Notifications__Provider=
Notifications__ApiKey=
ApplicationInsights__ConnectionString=

Use development secrets locally and a managed secrets solution in
production.

37. Local Development

A typical local development environment will require:

.NET 8 SDK
Node.js
Angular CLI
SQL Server / compatible development database
Git
Docker (recommended)

Example startup sequence:

# Backend
cd src/backend/Api
dotnet restore
dotnet ef database update
dotnet run

# POS frontend
cd src/pos-web
npm install
npm start

# Admin frontend
cd src/admin-web
npm install
npm start

# POS Bridge
cd src/pos-bridge
dotnet restore
dotnet run

Exact commands should be updated as the repository structure is
finalized.

38. Definition of Done

A feature is not considered complete until:

Functional requirements are implemented.

Authorization rules are enforced server-side.

Validation and meaningful errors are implemented.

Important actions are audited.

Unit/integration tests are added where appropriate.

Critical retry paths are idempotent.

Sensitive data is protected.

Loading/empty/error states are handled.

Mobile/touch behavior is tested where applicable.

Hardware failure behavior is tested when relevant.

Documentation is updated.

Acceptance criteria pass.

39. Future Opportunities

Potential future additions include:

Electronic shelf labels

Customer product finder using the store map

Advanced demand forecasting

Dead-stock detection

Smart markdown recommendations

Recall management

Batch/lot tracking

Expiration tracking

Automated purchase-order drafts

Vendor comparison

Promotion simulator

Customer self-scan

Pickup lockers

Advanced operational AI assistant

Natural-language business reporting

Automated manager daily brief

Additional accounting/ERP integrations

Additional payment providers

Additional multi-location controls

40. Important Notes

This README describes the intended architecture and product direction.
Individual features should have detailed user stories, acceptance
criteria, business rules, security requirements, API contracts, database
design, and test cases before implementation.

Features involving payment cards, identity documents, check cashing,
age-restricted products, privacy, taxation, or financial compliance
require additional legal, processor, security, and jurisdiction-specific
review before production use.

License

License to be determined.

Project Owner

Project owner / company name to be finalized.
