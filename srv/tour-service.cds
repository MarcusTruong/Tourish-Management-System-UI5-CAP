using tourish.management as tm from '../db/schema';

service TourService @(path: '/tour-service') {
  // Entity exposures
  entity TourTemplates as projection on tm.TourTemplate;
  entity TourTemplateImages as projection on tm.TourTemplateImage;
  entity TourTemplateSchedules as projection on tm.TourTemplateSchedule;
  entity TourTemplateActivities as projection on tm.TourTemplateActivity;
  entity TourTemplatePriceTerms as projection on tm.TourTemplatePriceTerms;
  entity TourTemplateHistories as projection on tm.TourTemplateHistory;
  entity ActiveTours as projection on tm.ActiveTour;
  entity Passengers as projection on tm.Passenger;
  entity ActiveTourServices as projection on tm.ActiveTourService;
  entity TourEstimates as projection on tm.TourEstimate;
  entity TourCostItems as projection on tm.TourCostItem;
  entity ActiveTourHistories as projection on tm.ActiveTourHistory;

  // TOUR TEMPLATE MANAGEMENT - STEP 1: Basic Information
  
  @(requires: ['Admin', 'Manager'])
  action createTourTemplateBasicInfo(
    templateName: String,
    description: String,
    numberDays: Integer,
    numberNights: Integer,
    tourType: String,
    images: array of {
      imageURL: String;
      caption: String;
      isMain: Boolean
    }
  ) returns {
    templateID: UUID;
    templateName: String;
    message: String
  };
  
  @(requires: ['Admin', 'Manager'])
  action updateTourTemplateBasicInfo(
    templateID: UUID,
    templateName: String,
    description: String,
    numberDays: Integer,
    numberNights: Integer,
    tourType: String
  ) returns {
    success: Boolean;
    message: String
  };
  
  @(requires: ['Admin', 'Manager'])
  action addImageToTemplate(
    templateID: UUID,
    imageURL: String,
    caption: String,
    isMain: Boolean
  ) returns {
    imageID: UUID;
    message: String
  };
  
  @(requires: ['Admin', 'Manager'])
  action removeImageFromTemplate(
    imageID: UUID
  ) returns {
    success: Boolean;
    message: String
  };
  
  @(requires: ['Admin', 'Manager'])
  action setMainImage(
    imageID: UUID,
    templateID: UUID
  ) returns {
    success: Boolean;
    message: String
  };
  
  // TOUR TEMPLATE MANAGEMENT - STEP 2: Schedules
  
  @(requires: ['Admin', 'Manager'])
  action addTourTemplateSchedules(
    templateID: UUID,
    schedules: array of {
      dayNumber: Integer;
      dayTitle: String;
      overview: String;
      breakfastIncluded: Boolean;
      lunchIncluded: Boolean;
      dinnerIncluded: Boolean;
      activities: array of {
        startTime: String;
        endTime: String;
        title: String;
        description: String
      }
    }
  ) returns {
    success: Boolean;
    message: String
  };
  
 @(requires: ['Admin', 'Manager'])
  action updateTourTemplateSchedule(
    scheduleID: UUID,
    dayTitle: String,
    overview: String,
    breakfastIncluded: Boolean,
    lunchIncluded: Boolean,
    dinnerIncluded: Boolean
  ) returns {
    success: Boolean;
    message: String
  };
  
  @(requires: ['Admin', 'Manager'])
  action addActivityToSchedule(
    scheduleID: UUID,
    startTime: String,
    endTime: String,
    title: String,
    description: String
  ) returns {
    activityID: UUID;
    message: String
  };
  
  @(requires: ['Admin', 'Manager'])
  action updateActivity(
    activityID: UUID,
    startTime: String,
    endTime: String,
    title: String,
    description: String
  ) returns {
    success: Boolean;
    message: String
  };
  
  @(requires: ['Admin', 'Manager'])
  action deleteActivity(
    activityID: UUID
  ) returns {
    success: Boolean;
    message: String
  };
  
  @(requires: ['Admin', 'Manager'])
  action reorderActivities(
    scheduleID: UUID,
    activityIDs: array of UUID
  ) returns {
    success: Boolean;
    message: String
  };
  
  // TOUR TEMPLATE MANAGEMENT - STEP 3: Price Terms
  
  @(requires: ['Admin', 'Manager'])
  action addTourTemplatePriceTerms(
    templateID: UUID,
    adultPrice: Decimal,
    childrenPrice: Decimal,
    servicesIncluded: String,
    servicesNotIncluded: String,
    cancellationTerms: String,
    generalTerms: String
  ) returns {
    success: Boolean;
    message: String
  };
  
  @(requires: ['Admin', 'Manager'])
  action updateTourTemplatePriceTerms(
    templateID: UUID,
    adultPrice: Decimal,
    childrenPrice: Decimal,
    servicesIncluded: String,
    servicesNotIncluded: String,
    cancellationTerms: String,
    generalTerms: String
  ) returns {
    success: Boolean;
    message: String
  };
  
  // TOUR TEMPLATE MANAGEMENT - General Operations
  
  @(requires: ['Admin', 'Manager'])
  action completeTourTemplateCreation(
    templateID: UUID
  ) returns {
    success: Boolean;
    message: String;
    status: String
  };
  
  @(requires: ['Admin', 'Manager'])
  action updateTourTemplateStatus(
    templateID: UUID,
    status: String
  ) returns {
    success: Boolean;
    message: String
  };
  
  @(requires: ['Admin', 'Manager'])
  action logTourTemplateHistory(
    templateID: UUID,
    modifiedBy: String,
    changes: String
  ) returns {
    success: Boolean;
    message: String
  };
  
  @(requires: ['Admin', 'Manager'])
  action deleteTourTemplate(
    templateID: UUID
  ) returns {
    success: Boolean;
    message: String
  };
  
  @(requires: ['Admin', 'Manager', 'Accountant', 'Staff'])
  action getTourTemplateDetails(
    templateID: UUID
  ) returns {
    template: {
      ID: UUID;
      TemplateName: String;
      Description: String;
      NumberDays: Integer;
      NumberNights: Integer;
      TourType: String;
      CreatedByID: UUID;
      CreatedAt: Timestamp;
      UpdatedAt: Timestamp;
      Status: String
    };
    images: array of {
      ID: UUID;
      ImageURL: String;
      Caption: String;
      IsMain: Boolean
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
    priceTerms: {
      ID: UUID;
      AdultPrice: Decimal;
      ChildrenPrice: Decimal;
      ServicesIncluded: String;
      ServicesNotIncluded: String;
      CancellationTerms: String;
      GeneralTerms: String
    };
    history: array of {
      ID: UUID;
      ModifiedDate: Timestamp;
      ModifiedBy: String;
      Changes: String
    };
    activeTours: array of {
      ID: UUID;
      TourName: String;
      DepartureDate: Date;
      ReturnDate: Date;
      Status: String;
      CurrentBookings: Integer
    }
  };
  
  @(requires: ['Admin', 'Manager', 'Accountant', 'Staff'])
  action listTourTemplates(
    searchTerm: String,
    tourType: String,
    status: String,
    skip: Integer,
    limit: Integer
  ) returns {
    items: array of {
      ID: UUID;
      TemplateName: String;
      Description: String;
      NumberDays: Integer;
      NumberNights: Integer;
      TourType: String;
      AdultPrice: Decimal;
      MainImageURL: String;
      Status: String;
      CreatedAt: Timestamp;
      ActiveToursCount: Integer
    };
    pagination: {
      total: Integer;
      skip: Integer;
      limit: Integer
    }
  };
  
  @(requires: ['Admin', 'Manager', 'Accountant', 'Staff'])
  action getAvailableTourTypes() returns array of String;
  
  // ACTIVE TOUR MANAGEMENT
  
  @(requires: ['Admin', 'Manager'])
  action createActiveTour(
    templateID: UUID,
    tourName: String,
    departureDate: Date,
    returnDate: Date,
    saleStartDate: Date,
    saleEndDate: Date,
    maxCapacity: Integer,
    responsiblePersonID: UUID
  ) returns {
    tourID: UUID;
    tourName: String;
    message: String
  };
  
  @(requires: ['Admin', 'Manager'])
  action updateActiveTour(
    tourID: UUID,
    tourName: String,
    departureDate: Date,
    returnDate: Date,
    saleStartDate: Date,
    saleEndDate: Date,
    maxCapacity: Integer,
    responsiblePersonID: UUID
  ) returns {
    success: Boolean;
    message: String
  };
  
  @(requires: ['Admin', 'Manager'])
  action updateActiveTourStatus(
    tourID: UUID,
    status: String
  ) returns {
    success: Boolean;
    message: String
  };
  
  @(requires: ['Admin', 'Manager'])
  action cancelActiveTour(
    tourID: UUID,
    reason: String
  ) returns {
    success: Boolean;
    message: String
  };
  
  @(requires: ['Admin', 'Manager'])
  action logActiveTourHistory(
    tourID: UUID,
    modifiedBy: String,
    changes: String
  ) returns {
    success: Boolean;
    message: String
  };

  @(requires: ['Admin', 'Manager'])
  action closeActiveTour(
    tourID: UUID,
    reason: String
  ) returns {
    success: Boolean;
    message: String;
  };

  @(requires: ['Admin', 'Manager'])
action reopenActiveTour(
  tourID: UUID,
  reason: String
) returns {
  success: Boolean;
  message: String;
};

@(requires: ['Admin', 'Manager'])
action completeActiveTour(
  tourID: UUID,
  completionNotes: String
) returns {
  success: Boolean;
  message: String;
};

// AUTOMATED STATUS MANAGEMENT

@(requires: ['Admin', 'Manager'])
action autoCloseTours() returns {
  success: Boolean;
  message: String;
  closedCount: Integer;
};

@(requires: ['Admin', 'Manager'])
action autoCompleteTours() returns {
  success: Boolean;
  message: String;
  completedCount: Integer;
};

// TOUR STATUS REPORTING

@(requires: ['Admin', 'Manager', 'Accountant', 'Staff'])
action getTourStatusStatistics() returns {
  open: Integer;
  closed: Integer;
  completed: Integer;
  canceled: Integer;
  total: Integer;
  needsAttention: {
    toClose: Integer;
    toComplete: Integer;
  };
};
  
  // PASSENGER MANAGEMENT
  
 // Trong file srv/tour-service.cds, cập nhật phần PASSENGER MANAGEMENT:

// PASSENGER MANAGEMENT
  
@(requires: ['Admin', 'Manager', 'Staff'])
action addPassenger(
  orderID: UUID,  // Thay đổi từ tourID sang orderID
  fullName: String,
  gender: String,
  birthDate: Date,
  idNumber: String,
  phone: String,
  email: String,
  specialRequirements: String,
  isAdult: Boolean
) returns {
  passengerID: UUID;
  message: String
};

@(requires: ['Admin', 'Manager', 'Staff'])
action updatePassenger(
  passengerID: UUID,
  fullName: String,
  gender: String,
  birthDate: Date,
  idNumber: String,
  phone: String,
  email: String,
  specialRequirements: String,
  isAdult: Boolean
) returns {
  success: Boolean;
  message: String
};

@(requires: ['Admin', 'Manager', 'Staff'])
action removePassenger(
  passengerID: UUID
) returns {
  success: Boolean;
  message: String
};

@(requires: ['Admin', 'Manager', 'Accountant', 'Staff'])
action getPassengerList(
  tourID: UUID
) returns array of {
  ID: UUID;
  OrderID: UUID;
  CustomerName: String;
  OrderDate: Date;
  FullName: String;
  Gender: String;
  BirthDate: Date;
  IDNumber: String;
  Phone: String;
  Email: String;
  SpecialRequirements: String;
  IsAdult: Boolean;
};

// Thêm action mới để lấy passengers theo orderID
@(requires: ['Admin', 'Manager', 'Accountant', 'Staff'])
action getPassengersByOrder(
  orderID: UUID
) returns array of {
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
  
  // TOUR SERVICES MANAGEMENT
  
  @(requires: ['Admin', 'Manager'])
  action addServiceToActiveTour(
    tourID: UUID,
    serviceID: UUID,
    quantity: Integer,
    unitPrice: Decimal,
    notes: String
  ) returns {
    tourServiceID: UUID;
    message: String
  };
  
  @(requires: ['Admin', 'Manager'])
  action updateActiveTourService(
    tourServiceID: UUID,
    quantity: Integer,
    unitPrice: Decimal,
    notes: String
  ) returns {
    success: Boolean;
    message: String
  };
  
  @(requires: ['Admin', 'Manager'])
  action removeActiveTourService(
    tourServiceID: UUID
  ) returns {
    success: Boolean;
    message: String
  };
  
@(requires: ['Admin', 'Manager', 'Accountant', 'Staff'])
  action getActiveTourServices(
    tourID: UUID
  ) returns array of {
    ID: UUID;
    ServiceID: UUID;
    ServiceName: String;
    ServiceType: String;
    SupplierID: UUID;
    SupplierName: String;
    Quantity: Integer;
    UnitPrice: Decimal;
    TotalPrice: Decimal;
    Notes: String
  };
  
  // FINANCIAL ESTIMATES
  
@(requires: ['Admin', 'Manager', 'Accountant'])
  action createTourEstimate(
    tourID: UUID,
    estimatedCost: Decimal,
    estimatedRevenue: Decimal,
    estimatedProfit: Decimal,
    notes: String
  ) returns {
    estimateID: UUID;
    message: String
  };
  
@(requires: ['Admin', 'Manager', 'Accountant'])
  action updateTourEstimate(
    estimateID: UUID,
    estimatedCost: Decimal,
    estimatedRevenue: Decimal,
    estimatedProfit: Decimal,
    notes: String
  ) returns {
    success: Boolean;
    message: String
  };
  
@(requires: ['Admin', 'Manager', 'Accountant'])
  action addCostItem(
    estimateID: UUID,
    itemName: String,
    category: String,
    cost: Decimal,
    notes: String
  ) returns {
    costItemID: UUID;
    message: String
  };
  
@(requires: ['Admin', 'Manager', 'Accountant'])
  action updateCostItem(
    costItemID: UUID,
    itemName: String,
    category: String,
    cost: Decimal,
    notes: String
  ) returns {
    success: Boolean;
    message: String
  };
  
@(requires: ['Admin', 'Manager', 'Accountant'])
  action removeCostItem(
    costItemID: UUID
  ) returns {
    success: Boolean;
    message: String
  };
  
@(requires: ['Admin', 'Manager', 'Accountant'])
  action getTourEstimate(
    tourID: UUID
  ) returns {
    ID: UUID;
    EstimatedCost: Decimal;
    EstimatedRevenue: Decimal;
    EstimatedProfit: Decimal;
    LastUpdated: Timestamp;
    Notes: String;
    CostItems: array of {
      ID: UUID;
      ItemName: String;
      Category: String;
      Cost: Decimal;
      Notes: String
    }
  };
  
  // ACTIVE TOUR DETAILS AND LISTING

  // Trong file srv/tour-service.cds, thêm action mới:

@(requires: ['Admin', 'Manager', 'Accountant', 'Staff'])
action getOrdersWithPassengers(
  tourID: UUID
) returns array of {
  OrderID: UUID;
  CustomerID: UUID;
  CustomerName: String;
  CustomerType: String;
  OrderDate: Date;
  AdultCount: Integer;
  ChildCount: Integer;
  Status: String;
  Passengers: array of {
    ID: UUID;
    FullName: String;
    Gender: String;
    BirthDate: Date;
    IDNumber: String;
    Phone: String;
    Email: String;
    SpecialRequirements: String;
    IsAdult: Boolean;
    IsPlaceholder: Boolean; // Để phân biệt slot trống
  };
};
  
  @(requires: ['Admin', 'Manager'])
  action getActiveTourDetails(
    tourID: UUID
  ) returns {
    tour: {
      ID: UUID;
      TemplateID: UUID;
      TourName: String;
      DepartureDate: Date;
      ReturnDate: Date;
      SaleStartDate: Date;
      SaleEndDate: Date;
      MaxCapacity: Integer;
      CurrentBookings: Integer;
      ResponsiblePersonID: UUID;
      ResponsiblePersonName: String;
      Status: String;
      CreatedAt: Timestamp;
      UpdatedAt: Timestamp
    };
    template: {
      TemplateName: String;
      Description: String;
      NumberDays: Integer;
      NumberNights: Integer;
      TourType: String
    };
    schedules: array of {
      DayNumber: Integer;
      DayTitle: String;
      Overview: String;
      BreakfastIncluded: Boolean;
      LunchIncluded: Boolean;
      DinnerIncluded: Boolean;
      Activities: array of {
        StartTime: String;
        EndTime: String;
        Title: String;
        Description: String
      }
    };
    images: array of {
      ImageURL: String;
      Caption: String;
      IsMain: Boolean
    };
    passengerCount: Integer;
    serviceCount: Integer;
    estimate: {
      EstimatedCost: Decimal;
      EstimatedRevenue: Decimal;
      EstimatedProfit: Decimal
    };
    terms: {
      ServicesIncluded: String;
      ServicesNotIncluded: String;
      CancellationTerms: String;
      GeneralTerms: String
    };
    history: array of {
      ModifiedDate: Timestamp;
      ModifiedBy: String;
      Changes: String
    }
  };
  
@(requires: ['Admin', 'Manager', 'Accountant', 'Staff'])
  action listActiveTours(
    searchTerm: String,
    status: String,
    fromDepartureDate: Date,
    toDepartureDate: Date,
    fromSaleDate: Date,
    toSaleDate: Date,
    responsiblePersonID: UUID,
    skip: Integer,
    limit: Integer
  ) returns {
    items: array of {
      ID: UUID;
      TourName: String;
      TemplateName: String;
      DepartureDate: Date;
      ReturnDate: Date;
      SaleStartDate: Date;
      SaleEndDate: Date;
      Status: String;
      CurrentBookings: Integer;
      MaxCapacity: Integer;
      ResponsiblePersonName: String;
      EstimatedProfit: Decimal;
      MainImageURL: String
    };
    pagination: {
      total: Integer;
      skip: Integer;
      limit: Integer
    }
  };
  
  // DASHBOARD AND REPORTING
  
@(requires: ['Admin', 'Manager', 'Accountant', 'Staff'])
  action getToursDashboardData() returns {
    activeToursCount: Integer;
    draftTemplatesCount: Integer;
    publishedTemplatesCount: Integer;
    upcomingDepartures: array of {
      ID: UUID;
      TourName: String;
      DepartureDate: Date;
      CurrentBookings: Integer;
      MaxCapacity: Integer
    };
    recentlyCreatedTemplates: array of {
      ID: UUID;
      TemplateName: String;
      CreatedAt: Timestamp;
      TourType: String
    };
    tourTypeDistribution: array of {
      TourType: String;
      Count: Integer
    };
    monthlyStats: array of {
      Month: String;
      ToursCount: Integer;
      PassengersCount: Integer;
      EstimatedRevenue: Decimal
    }
  };
  
@(requires: ['Admin', 'Manager', 'Accountant'])
  action generateTourReport(
    tourID: UUID,
    reportType: String
  ) returns {
    reportURL: String;
    message: String
  };
  
@(requires: ['Admin', 'Manager', 'Accountant'])
  action generateToursAnalyticsReport(
    fromDate: Date,
    toDate: Date,
    tourTypes: array of String,
    status: array of String
  ) returns {
    reportURL: String;
    message: String;
    summary: {
      totalTours: Integer;
      totalPassengers: Integer;
      totalRevenue: Decimal;
      totalProfit: Decimal;
      averageOccupancyRate: Decimal
    }
  };
}

