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
  Role : String(20) enum {
    Admin;
    Manager;
    Accountant;
    Staff;
  };
  FullName : String(100);
  Email : String(100);
  Phone : String(20);
  Status : String(20) default 'Active'; // Active/Inactive
  CreatedTourTemplates : Association to many TourTemplate on CreatedTourTemplates.CreatedByID = $self.ID;
  ManagedActiveTours : Association to many ActiveTour on ManagedActiveTours.ResponsiblePersonID = $self.ID;
}

// Tour Template entities
entity TourTemplate {
  key ID : UUID;
  TemplateName : String(100) not null;
  Description : String(500);
  NumberDays : Integer;
  NumberNights : Integer;
  TourType : String(20);
  CreatedByID : UUID; // Reference to User.ID
  CreatedAt : Timestamp;
  UpdatedAt : Timestamp;
  Status : String(20) default 'Draft'; // Draft/Published
  Images : Association to many TourTemplateImage on Images.TourTemplateID = $self.ID;
  Schedules : Association to many TourTemplateSchedule on Schedules.TourTemplateID = $self.ID;
  PriceTerms : Association to one TourTemplatePriceTerms on PriceTerms.TourTemplateID = $self.ID;
  ActiveTours : Association to many ActiveTour on ActiveTours.TemplateID = $self.ID;
  Histories : Association to many TourTemplateHistory on Histories.TourTemplateID = $self.ID;
}

entity TourTemplateImage {
  key ID : UUID;
  TourTemplateID : UUID; // Reference to TourTemplate.ID
  ImageURL : String(500);
  Caption : String(200);
  IsMain : Boolean default false;
}

entity TourTemplateSchedule {
  key ID : UUID;
  TourTemplateID : UUID; // Reference to TourTemplate.ID
  DayNumber : Integer not null;
  DayTitle : String(100);
  Overview : String(500);
  BreakfastIncluded : Boolean default false;
  LunchIncluded : Boolean default false;
  DinnerIncluded : Boolean default false;
  Activities : Association to many TourTemplateActivity on Activities.ScheduleID = $self.ID;
}

entity TourTemplateActivity {
  key ID : UUID;
  ScheduleID : UUID; // Reference to TourTemplateSchedule.ID
  StartTime : String(20); // Format: HH:MM
  EndTime : String(20); // Format: HH:MM
  Title : String(100);
  Description : String(500);
}

entity TourTemplatePriceTerms {
  key ID : UUID;
  TourTemplateID : UUID; // Reference to TourTemplate.ID
  AdultPrice : Decimal(15,2);
  ChildrenPrice : Decimal(15,2);
  ServicesIncluded : String(1000);
  ServicesNotIncluded : String(1000);
  CancellationTerms : String(1000);
  GeneralTerms : String(1000);
}

entity TourTemplateHistory {
  key ID : UUID;
  TourTemplateID : UUID; // Reference to TourTemplate.ID
  ModifiedDate : Timestamp;
  ModifiedBy : String(100);
  Changes : String(500);
}

// Active Tour entities
entity ActiveTour {
  key ID : UUID;
  TemplateID : UUID; // Reference to TourTemplate.ID
  TourName : String(100) not null;
  DepartureDate : Date;
  ReturnDate : Date;
  SaleStartDate : Date;
  SaleEndDate : Date;
  MaxCapacity : Integer;
  CurrentBookings : Integer default 0;
  ResponsiblePersonID : UUID; // Reference to User.ID
  Status : String(20) default 'Open'; // Open/Closed/Canceled/Completed
  CreatedAt : Timestamp;
  UpdatedAt : Timestamp;
  TourServices : Association to many ActiveTourService on TourServices.ActiveTourID = $self.ID;
  Estimate : Association to one TourEstimate on Estimate.ActiveTourID = $self.ID;
  Orders : Association to many Order on Orders.ActiveTourID = $self.ID;
  Histories : Association to many ActiveTourHistory on Histories.ActiveTourID = $self.ID;
}

