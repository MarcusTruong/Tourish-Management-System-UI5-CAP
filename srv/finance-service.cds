using tourish.management as tm from '../db/schema';

service FinanceService @(path: '/finance-service') {
  // Các thực thể cho phép truy cập qua service này
  entity FinancialReports as projection on tm.FinancialReport;
  entity BankAccounts as projection on tm.BankAccount;
  entity SupplierDebts as projection on tm.SupplierDebt;
  entity Receipts as projection on tm.Receipt;

  // Action để tạo báo cáo tài chính
  @(requires: ['admin', 'staff'])
  action createFinancialReport(
    reportType: String,
    reportDate: Date,
    details: String
  ) returns {
    ID: UUID;
    ReportType: String(50);
    ReportDate: Date;
    Details: String(1000);
  };

  // Action để tạo và quản lý tài khoản ngân hàng
  @(requires: ['admin', 'staff'])
  action createBankAccount(
    accountID: String,
    bankName: String,
    accountNumber: String,
    balance: Decimal,
    lastUpdatedDate: Date
  ) returns {
    ID: UUID;
    AccountID: String(50);
    BankName: String(100);
    AccountNumber: String(20);
    Balance: Decimal(15,2);
    LastUpdatedDate: Date;
  };

  // Action để cập nhật số dư tài khoản ngân hàng
  @(requires: ['admin', 'staff'])
  action updateBankAccountBalance(
    bankAccountID: UUID,
    newBalance: Decimal,
    lastUpdatedDate: Date
  ) returns {
    ID: UUID;
    AccountID: String(50);
    BankName: String(100);
    AccountNumber: String(20);
    Balance: Decimal(15,2);
    LastUpdatedDate: Date;
  };

  // Action để tạo phiếu thu chi
  @(requires: ['admin', 'staff'])
  action createReceipt(
    type: String,
    amount: Decimal,
    date: Date,
    description: String
  ) returns {
    ID: UUID;
    Type: String(10);
    Amount: Decimal(15,2);
    Date: Date;
    Description: String(500);
  };

  // Action để quản lý công nợ
  @(requires: ['admin', 'staff'])
  action trackCustomerDebt(
    customerID: UUID,
    orderID: UUID,
    amount: Decimal,
    dueDate: Date
  ) returns {
    customerID: UUID;
    orderID: UUID;
    totalDebt: Decimal(15,2);
    dueDate: Date;
    status: String;
  };

  // Function để tạo báo cáo doanh thu theo khoảng thời gian
  @(requires: ['admin', 'staff'])
  function generateRevenueReport(
    startDate: Date,
    endDate: Date
  ) returns {
    period: String;
    totalRevenue: Decimal(15,2);
    totalExpense: Decimal(15,2);
    profit: Decimal(15,2);
    details: array of {
      date: Date;
      revenue: Decimal(15,2);
      expense: Decimal(15,2);
      profit: Decimal(15,2);
    };
  };

  // Function để tạo báo cáo công nợ
  @(requires: ['admin', 'staff'])
  function generateDebtReport() returns {
    customerDebts: array of {
      customerID: UUID;
      customerName: String;
      totalDebt: Decimal(15,2);
      dueDate: Date;
    };
    supplierDebts: array of {
      supplierID: UUID;
      supplierName: String;
      amount: Decimal(15,2);
      dueDate: Date;
      status: String;
    };
  };

  // Function để tạo báo cáo thu chi
  @(requires: ['admin', 'staff'])
  function generateCashFlowReport(
    startDate: Date,
    endDate: Date
  ) returns {
    totalIncome: Decimal(15,2);
    totalExpense: Decimal(15,2);
    netCashFlow: Decimal(15,2);
    transactions: array of {
      ID: UUID;
      Type: String(10);
      Amount: Decimal(15,2);
      Date: Date;
      Description: String(500);
    };
  };

  // Function để lấy tổng quan tài chính
  @(requires: ['admin', 'staff'])
  function getFinancialOverview() returns {
    totalRevenue: Decimal(15,2);
    totalExpense: Decimal(15,2);
    profit: Decimal(15,2);
    pendingPayments: Decimal(15,2);
    pendingDebts: Decimal(15,2);
    bankAccounts: array of {
      ID: UUID;
      BankName: String(100);
      AccountNumber: String(20);
      Balance: Decimal(15,2);
    };
  };

  // Function để lấy danh sách phiếu thu chi
  @(requires: ['admin', 'staff'])
  function getReceiptsList(
    type: String,
    startDate: Date,
    endDate: Date
  ) returns array of {
    ID: UUID;
    Type: String(10);
    Amount: Decimal(15,2);
    Date: Date;
    Description: String(500);
  };
}