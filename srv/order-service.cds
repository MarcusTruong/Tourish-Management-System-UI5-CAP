using tourish.management as tm from '../db/schema';

service OrderService @(path: '/order-service') {
  // Các thực thể cho phép truy cập qua service này
  entity Orders as projection on tm.Order;
  entity Payments as projection on tm.Payment;

  // Action để tạo đơn hàng mới
  @(requires: 'authenticated-user')
  action createOrder(
    customerID: UUID,
    tourID: UUID,
    orderDate: Date,
    totalAmount: Decimal,
    promotionID: UUID
  ) returns {
    ID: UUID;
    CustomerID: UUID;
    TourID: UUID;
    OrderDate: Date;
    TotalAmount: Decimal(15,2);
    Status: String(20);
    PromotionID: UUID;
  };

  // Action để hủy đơn hàng
  @(requires: 'authenticated-user')
  action cancelOrder(
    orderID: UUID,
    reason: String
  ) returns {
    ID: UUID;
    CustomerID: UUID;
    TourID: UUID;
    OrderDate: Date;
    TotalAmount: Decimal(15,2);
    Status: String(20);
    PromotionID: UUID;
  };

  // Action để cập nhật trạng thái đơn hàng
  @(requires: 'authenticated-user')
  action updateOrderStatus(
    orderID: UUID,
    status: String
  ) returns {
    ID: UUID;
    CustomerID: UUID;
    TourID: UUID;
    OrderDate: Date;
    TotalAmount: Decimal(15,2);
    Status: String(20);
    PromotionID: UUID;
  };

  // Action để thêm thanh toán cho đơn hàng
  @(requires: 'authenticated-user')
  action addPayment(
    orderID: UUID,
    paymentDate: Date,
    amount: Decimal,
    paymentMethod: String
  ) returns {
    ID: UUID;
    OrderID: UUID;
    PaymentDate: Date;
    Amount: Decimal(15,2);
    PaymentMethod: String(50);
  };

  // Action để cập nhật thông tin thanh toán
  @(requires: 'authenticated-user')
  action updatePayment(
    paymentID: UUID,
    paymentDate: Date,
    amount: Decimal,
    paymentMethod: String
  ) returns {
    ID: UUID;
    OrderID: UUID;
    PaymentDate: Date;
    Amount: Decimal(15,2);
    PaymentMethod: String(50);
  };

  // Function để lấy thông tin chi tiết đơn hàng
  @(requires: 'authenticated-user')
  function getOrderDetails(
    orderID: UUID
  ) returns {
    order: {
      ID: UUID;
      CustomerID: UUID;
      TourID: UUID;
      OrderDate: Date;
      TotalAmount: Decimal(15,2);
      Status: String(20);
      PromotionID: UUID;
    };
    payments: array of {
      ID: UUID;
      OrderID: UUID;
      PaymentDate: Date;
      Amount: Decimal(15,2);
      PaymentMethod: String(50);
    };
    customer: {
      ID: UUID;
      FullName: String(100);
      Phone: String(20);
      Email: String(100);
    };
    tour: {
      ID: UUID;
      TourName: String(100);
      Description: String(500);
      NumberDays: Integer;
      NumberNights: Integer;
      Price: Decimal(15,2);
    };
  };

  // Function để tìm kiếm đơn hàng theo nhiều tiêu chí
  @(requires: 'authenticated-user')
  function searchOrders(
    customerName: String,
    tourName: String,
    status: String,
    startDate: Date,
    endDate: Date
  ) returns array of {
    ID: UUID;
    CustomerID: UUID;
    TourID: UUID;
    OrderDate: Date;
    TotalAmount: Decimal(15,2);
    Status: String(20);
    CustomerName: String(100);
    TourName: String(100);
    PaidAmount: Decimal(15,2);
    RemainingAmount: Decimal(15,2);
  };

  // Function để lấy tổng quan về thanh toán của đơn hàng
  @(requires: 'authenticated-user')
  function getOrderPaymentSummary(
    orderID: UUID
  ) returns {
    OrderID: UUID;
    TotalAmount: Decimal(15,2);
    PaidAmount: Decimal(15,2);
    RemainingAmount: Decimal(15,2);
    LastPaymentDate: Date;
    PaymentHistory: array of {
      ID: UUID;
      PaymentDate: Date;
      Amount: Decimal(15,2);
      PaymentMethod: String(50);
    };
  };
}