using tourish.management as tm from '../db/schema';

service CustomerService @(path: '/customer-service') {
  // Entity exposures
  entity Customers as projection on tm.Customer;
  entity BusinessCustomers as projection on tm.BusinessCustomer;
  entity CustomerTransactionHistories as projection on tm.CustomerTransactionHistory;
  entity BusinessCustomerTransactionHistories as projection on tm.BusinessCustomerTransactionHistory;

  // INDIVIDUAL CUSTOMER MANAGEMENT
  
@(requires: ['Admin', 'Manager', 'Staff'])
  action createCustomer(
    fullName: String,
    phone: String,
    email: String,
    address: String,
    birthday: Date,
    notes: String
  ) returns {
    customerID: UUID;
    message: String
  };
  
@(requires: ['Admin', 'Manager', 'Staff'])
  action updateCustomer(
    customerID: UUID,
    fullName: String,
    phone: String,
    email: String,
    address: String,
    birthday: Date,
    notes: String
  ) returns {
    success: Boolean;
    message: String
  };
  
@(requires: ['Admin', 'Manager'])
  action deleteCustomer(
    customerID: UUID
  ) returns {
    success: Boolean;
    message: String
  };
  
@(requires: ['Admin', 'Manager', 'Accountant'])
  action recordCustomerTransaction(
    customerID: UUID,
    amount: Decimal,
    description: String
  ) returns {
    transactionID: UUID;
    message: String
  };
  
@(requires: ['Admin', 'Manager', 'Accountant', 'Staff'])
  action getCustomerDetails(
    customerID: UUID
  ) returns {
    customer: {
      ID: UUID;
      FullName: String;
      Phone: String;
      Email: String;
      Address: String;
      BirthDay: Date;
      Notes: String;
      TotalTransactions: Decimal;
    };
    transactions: array of {
      ID: UUID;
      TransactionDate: Date;
      Amount: Decimal;
      Description: String;
    };
    contracts: array of {
      ID: UUID;
      ContractDate: Date;
      TotalAmount: Decimal;
      Status: String;
      TourName: String;
    };
    orders: array of {
      ID: UUID;
      OrderDate: Date;
      TotalAmount: Decimal;
      Status: String;
      TourName: String;
    };
  };
  
@(requires: ['Admin', 'Manager', 'Accountant', 'Staff'])
  action listCustomers(
    searchTerm: String,
    skip: Integer,
    limit: Integer
  ) returns {
    items: array of {
      ID: UUID;
      FullName: String;
      Phone: String;
      Email: String;
      Address: String;
      TotalTransactions: Decimal;
    };
    pagination: {
      total: Integer;
      skip: Integer;
      limit: Integer;
    }
  };
  
  // BUSINESS CUSTOMER MANAGEMENT
  
@(requires: ['Admin', 'Manager', 'Staff'])
  action createBusinessCustomer(
    companyName: String,
    taxCode: String,
    contactPerson: String,
    position: String,
    phone: String,
    email: String,
    address: String,
    notes: String
  ) returns {
    customerID: UUID;
    message: String
  };
  
@(requires: ['Admin', 'Manager', 'Staff'])
  action updateBusinessCustomer(
    customerID: UUID,
    companyName: String,
    taxCode: String,
    contactPerson: String,
    position: String,
    phone: String,
    email: String,
    address: String,
    notes: String
  ) returns {
    success: Boolean;
    message: String
  };
  
@(requires: ['Admin', 'Manager'])
  action deleteBusinessCustomer(
    customerID: UUID
  ) returns {
    success: Boolean;
    message: String
  };
  
@(requires: ['Admin', 'Manager', 'Accountant'])
  action recordBusinessCustomerTransaction(
    customerID: UUID,
    amount: Decimal,
    description: String
  ) returns {
    transactionID: UUID;
    message: String
  };
  
@(requires: ['Admin', 'Manager', 'Accountant', 'Staff'])
  action getBusinessCustomerDetails(
    customerID: UUID
  ) returns {
    customer: {
      ID: UUID;
      CompanyName: String;
      TaxCode: String;
      ContactPerson: String;
      Position: String;
      Phone: String;
      Email: String;
      Address: String;
      Notes: String;
      TotalTransactions: Decimal;
    };
    transactions: array of {
      ID: UUID;
      TransactionDate: Date;
      Amount: Decimal;
      Description: String;
    };
    contracts: array of {
      ID: UUID;
      ContractDate: Date;
      TotalAmount: Decimal;
      Status: String;
      TourName: String;
    };
    orders: array of {
      ID: UUID;
      OrderDate: Date;
      TotalAmount: Decimal;
      Status: String;
      TourName: String;
    };
  };
  
@(requires: ['Admin', 'Manager', 'Accountant', 'Staff'])
  action listBusinessCustomers(
    searchTerm: String,
    skip: Integer,
    limit: Integer
  ) returns {
    items: array of {
      ID: UUID;
      CompanyName: String;
      TaxCode: String;
      ContactPerson: String;
      Phone: String;
      Email: String;
      TotalTransactions: Decimal;
    };
    pagination: {
      total: Integer;
      skip: Integer;
      limit: Integer;
    }
  };
  
  // GENERAL CUSTOMER actionS
  
@(requires: ['Admin', 'Manager', 'Accountant', 'Staff'])
  action searchAllCustomers(
    searchTerm: String,
    customerType: String, // "Individual", "Business", or "All"
    skip: Integer,
    limit: Integer
  ) returns {
    individualCustomers: array of {
      ID: UUID;
      Type: String;
      Name: String;
      Phone: String;
      Address: String;
      Email: String;
      TotalTransactions: Decimal;
    };
    businessCustomers: array of {
      ID: UUID;
      Type: String;
      Name: String;
      Phone: String;
      Address: String;
      Email: String;
      ContactPerson: String;
      TotalTransactions: Decimal;
    };
    pagination: {
      totalIndividual: Integer;
      totalBusiness: Integer;
      skip: Integer;
      limit: Integer;
    }
  };
  
@(requires: ['Admin', 'Manager', 'Accountant'])
  action getCustomerStatistics() returns {
    totalIndividualCustomers: Integer;
    totalBusinessCustomers: Integer;
    top10ByTransaction: array of {
      ID: UUID;
      Type: String; // "Individual" or "Business"
      Name: String;
      TotalTransactions: Decimal;
    };
    customersByMonth: array of {
      Month: String;
      IndividualCount: Integer;
      BusinessCount: Integer;
    };
    recentTransactions: array of {
      Date: Date;
      CustomerType: String;
      CustomerName: String;
      Amount: Decimal;
      Description: String;
    };
  };
}