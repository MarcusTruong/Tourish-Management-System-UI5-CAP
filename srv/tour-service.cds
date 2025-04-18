using tourish.management as tm from '../db/schema';

service TourService @(path: '/tour-service') {
  // Các thực thể cho phép truy cập qua service này
  entity Tours as projection on tm.Tour;
  entity TourSchedules as projection on tm.TourSchedule;
  entity TourHistories as projection on tm.TourHistory;
  entity TourServices as projection on tm.TourService;

  // Action để tạo tour mẫu (bao gồm lịch trình)
  @(requires: ['admin', 'staff'])
  action createTour(
    tour: {
      TourName: String(100);
      Description: String(500);
      NumberDays: Integer;
      NumberNights: Integer;
      TourType: String(20);
      Price: Decimal(15,2);
      Status: String(20);
      CreatedByID: UUID;
    },
    schedules: array of {
      DayNumber: Integer;
      Activity: String(200);
      Description: String(500);
    }
  ) returns {
    ID: UUID;
    TourName: String(100);
    Description: String(500);
    NumberDays: Integer;
    NumberNights: Integer;
    Price: Decimal(15,2);
    Status: String(20);
    CreatedByID: UUID;
  };

  // Action để cập nhật trạng thái tour
  @(requires: ['admin', 'staff'])
  action updateTourStatus(
    tourID: UUID,
    status: String(20)
  ) returns {
    ID: UUID;
    TourName: String(100);
    Description: String(500);
    NumberDays: Integer;
    NumberNights: Integer;
    Price: Decimal(15,2);
    Status: String(20);
    CreatedByID: UUID;
  };

  // Action để thêm dịch vụ vào tour
  @(requires: ['admin', 'staff'])
  action addTourService(
    tourID: UUID,
    serviceID: UUID
  ) returns {
    ID: UUID;
    TourID: UUID;
    ServiceID: UUID;
  };

  // Action để ghi lịch sử chỉnh sửa tour
  @(requires: ['admin', 'staff'])
  action logTourHistory(
    tourID: UUID,
    modifiedBy: String,
    changes: String
  ) returns {
    ID: UUID;
    TourID: UUID;
    ModifiedDate: Timestamp;
    ModifiedBy: String(100);
    Changes: String(500);
  };
}