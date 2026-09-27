-- ============================================================================
-- 377 SPIRITS POS PLATFORM - PRODUCTION DATABASE DEFINITION
-- Target RDBMS: Microsoft SQL Server 2022 / Azure SQL Database & PostgreSQL
-- Version: 1.0.0 Production Release
-- Compatible with ASP.NET Core 8 Entity Framework Core & Node.js Microservices
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. USERS & OPERATORS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE Users (
    UserId NVARCHAR(64) NOT NULL PRIMARY KEY,
    Name NVARCHAR(128) NOT NULL,
    Email NVARCHAR(256) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(512) NULL,
    Pin NVARCHAR(8) NOT NULL, -- 4-digit rapid switch PIN
    Role NVARCHAR(32) NOT NULL DEFAULT 'Cashier', -- 'Admin', 'Manager', 'Cashier'
    Active BIT NOT NULL DEFAULT 1,
    AvatarUrl NVARCHAR(512) NULL,
    CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    LastLoginAt DATETIMEOFFSET NULL,
    UpdatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
);

-- Index for PIN-based cashier login & terminal lock
CREATE INDEX IX_Users_Pin_Active ON Users (Pin, Active);
CREATE INDEX IX_Users_Role ON Users (Role);

-- ----------------------------------------------------------------------------
-- 2. USER ACTIVITIES & COMPLIANCE AUDIT TRAIL TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE UserActivities (
    ActivityId NVARCHAR(64) NOT NULL PRIMARY KEY,
    UserId NVARCHAR(64) NOT NULL,
    UserName NVARCHAR(128) NOT NULL,
    UserRole NVARCHAR(32) NOT NULL,
    Action NVARCHAR(64) NOT NULL, -- 'USER_LOGIN', 'ORDER_CREATED', 'BARCODE_SCAN', 'DRAWER_OPENED', 'PRICE_OVERRIDE', 'VOID', 'REFUND'
    TargetType NVARCHAR(64) NOT NULL, -- 'order', 'product', 'inventory', 'user', 'drawer', 'check', 'settings'
    TargetId NVARCHAR(128) NULL,
    Details NVARCHAR(MAX) NOT NULL,
    OldValue NVARCHAR(MAX) NULL,
    NewValue NVARCHAR(MAX) NULL,
    IpAddress NVARCHAR(64) NULL,
    DeviceId NVARCHAR(64) NULL,
    TerminalId NVARCHAR(64) NULL,
    MetadataJson NVARCHAR(MAX) NULL,
    Timestamp DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT FK_UserActivities_Users FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE NO ACTION
);

CREATE INDEX IX_UserActivities_UserId_Timestamp ON UserActivities (UserId, Timestamp DESC);
CREATE INDEX IX_UserActivities_Action_Timestamp ON UserActivities (Action, Timestamp DESC);
CREATE INDEX IX_UserActivities_TargetType ON UserActivities (TargetType, TargetId);

-- ----------------------------------------------------------------------------
-- 3. CATEGORIES & TAX CLASSIFICATION
-- ----------------------------------------------------------------------------
CREATE TABLE Categories (
    CategoryId NVARCHAR(64) NOT NULL PRIMARY KEY,
    Name NVARCHAR(128) NOT NULL,
    Slug NVARCHAR(64) NOT NULL UNIQUE,
    DisplayOrder INT NOT NULL DEFAULT 0,
    Active BIT NOT NULL DEFAULT 1,
    ParentId NVARCHAR(64) NULL,
    AgeRestricted BIT NOT NULL DEFAULT 1,
    MinimumAge INT NOT NULL DEFAULT 21,
    DefaultTaxRate DECIMAL(6, 4) NOT NULL DEFAULT 0.0825,
    CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT FK_Categories_Parent FOREIGN KEY (ParentId) REFERENCES Categories(CategoryId) ON DELETE NO ACTION
);

-- ----------------------------------------------------------------------------
-- 4. BRANDS & DISTILLERIES
-- ----------------------------------------------------------------------------
CREATE TABLE Brands (
    BrandId NVARCHAR(64) NOT NULL PRIMARY KEY,
    Name NVARCHAR(128) NOT NULL UNIQUE,
    Country NVARCHAR(64) NULL,
    Description NVARCHAR(512) NULL,
    Active BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
);

