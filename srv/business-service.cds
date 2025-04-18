using tourish.management as tm from '../db/schema';

service BusinessService @(path: '/business-service') {
  // Các thực thể cho phép truy cập qua service này
  entity Customers as projection on tm.Customer;
  entity CustomerTransactionHistories as projection on tm.CustomerTransactionHistory;
  entity Contracts as projection on tm.Contract;
  entity Promotions as projection on tm.Promotion;

  // Các action cho quản lý khách hàng
  @(requires: 'authenticated-user')
  action createCustomer(
    fullName: String,
    phone: String,
    email: String,
    address: String,
    birthDay: Date,
    notes: String
  ) returns {
    ID: UUID;
    FullName: String(100);
    Phone: String(20);
    Email: String(100);
    Address: String(200);
    BirthDay: Date;
    Notes: String(500);
    TotalTransactions: Decimal(15,2);
  };

  @(requires: 'authenticated-user')
  action updateCustomer(
    customerID: UUID,
    fullName: String,
    phone: String,
    email: String,
    address: String,
    birthDay: Date,
    notes: String
  ) returns {
    ID: UUID;
    FullName: String(100);
    Phone: String(20);
    Email: String(100);
    Address: String(200);
    BirthDay: Date;
    Notes: String(500);
    TotalTransactions: Decimal(15,2);
  };

  // Các action cho quản lý hợp đồng
  @(requires: 'authenticated-user')
  action createContract(
    customerID: UUID,
    tourID: UUID,
    contractDate: Date,
    totalAmount: Decimal,
    promotionID: UUID
  ) returns {
    ID: UUID;
    CustomerID: UUID;
    TourID: UUID;
    ContractDate: Date;
    TotalAmount: Decimal(15,2);
    Status: String(20);
    PromotionID: UUID;
  };

  @(requires: 'authenticated-user')
  action updateContractStatus(
    contractID: UUID,
    status: String
  ) returns {
    ID: UUID;
    CustomerID: UUID;
    TourID: UUID;
    ContractDate: Date;
    TotalAmount: Decimal(15,2);
    Status: String(20);
    PromotionID: UUID;
  };

  // Các action cho quản lý chương trình ưu đãi
  @(requires: 'authenticated-user')
  action createPromotion(
    promotionName: String,
    description: String,
    discount: Double,
    startDate: Date,
    endDate: Date
  ) returns {
    ID: UUID;
    PromotionName: String(100);
    Description: String(500);
    Discount: Double;
    StartDate: Date;
    EndDate: Date;
  };

  // Các function tìm kiếm
  @(requires: 'authenticated-user')
  function searchCustomers(
    searchTerm: String
  ) returns array of {
    ID: UUID;
    FullName: String(100);
    Phone: String(20);
    Email: String(100);
    Address: String(200);
    Notes: String(500);
    TotalTransactions: Decimal(15,2);
  };

  @(requires: 'authenticated-user')
  function getCustomerDetails(
    customerID: UUID
  ) returns {
    customer: {
      ID: UUID;
      FullName: String(100);
      Phone: String(20);
      Email: String(100);
      Address: String(200);
      Notes: String(500);
      TotalTransactions: Decimal(15,2);
    };
    transactions: array of {
      ID: UUID;
      CustomerID: UUID;
      TransactionDate: Date;
      Amount: Decimal(15,2);
      Description: String(500);
    };
    contracts: array of {
      ID: UUID;
      CustomerID: UUID;
      TourID: UUID;
      ContractDate: Date;
      TotalAmount: Decimal(15,2);
      Status: String(20);
      PromotionID: UUID;
    };
    orders: array of {
      ID: UUID;
      CustomerID: UUID;
      TourID: UUID;
      OrderDate: Date;
      TotalAmount: Decimal(15,2);
      Status: String(20);
      PromotionID: UUID;
    };
  };

  @(requires: 'authenticated-user')
  function getActivePromotions() returns array of {
    ID: UUID;
    PromotionName: String(100);
    Description: String(500);
    Discount: Double;
    StartDate: Date;
    EndDate: Date;
  };
}