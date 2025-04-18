using { tourish.management as db } from '../db/schema';

service TourishManagementService {
  entity Workspaces as projection on db.Workspace;
  entity Users as projection on db.User;
  entity Tours as projection on db.Tour;
  entity TourSchedules as projection on db.TourSchedule;
  entity TourHistories as projection on db.TourHistory;
  entity Customers as projection on db.Customer;
  entity CustomerTransactionHistories as projection on db.CustomerTransactionHistory;
  entity Contracts as projection on db.Contract;
  entity Promotions as projection on db.Promotion;
  entity Suppliers as projection on db.Supplier;
  entity Services as projection on db.Service;
  entity TourServices as projection on db.TourService;
  entity Orders as projection on db.Order;
  entity Payments as projection on db.Payment;
  entity FinancialReports as projection on db.FinancialReport;
  entity BankAccounts as projection on db.BankAccount;
  entity SupplierDebts as projection on db.SupplierDebt;
  entity Receipts as projection on db.Receipt;

  // Custom actions
  action createTour(tour: {
    ID: UUID;
    TourName: String(100);
    Description: String(500);
    NumberDays: Integer;
    NumberNights: Integer;
    Price: Decimal(15,2);
    Status: String(20);
    CreatedByID: UUID;
  }, schedules: array of {
    ID: UUID;
    TourID: UUID;
    DayNumber: Integer;
    Activity: String(200);
    Description: String(500);
  }) returns {
    ID: UUID;
    TourName: String(100);
    Description: String(500);
    NumberDays: Integer;
    NumberNights: Integer;
    Price: Decimal(15,2);
    Status: String(20);
    CreatedByID: UUID;
  };

  action createOrder(order: {
    ID: UUID;
    OrderDate: Date;
    TotalAmount: Decimal(15,2);
    Status: String(20);
    PromotionID: UUID;
  }, customerID: UUID, tourID: UUID) returns {
    ID: UUID;
    CustomerID: UUID;
    TourID: UUID;
    OrderDate: Date;
    TotalAmount: Decimal(15,2);
    Status: String(20);
    PromotionID: UUID;
  };
}