-- ----------------------------------------------------------------------------
-- 5. PRODUCTS & INVENTORY MASTER
-- ----------------------------------------------------------------------------
CREATE TABLE Products (
    ProductId NVARCHAR(64) NOT NULL PRIMARY KEY,
    Name NVARCHAR(256) NOT NULL,
    Sku NVARCHAR(64) NOT NULL UNIQUE,
    Barcode NVARCHAR(64) NOT NULL, -- Primary UPC / EAN
    CategoryId NVARCHAR(64) NOT NULL,
    BrandId NVARCHAR(64) NULL,
    Price DECIMAL(18, 2) NOT NULL,
    CostPrice DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    TaxRate DECIMAL(6, 4) NOT NULL DEFAULT 0.0825,
    Size NVARCHAR(64) NOT NULL DEFAULT '750 mL',
    Proof DECIMAL(6, 2) NULL,
    ABV DECIMAL(6, 2) NULL,
    StockQuantity INT NOT NULL DEFAULT 0,
    LowStockThreshold INT NOT NULL DEFAULT 5,
    Aisle NVARCHAR(32) NULL,
    ShelfLocation NVARCHAR(64) NULL,
    ImageUrl NVARCHAR(1024) NULL,
    Description NVARCHAR(MAX) NULL,
    Active BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    UpdatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT FK_Products_Categories FOREIGN KEY (CategoryId) REFERENCES Categories(CategoryId),
    CONSTRAINT FK_Products_Brands FOREIGN KEY (BrandId) REFERENCES Brands(BrandId)
);

-- Ultra-fast barcode search index for scanner hardware
CREATE INDEX IX_Products_Barcode ON Products (Barcode);
CREATE INDEX IX_Products_Sku ON Products (Sku);
CREATE INDEX IX_Products_Category_Active ON Products (CategoryId, Active);

-- Multi-Barcode Support (Cases, Packs, Alternate UPCs)
CREATE TABLE ProductBarcodes (
    BarcodeId NVARCHAR(64) NOT NULL PRIMARY KEY,
    ProductId NVARCHAR(64) NOT NULL,
    Barcode NVARCHAR(64) NOT NULL,
    PackQuantity INT NOT NULL DEFAULT 1,
    Description NVARCHAR(128) NULL,
    IsPrimary BIT NOT NULL DEFAULT 0,
    CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT FK_ProductBarcodes_Products FOREIGN KEY (ProductId) REFERENCES Products(ProductId) ON DELETE CASCADE
);

CREATE INDEX IX_ProductBarcodes_Barcode ON ProductBarcodes (Barcode);

-- ----------------------------------------------------------------------------
-- 6. CUSTOMERS & AGE VERIFICATION
-- ----------------------------------------------------------------------------
CREATE TABLE Customers (
    CustomerId NVARCHAR(64) NOT NULL PRIMARY KEY,
    Name NVARCHAR(128) NOT NULL,
    Phone NVARCHAR(32) NOT NULL UNIQUE,
    Email NVARCHAR(256) NULL,
    LoyaltyPoints INT NOT NULL DEFAULT 0,
    StoreCreditBalance DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    DriverLicenseNumber NVARCHAR(64) NULL,
    DateOfBirth DATE NULL,
    AgeVerified BIT NOT NULL DEFAULT 0,
    Notes NVARCHAR(MAX) NULL,
    CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    UpdatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
);

CREATE INDEX IX_Customers_Phone ON Customers (Phone);

-- ----------------------------------------------------------------------------
-- 7. ORDERS & TRANSACTIONS
-- ----------------------------------------------------------------------------
CREATE TABLE Orders (
    OrderId NVARCHAR(64) NOT NULL PRIMARY KEY,
    OrderNumber NVARCHAR(32) NOT NULL UNIQUE,
    CashierId NVARCHAR(64) NOT NULL,
    CashierName NVARCHAR(128) NOT NULL,
    CustomerId NVARCHAR(64) NULL,
    TerminalId NVARCHAR(64) NOT NULL DEFAULT 'POS-TERM-01',
    ShiftId NVARCHAR(64) NULL,
    Subtotal DECIMAL(18, 2) NOT NULL,
    DiscountTotal DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    TaxTotal DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    GrandTotal DECIMAL(18, 2) NOT NULL,
    Status NVARCHAR(32) NOT NULL DEFAULT 'completed', -- 'completed', 'voided', 'refunded', 'held'
    PaymentMethod NVARCHAR(32) NOT NULL, -- 'cash', 'card', 'split', 'contactless'
    CardBrand NVARCHAR(32) NULL,
    CardLast4 NVARCHAR(8) NULL,
    AuthCode NVARCHAR(64) NULL,
    ProcessorTxId NVARCHAR(128) NULL,
    AmountTendered DECIMAL(18, 2) NULL,
    ChangeGiven DECIMAL(18, 2) NULL,
    VoidReason NVARCHAR(256) NULL,
    VoidedBy NVARCHAR(64) NULL,
    CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    UpdatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT FK_Orders_Cashier FOREIGN KEY (CashierId) REFERENCES Users(UserId),
    CONSTRAINT FK_Orders_Customer FOREIGN KEY (CustomerId) REFERENCES Customers(CustomerId)
);

