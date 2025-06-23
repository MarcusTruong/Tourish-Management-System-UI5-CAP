using tourish.management as tm from '../db/schema';

service OrderService @(path: '/order-service') {
  // Entity exposures
  entity Orders as projection on tm.Order;
  entity Payments as projection on tm.Payment;

  // Order Management Actions
@(requires: ['Admin', 'Manager', 'Staff'])
  action createOrder(
    customerID: UUID,
    customerType: String,
    activeTourID: UUID,
    adultCount: Integer,
    childCount: Integer,
    promotionID: UUID,
    notes: String
  ) returns {
    orderID: UUID;
    message: String;
    totalAmount: Decimal;
  };

@(requires: ['Admin', 'Manager', 'Staff'])
  action updateOrder(
    orderID: UUID,
    adultCount: Integer,
    childCount: Integer,
    promotionID: UUID,
    notes: String
  ) returns {
    success: Boolean;
    message: String;
    totalAmount: Decimal;
  };

@(requires: ['Admin', 'Manager'])
  action cancelOrder(
    orderID: UUID,
    reason: String
  ) returns {
    success: Boolean;
    message: String;
  };

@(requires: ['Admin', 'Manager', 'Accountant'])
  action updateOrderStatus(
    orderID: UUID,
    status: String
  ) returns {
    success: Boolean;
    message: String;
  };

  // Payment Management Actions
@(requires: ['Admin', 'Manager', 'Accountant'])
  action addPayment(
    orderID: UUID,
    paymentDate: Date,
    amount: Decimal,
    paymentMethod: String,
    recordTransaction: Boolean
  ) returns {
    paymentID: UUID;
    message: String;
    remainingAmount: Decimal;
  };

@(requires: ['Admin', 'Manager', 'Accountant'])
  action updatePayment(
    paymentID: UUID,
    paymentDate: Date,
    amount: Decimal,
    paymentMethod: String
  ) returns {
    success: Boolean;
    message: String;
    remainingAmount: Decimal;
  };

@(requires: ['Admin', 'Manager', 'Accountant'])
  action deletePayment(
    paymentID: UUID
  ) returns {
    success: Boolean;
    message: String;
    remainingAmount: Decimal;
  };

@(requires: ['Admin', 'Manager', 'Accountant'])
  action processRefund(
    orderID: UUID,
    amount: Decimal,
    refundMethod: String,
    notes: String
  ) returns {
    success: Boolean;
    message: String;
    remainingAmount: Decimal;
  };

  // Order Queries
@(requires: ['Admin', 'Manager', 'Accountant', 'Staff'])
  action getOrderDetails(
    orderID: UUID
  ) returns {
    order: {
      ID: UUID;
      CustomerID: UUID;
      BusinessCustomerID: UUID;
      CustomerType: String;
      ActiveTourID: UUID;
      OrderDate: Date;
      AdultCount: Integer;
      ChildCount: Integer;
      TotalAmount: Decimal;
      PaidAmount: Decimal;
      RemainingAmount: Decimal;
      Status: String;
      PromotionID: UUID;
      Notes: String;
    };
    customer: {
      ID: UUID;
      Name: String;
      Phone: String;
      Email: String;
    };
    tour: {
      ID: UUID;
      TourName: String;
      DepartureDate: Date;
      ReturnDate: Date;
      AdultPrice: Decimal;
      ChildPrice: Decimal;
    };
    promotion: {
      ID: UUID;
      PromotionName: String;
      Discount: Double;
    };
    payments: array of {
      ID: UUID;
      PaymentDate: Date;
      Amount: Decimal;
      PaymentMethod: String;
    };
  };

@(requires: ['Admin', 'Manager', 'Accountant', 'Staff'])
  action listOrders(
    searchTerm: String,
    customerID: UUID,
    tourID: UUID,
    status: String,
    fromDate: Date,
    toDate: Date,
    skip: Integer,
    limit: Integer
  ) returns {
    items: array of {
      ID: UUID;
      OrderDate: Date;
      CustomerName: String;
      CustomerType: String;
      TourName: String;
      DepartureDate: Date;
      ReturnDate: Date;
      TotalAmount: Decimal;
      PaidAmount: Decimal;
      RemainingAmount: Decimal;
      Status: String;
    };
    pagination: {
      total: Integer;
      skip: Integer;
      limit: Integer;
    }
  };

  @(requires: ['Admin', 'Manager', 'Staff'])
  action calculateOrderAmount(
    activeTourID: UUID,
    adultCount: Integer,
    childCount: Integer,
    promotionID: UUID
  ) returns {
    adultPrice: Decimal;
    childPrice: Decimal;
    adultTotal: Decimal;
    childTotal: Decimal;
    discountAmount: Decimal;
    totalAmount: Decimal;
  };

  @(requires: ['Admin', 'Manager', 'Staff'])
  action getActiveToursForOrder() returns array of {
    ID: UUID;
    TourName: String;
    DepartureDate: Date;
    ReturnDate: Date;
    AdultPrice: Decimal;
    ChildPrice: Decimal;
    AvailableSeats: Integer;
    Status: String;
  };

  @(requires: ['Admin', 'Manager', 'Staff'])
  action getCustomersForOrder(
    searchTerm: String,
    customerType: String
  ) returns {
    individuals: array of {
      ID: UUID;
      FullName: String;
      Phone: String;
      Email: String;
    };
    businesses: array of {
      ID: UUID;
      CompanyName: String;
      ContactPerson: String;
      Phone: String;
      Email: String;
    };
  };

@(requires: ['Admin', 'Manager', 'Accountant'])
action generateInvoiceData(
  orderID: UUID
) returns {
  success: Boolean;
  invoice: {
    invoiceNumber: String;
    invoiceDate: Date;
    order: {
      ID: UUID;
      OrderDate: Date;
      CustomerType: String;
      AdultCount: Integer;
      ChildCount: Integer;
      TotalAmount: Decimal;
      PaidAmount: Decimal;
      RemainingAmount: Decimal;
      Status: String;
      Notes: String;
    };
    customer: {
      ID: UUID;
      Name: String;
      Phone: String;
      Email: String;
      Address: String;
    };
    tour: {
      ID: UUID;
      TourName: String;
      DepartureDate: Date;
      ReturnDate: Date;
      Duration: String;
      AdultPrice: Decimal;
      ChildPrice: Decimal;
    };
    schedules: array of {
      ID: UUID;
      DayNumber: Integer;
      DayTitle: String;
      Overview: String;
      BreakfastIncluded: Boolean;
      LunchIncluded: Boolean;
      DinnerIncluded: Boolean;
      Activities: array of {
        ID: UUID;
        StartTime: String;
        EndTime: String;
        Title: String;
        Description: String
      }
    };
    passengers: array of {
      ID: UUID;
      FullName: String;
      Gender: String;
      BirthDate: Date;
      IDNumber: String;
      Phone: String;
      Email: String;
      SpecialRequirements: String;
      IsAdult: Boolean;
    };
    services: array of {
      Description: String;
      Quantity: Integer;
      UnitPrice: Decimal;
      Total: Decimal;
    };
    payments: array of {
      ID: UUID;
      PaymentDate: Date;
      Amount: Decimal;
      PaymentMethod: String;
    };
    totals: {
      Subtotal: Decimal;
      Discount: Decimal;
      Total: Decimal;
      Paid: Decimal;
      Remaining: Decimal;
    };
    company: {
      Name: String;
      Address: String;
      Phone: String;
      Email: String;
    };
  };
  message: String;
};
}