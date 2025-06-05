using tourish.management as tm from '../db/schema';

service SupplierService @(path: '/supplier-service') {
  // Các thực thể cho phép truy cập qua service này
  entity Suppliers as projection on tm.Supplier;
  entity Services as projection on tm.Service;
  entity SupplierDebts as projection on tm.SupplierDebt;

  // Các action cho quản lý thông tin nhà cung cấp
  @(requires: ['Admin', 'Manager'])
  action createSupplier(
    supplierName: String,
    address: String,
    phone: String,
    email: String
  ) returns {
    ID: UUID;
    SupplierName: String(100);
    Address: String(200);
    Phone: String(20);
    Email: String(100);
  };

  @(requires: ['Admin', 'Manager'])
  action updateSupplier(
    supplierID: UUID,
    supplierName: String,
    address: String,
    phone: String,
    email: String
  ) returns {
    ID: UUID;
    SupplierName: String(100);
    Address: String(200);
    Phone: String(20);
    Email: String(100);
  };

  @(requires: ['Admin', 'Manager'])
  action deleteSupplier(
    supplierID: UUID
  ) returns Boolean;

  // Các action cho quản lý dịch vụ nhà cung cấp
  @(requires: ['Admin', 'Manager'])
  action createService(
    supplierID: UUID,
    serviceName: String,
    serviceType: String,
    description: String,
    price: Decimal
  ) returns {
    ID: UUID;
    SupplierID: UUID;
    ServiceName: String(100);
    ServiceType: String(50);
    Description: String(500);
    Price: Decimal(15,2);
  };

  @(requires: ['Admin', 'Manager'])
  action updateService(
    serviceID: UUID,
    serviceName: String,
    serviceType: String,
    description: String,
    price: Decimal
  ) returns {
    ID: UUID;
    SupplierID: UUID;
    ServiceName: String(100);
    ServiceType: String(50);
    Description: String(500);
    Price: Decimal(15,2);
  };

  @(requires: ['Admin', 'Manager'])
  action deleteService(
    serviceID: UUID
  ) returns Boolean;

  // Các action cho quản lý công nợ nhà cung cấp
  @(requires: ['Admin', 'Accountant'])
  action createSupplierDebt(
    supplierID: UUID,
    amount: Decimal,
    dueDate: Date,
    status: String
  ) returns {
    ID: UUID;
    SupplierID: UUID;
    Amount: Decimal(15,2);
    DueDate: Date;
    Status: String(20);
  };

  @(requires: ['Admin', 'Accountant'])
  action markDebtAsPaid(
    debtID: UUID
  ) returns {
    ID: UUID;
    SupplierID: UUID;
    Amount: Decimal(15,2);
    DueDate: Date;
    Status: String(20);
  };

  @(requires: ['Admin', 'Manager', 'Accountant', 'Staff'])
  action searchSuppliers(
    searchTerm: String,
    skip: Integer,
    limit: Integer
  ) returns {
    items: array of {
      ID: UUID;
      SupplierName: String(100);
      Address: String(200);
      Phone: String(20);
      Email: String(100);
    };
    pagination: {
      total: Integer;
      skip: Integer;
      limit: Integer;
    }
  };

  @(requires: ['Admin', 'Manager', 'Accountant', 'Staff'])
  action getSupplierDetails(
    supplierID: UUID
  ) returns {
    supplier: {
      ID: UUID;
      SupplierName: String(100);
      Address: String(200);
      Phone: String(20);
      Email: String(100);
    };
    services: array of {
      ID: UUID;
      SupplierID: UUID;
      ServiceName: String(100);
      ServiceType: String(50);
      Description: String(500);
      Price: Decimal(15,2);
    };
    debts: array of {
      ID: UUID;
      SupplierID: UUID;
      Amount: Decimal(15,2);
      DueDate: Date;
      Status: String(20);
    };
    debtStatistics: {
      totalDebt: Decimal(15,2);
      pendingDebt: Decimal(15,2);
      completedDebt: Decimal(15,2);
      debtCount: Integer;
      pendingDebtCount: Integer;
    }
  };

  @(requires: ['Admin', 'Manager', 'Accountant', 'Staff'])
  action getActiveServices(
    serviceType: String,
    limit: Integer
  ) returns array of {
    ID: UUID;
    SupplierID: UUID;
    ServiceName: String(100);
    ServiceType: String(50);
    Description: String(500);
    Price: Decimal(15,2);
  };
  
  // Các action mới
  
  // Tìm kiếm dịch vụ nâng cao
  @(requires: ['Admin', 'Manager', 'Accountant', 'Staff'])
  action searchServices(
    supplierID: UUID,
    serviceType: String,
    searchTerm: String,
    minPrice: Decimal,
    maxPrice: Decimal,
    skip: Integer,
    limit: Integer
  ) returns array of {
    ID: UUID;
    SupplierID: UUID;
    SupplierName: String(100);
    ServiceName: String(100);
    ServiceType: String(50);
    Description: String(500);
    Price: Decimal(15,2);
  };
  
  // Báo cáo công nợ nhà cung cấp
  @(requires: ['Admin', 'Accountant'])
  action getSupplierDebtReport(
    startDate: Date,
    endDate: Date,
    status: String
  ) returns {
    suppliers: array of {
      supplierID: UUID;
      supplierName: String(100);
      totalDebt: Decimal(15,2);
      pendingDebt: Decimal(15,2);
      completedDebt: Decimal(15,2);
      debts: array of {
        ID: UUID;
        Amount: Decimal(15,2);
        DueDate: Date;
        Status: String(20);
      }
    };
    statistics: {
      totalDebt: Decimal(15,2);
      pendingDebt: Decimal(15,2);
      completedDebt: Decimal(15,2);
      supplierCount: Integer;
      debtCount: Integer;
    }
  };
  
  // Lấy danh sách các loại dịch vụ
  @(requires: ['Admin', 'Manager', 'Accountant', 'Staff'])
  function getServiceTypes() returns array of String(50);
}