entity Passenger {
  key ID : UUID;
  OrderID : UUID; // Reference to Order.ID - Thay đổi từ ActiveTourID
  FullName : String(100);
  Gender : String(10);
  BirthDate : Date;
  IDNumber : String(50);
  Phone : String(20);
  Email : String(100);
  SpecialRequirements : String(500);
  IsAdult : Boolean default true; // Thêm field để phân biệt người lớn/trẻ em
  Order : Association to Order; // Thêm association
}

entity ActiveTourService {
  key ID : UUID;
  ActiveTourID : UUID; // Reference to ActiveTour.ID
  ServiceID : UUID; // Reference to Service.ID
  Quantity : Integer default 1;
  UnitPrice : Decimal(15,2);
  TotalPrice : Decimal(15,2);
  Notes : String(500);
}

entity TourEstimate {
  key ID : UUID;
  ActiveTourID : UUID; // Reference to ActiveTour.ID
  EstimatedCost : Decimal(15,2);
  EstimatedRevenue : Decimal(15,2);
  EstimatedProfit : Decimal(15,2);
  LastUpdated : Timestamp;
  Notes : String(500);
  CostItems : Association to many TourCostItem on CostItems.EstimateID = $self.ID;
}

entity TourCostItem {
  key ID : UUID;
  EstimateID : UUID; // Reference to TourEstimate.ID
  ItemName : String(100);
  Category : String(50);
  Cost : Decimal(15,2);
  Notes : String(200);
}

entity ActiveTourHistory {
  key ID : UUID;
  ActiveTourID : UUID; // Reference to ActiveTour.ID
  ModifiedDate : Timestamp;
  ModifiedBy : String(100);
  Changes : String(500);
}

entity BusinessCustomer {
  key ID : UUID;
  CompanyName : String(100) not null;
  TaxCode : String(20);
  ContactPerson : String(100);
  Position : String(50);
  Phone : String(20);
  Email : String(100);
  Address : String(200);
  Notes : String(500);
  TotalTransactions : Decimal(15,2) default 0.00;
  Contracts : Association to many Contract on Contracts.BusinessCustomerID = $self.ID;
  Orders : Association to many Order on Orders.BusinessCustomerID = $self.ID;
  TransactionHistories : Association to many BusinessCustomerTransactionHistory on TransactionHistories.BusinessCustomerID = $self.ID;
}

entity BusinessCustomerTransactionHistory {
  key ID : UUID;
  BusinessCustomerID : UUID; // Reference to BusinessCustomer.ID
  TransactionDate : Date;
  Amount : Decimal(15,2);
  Description : String(500);
}

// Original entities with updated references
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
  BusinessCustomerID : UUID;
  ActiveTourID : UUID; // Reference to ActiveTour.ID (updated)
  CustomerType : String(10); // "Individual" or "Business"
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
  ActiveTourServices : Association to many ActiveTourService on ActiveTourServices.ServiceID = $self.ID;
}

entity Order {
  key ID : UUID;
  CustomerID : UUID; // Reference to Customer.ID
  BusinessCustomerID : UUID; // Reference to BusinessCustomer.ID
  CustomerType : String(10); // "Individual" or "Business"
  ActiveTourID : UUID; // Reference to ActiveTour.ID
  OrderDate : Date;
  AdultCount : Integer default 0;
  ChildCount : Integer default 0;
  TotalAmount : Decimal(15,2);
  PaidAmount : Decimal(15,2) default 0.00;
  RemainingAmount : Decimal(15,2);
  Status : String(20) default 'Pending'; // Pending/Completed/Canceled/overpaid
  PromotionID : UUID; // Reference to Promotion.ID
  Notes : String(500);
  Payments : Association to many Payment on Payments.OrderID = $self.ID;
  Passengers : Association to many Passenger on Passengers.OrderID = $self.ID;
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
  Description: String(500);
  TourServiceID: UUID;
}

entity Receipt {
  key ID : UUID;
  Type : String(10); // Thu/Chi
  Amount : Decimal(15,2);
  Date : Date;
  Description : String(500);
}