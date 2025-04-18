namespace tourish.management;

entity Workspace {
  key ID : UUID;
  CompanyName : String(100);
  Address : String(200);
  Phone : String(20);
  Email : String(100);
  Users : Association to many User on Users.WorkspaceID = $self.ID;
}

entity User {
  key ID : UUID;
  WorkspaceID : UUID; // Khóa ngoại tham chiếu đến Workspace.ID
  Username : String(50) not null;
  Password : String(100) not null;
  Role : String(20); // Admin/Staff
  FullName : String(100);
  Email : String(100);
  Phone : String(20);
  Status : String(20) default 'Active'; // Active/Inactive
  Tours : Association to many Tour on Tours.CreatedByID = $self.ID;
}

entity Tour {
  key ID : UUID;
  TourName : String(100) not null;
  Description : String(500);
  NumberDays : Integer;
  NumberNights : Integer;
  TourType: String(20);
  Price : Decimal(15,2);
  Status : String(20) default 'Draft'; // Draft/Open/Canceled
  CreatedByID : UUID; // Khóa ngoại tham chiếu đến User.ID
  Orders : Association to many Order on Orders.TourID = $self.ID;
  Contracts : Association to many Contract on Contracts.TourID = $self.ID;
  Schedules : Association to many TourSchedule on Schedules.TourID = $self.ID;
  Histories : Association to many TourHistory on Histories.TourID = $self.ID;
  TourServices : Association to many TourService on TourServices.TourID = $self.ID;
}

entity TourSchedule {
  key ID : UUID;
  TourID : UUID; // Khóa ngoại tham chiếu đến Tour.ID
  DayNumber : Integer not null;
  Activity : String(200);
  Description : String(500);
}

entity TourHistory {
  key ID : UUID;
  TourID : UUID; // Khóa ngoại tham chiếu đến Tour.ID
  ModifiedDate : Timestamp;
  ModifiedBy : String(100);
  Changes : String(500);
}

entity Customer {
  key ID : UUID;
  FullName : String(100) not null;
  Phone : String(20);
  Email : String(100);
  Address : String(200);
  BirthDay : Date;
  Notes : String(500);
  TotalTransactions : Decimal(15,2) default 0.00;
  Contracts : Association to many Contract on Contracts.CustomerID = $self.ID;
  Orders : Association to many Order on Orders.CustomerID = $self.ID;
  TransactionHistories : Association to many CustomerTransactionHistory on TransactionHistories.CustomerID = $self.ID;
}

entity CustomerTransactionHistory {
  key ID : UUID;
  CustomerID : UUID; // Khóa ngoại tham chiếu đến Customer.ID
  TransactionDate : Date;
  Amount : Decimal(15,2);
  Description : String(500);
}

entity Contract {
  key ID : UUID;
  CustomerID : UUID; // Khóa ngoại tham chiếu đến Customer.ID
  TourID : UUID; // Khóa ngoại tham chiếu đến Tour.ID
  ContractDate : Date;
  TotalAmount : Decimal(15,2);
  Status : String(20) default 'Pending'; // Pending/Completed/Canceled
  PromotionID : UUID; // Khóa ngoại tham chiếu đến Promotion.ID
}

entity Promotion {
  key ID : UUID;
  PromotionName : String(100) not null;
  Description : String(500);
  Discount : Double;
  StartDate : Date;
  EndDate : Date;
}

entity Supplier {
  key ID : UUID;
  SupplierName : String(100) not null;
  Address : String(200);
  Phone : String(20);
  Email : String(100);
  Services : Association to many Service on Services.SupplierID = $self.ID;
  Debts : Association to many SupplierDebt on Debts.SupplierID = $self.ID;
}

entity Service {
  key ID : UUID;
  SupplierID : UUID; // Khóa ngoại tham chiếu đến Supplier.ID
  ServiceName : String(100) not null;
  ServiceType : String(50);
  Description : String(500);
  Price : Decimal(15,2);
  TourServices : Association to many TourService on TourServices.ServiceID = $self.ID;
}

entity TourService {
  key ID : UUID;
  TourID : UUID; // Khóa ngoại tham chiếu đến Tour.ID
  ServiceID : UUID; // Khóa ngoại tham chiếu đến Service.ID
}

entity Order {
  key ID : UUID;
  CustomerID : UUID; // Khóa ngoại tham chiếu đến Customer.ID
  TourID : UUID; // Khóa ngoại tham chiếu đến Tour.ID
  OrderDate : Date;
  TotalAmount : Decimal(15,2);
  Status : String(20) default 'Pending'; // Pending/Completed/Canceled
  PromotionID : UUID; // Khóa ngoại tham chiếu đến Promotion.ID
  Payments : Association to many Payment on Payments.OrderID = $self.ID;
}

entity Payment {
  key ID : UUID;
  OrderID : UUID; // Khóa ngoại tham chiếu đến Order.ID
  PaymentDate : Date;
  Amount : Decimal(15,2);
  PaymentMethod : String(50);
}

entity FinancialReport {
  key ID : UUID;
  ReportType : String(50);
  ReportDate : Date;
  Details : String(1000);
}

entity BankAccount {
  key ID : UUID;
  AccountID : String(50);
  BankName : String(100);
  AccountNumber : String(20);
  Balance : Decimal(15,2);
  LastUpdatedDate : Date;
}

entity SupplierDebt {
  key ID : UUID;
  SupplierID : UUID; // Khóa ngoại tham chiếu đến Supplier.ID
  Amount : Decimal(15,2);
  DueDate : Date;
  Status : String(20) default 'Pending'; // Pending/Completed
}

entity Receipt {
  key ID : UUID;
  Type : String(10); // Thu/Chi
  Amount : Decimal(15,2);
  Date : Date;
  Description : String(500);
}