CREATE INDEX IX_Orders_OrderNumber ON Orders (OrderNumber);
CREATE INDEX IX_Orders_Cashier_CreatedAt ON Orders (CashierId, CreatedAt DESC);
CREATE INDEX IX_Orders_Status_CreatedAt ON Orders (Status, CreatedAt DESC);

-- ----------------------------------------------------------------------------
-- 8. ORDER LINE ITEMS
-- ----------------------------------------------------------------------------
CREATE TABLE OrderItems (
    OrderItemId NVARCHAR(64) NOT NULL PRIMARY KEY,
    OrderId NVARCHAR(64) NOT NULL,
    ProductId NVARCHAR(64) NOT NULL,
    ProductName NVARCHAR(256) NOT NULL,
    Sku NVARCHAR(64) NOT NULL,
    Quantity INT NOT NULL,
    UnitPrice DECIMAL(18, 2) NOT NULL,
    CostPrice DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    DiscountAmount DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    TaxRate DECIMAL(6, 4) NOT NULL DEFAULT 0.0825,
    LineTotal DECIMAL(18, 2) NOT NULL,
    AgeVerificationBypassReason NVARCHAR(128) NULL,
    CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT FK_OrderItems_Orders FOREIGN KEY (OrderId) REFERENCES Orders(OrderId) ON DELETE CASCADE,
    CONSTRAINT FK_OrderItems_Products FOREIGN KEY (ProductId) REFERENCES Products(ProductId)
);

CREATE INDEX IX_OrderItems_OrderId ON OrderItems (OrderId);
CREATE INDEX IX_OrderItems_ProductId ON OrderItems (ProductId);

-- ----------------------------------------------------------------------------
-- 9. CASHIER SHIFTS & TILL RECONCILIATION
-- ----------------------------------------------------------------------------
CREATE TABLE Shifts (
    ShiftId NVARCHAR(64) NOT NULL PRIMARY KEY,
    CashierId NVARCHAR(64) NOT NULL,
    CashierName NVARCHAR(128) NOT NULL,
    TerminalId NVARCHAR(64) NOT NULL DEFAULT 'POS-TERM-01',
    Status NVARCHAR(32) NOT NULL DEFAULT 'open', -- 'open', 'closed', 'paused'
    StartingCash DECIMAL(18, 2) NOT NULL DEFAULT 200.00,
    EndingCash DECIMAL(18, 2) NULL,
    ExpectedCash DECIMAL(18, 2) NULL,
    Variance DECIMAL(18, 2) NULL,
    TotalCashSales DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    TotalCardSales DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    TotalDrops DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    TotalPayOuts DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    OpenedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    ClosedAt DATETIMEOFFSET NULL,
    Notes NVARCHAR(MAX) NULL,
    CONSTRAINT FK_Shifts_Cashier FOREIGN KEY (CashierId) REFERENCES Users(UserId)
);

CREATE INDEX IX_Shifts_Cashier_Status ON Shifts (CashierId, Status);

