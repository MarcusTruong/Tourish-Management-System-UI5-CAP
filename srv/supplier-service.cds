using tourish.management as tm from '../db/schema';

service SupplierService @(path: '/supplier-service') {
  // Các thực thể cho phép truy cập qua service này
  entity Suppliers as projection on tm.Supplier;
  entity Services as projection on tm.Service;
  entity SupplierDebts as projection on tm.SupplierDebt;

  // Các action cho quản lý thông tin nhà cung cấp
  @(requires: 'authenticated-user')
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

  @(requires: 'authenticated-user')
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

  @(requires: 'authenticated-user')
  action deleteSupplier(
    supplierID: UUID
  ) returns Boolean;

  // Các action cho quản lý dịch vụ nhà cung cấp
  @(requires: 'authenticated-user')
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

  @(requires: 'authenticated-user')
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

  @(requires: 'authenticated-user')
  action deleteService(
    serviceID: UUID
  ) returns Boolean;

  // Các action cho quản lý công nợ nhà cung cấp
  @(requires: 'authenticated-user')
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

  @(requires: 'authenticated-user')
  action markDebtAsPaid(
    debtID: UUID
  ) returns {
    ID: UUID;
    SupplierID: UUID;
    Amount: Decimal(15,2);
    DueDate: Date;
    Status: String(20);
  };

  // Các function tìm kiếm
  @(requires: 'authenticated-user')
  function searchSuppliers(
    searchTerm: String
  ) returns array of {
    ID: UUID;
    SupplierName: String(100);
    Address: String(200);
    Phone: String(20);
    Email: String(100);
  };

  @(requires: 'authenticated-user')
  function getSupplierDetails(
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
  };

  @(requires: 'authenticated-user')
  function getActiveServices() returns array of {
    ID: UUID;
    SupplierID: UUID;
    ServiceName: String(100);
    ServiceType: String(50);
    Description: String(500);
    Price: Decimal(15,2);
  };
}