CREATE TABLE ShiftCashMovements (
    MovementId NVARCHAR(64) NOT NULL PRIMARY KEY,
    ShiftId NVARCHAR(64) NOT NULL,
    Type NVARCHAR(32) NOT NULL, -- 'drop', 'payout', 'float_add', 'no_sale_drawer_open'
    Amount DECIMAL(18, 2) NOT NULL,
    Reason NVARCHAR(256) NOT NULL,
    PerformedBy NVARCHAR(128) NOT NULL,
    ApprovedBy NVARCHAR(128) NULL,
    Timestamp DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT FK_ShiftCashMovements_Shifts FOREIGN KEY (ShiftId) REFERENCES Shifts(ShiftId) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- 10. CHECK CASHING MODULE
-- ----------------------------------------------------------------------------
CREATE TABLE CheckIssuers (
    IssuerId NVARCHAR(64) NOT NULL PRIMARY KEY,
    CompanyName NVARCHAR(256) NOT NULL,
    RoutingNumber NVARCHAR(32) NOT NULL,
    AccountNumber NVARCHAR(64) NOT NULL,
    Status NVARCHAR(32) NOT NULL DEFAULT 'approved', -- 'approved', 'suspicious', 'blocked'
    RiskLevel NVARCHAR(32) NOT NULL DEFAULT 'low',
    MaxSingleCheckLimit DECIMAL(18, 2) NOT NULL DEFAULT 3500.00,
    TotalCashedCount INT NOT NULL DEFAULT 0,
    CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
);

CREATE TABLE CheckCashingTransactions (
    TransactionId NVARCHAR(64) NOT NULL PRIMARY KEY,
    TransactionNumber NVARCHAR(32) NOT NULL UNIQUE,
    CustomerId NVARCHAR(64) NOT NULL,
    IssuerId NVARCHAR(64) NULL,
    CheckNumber NVARCHAR(32) NOT NULL,
    RoutingNumber NVARCHAR(32) NOT NULL,
    AccountNumber NVARCHAR(64) NOT NULL,
    MakerName NVARCHAR(256) NOT NULL,
    PayeeName NVARCHAR(256) NOT NULL,
    CheckAmount DECIMAL(18, 2) NOT NULL,
    FeeAmount DECIMAL(18, 2) NOT NULL,
    NetPayout DECIMAL(18, 2) NOT NULL,
    CashierId NVARCHAR(64) NOT NULL,
    Status NVARCHAR(32) NOT NULL DEFAULT 'completed', -- 'completed', 'flagged', 'voided', 'deposited'
    FrontImageUrl NVARCHAR(1024) NULL,
    BackImageUrl NVARCHAR(1024) NULL,
    CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT FK_CheckCashing_Customer FOREIGN KEY (CustomerId) REFERENCES Customers(CustomerId),
    CONSTRAINT FK_CheckCashing_Cashier FOREIGN KEY (CashierId) REFERENCES Users(UserId)
);

-- ----------------------------------------------------------------------------
-- 11. INVENTORY ADJUSTMENTS & RECEIVING
-- ----------------------------------------------------------------------------
CREATE TABLE InventoryAdjustments (
    AdjustmentId NVARCHAR(64) NOT NULL PRIMARY KEY,
    ProductId NVARCHAR(64) NOT NULL,
    OldQuantity INT NOT NULL,
    NewQuantity INT NOT NULL,
    ChangeAmount INT NOT NULL,
    Type NVARCHAR(32) NOT NULL, -- 'sale', 'receive', 'damaged', 'missing', 'recount', 'cycle_count'
    Reason NVARCHAR(256) NOT NULL,
    UserId NVARCHAR(64) NOT NULL,
    CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT FK_InventoryAdjustments_Products FOREIGN KEY (ProductId) REFERENCES Products(ProductId),
    CONSTRAINT FK_InventoryAdjustments_Users FOREIGN KEY (UserId) REFERENCES Users(UserId)
);

-- ----------------------------------------------------------------------------
-- 12. INITIAL SEED DATA (CORE USERS & SYSTEM CONFIGURATION)
-- ----------------------------------------------------------------------------
INSERT INTO Users (UserId, Name, Email, Role, Pin, Active, CreatedAt) VALUES
('usr-1', 'Sarah Connor (Admin)', 'admin@pos.local', 'Admin', '9999', 1, SYSDATETIMEOFFSET()),
('usr-2', 'Marcus Rivera (Manager)', 'manager@pos.local', 'Manager', '5555', 1, SYSDATETIMEOFFSET()),
('usr-3', 'Elena Rostova (Cashier)', 'cashier@pos.local', 'Cashier', '1234', 1, SYSDATETIMEOFFSET()),
('usr-4', 'David Kim (Cashier)', 'david@pos.local', 'Cashier', '2345', 1, SYSDATETIMEOFFSET());

INSERT INTO Categories (CategoryId, Name, Slug, DisplayOrder, Active, AgeRestricted, MinimumAge, DefaultTaxRate) VALUES
('cat-1', 'Whiskey & Bourbon', 'whiskey', 1, 1, 1, 21, 0.0825),
('cat-2', 'Tequila & Mezcal', 'tequila', 2, 1, 1, 21, 0.0825),
('cat-3', 'Vodka & Gin', 'vodka-gin', 3, 1, 1, 21, 0.0825),
('cat-4', 'Wine & Champagne', 'wine', 4, 1, 1, 18, 0.0825),
('cat-5', 'Beer & Seltzer', 'beer', 5, 1, 1, 21, 0.0825),
('cat-6', 'Craft & Local', 'craft-local', 6, 1, 1, 21, 0.0825),
('cat-7', 'Mixers', 'mixers', 7, 1, 0, 0, 0.0825),
('cat-8', 'Accessories', 'accessories', 8, 1, 0, 0, 0.0825),
('cat-9', 'Lotto', 'lotto', 9, 1, 1, 18, 0.0000);

-- Initial audit log record for programmer / creator traceability
INSERT INTO UserActivities (ActivityId, UserId, UserName, UserRole, Action, TargetType, TargetId, Details, Timestamp) VALUES
('act-init-01', 'usr-1', 'Sarah Connor (Admin)', 'Admin', 'SYSTEM_INITIALIZATION', 'system', 'db-v1', 'Production relational database schema initialized with tables and security rules.', SYSDATETIMEOFFSET());
