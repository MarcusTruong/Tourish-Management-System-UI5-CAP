/**
 * Implementation for Order Service
 */
const cds = require('@sap/cds');

module.exports = async (srv) => {
  const { 
    Order, 
    Payment, 
    Customer, 
    BusinessCustomer, 
    CustomerTransactionHistory, 
    BusinessCustomerTransactionHistory,
    ActiveTour,
    TourTemplate,
    TourTemplatePriceTerms,
    Promotion
  } = cds.entities('tourish.management');

  /**
   * Creates a new order
   */
  srv.on('createOrder', async (req) => {
    const { 
      customerID, customerType, activeTourID, 
      adultCount, childCount, promotionID, notes 
    } = req.data;
    
    // Generate order ID
    const orderID = cds.utils.uuid();
    const orderDate = new Date();
    
    try {
      // Validate input
      if (!customerID) {
        return { orderID: null, message: 'Customer ID is required', totalAmount: 0 };
      }
      
      if (!activeTourID) {
        return { orderID: null, message: 'Active Tour ID is required', totalAmount: 0 };
      }
      
      if (adultCount < 0 || childCount < 0) {
        return { orderID: null, message: 'Number of adults and children must be non-negative', totalAmount: 0 };
      }
      
      if (adultCount === 0 && childCount === 0) {
        return { orderID: null, message: 'At least one adult or child must be specified', totalAmount: 0 };
      }
      
      // Check if customer exists
      let customerExists = false;
      if (customerType === 'Individual') {
        const customer = await SELECT.one.from(Customer).where({ ID: customerID });
        customerExists = !!customer;
      } else if (customerType === 'Business') {
        const business = await SELECT.one.from(BusinessCustomer).where({ ID: customerID });
        customerExists = !!business;
      }
      
      if (!customerExists) {
        return { orderID: null, message: 'Customer not found', totalAmount: 0 };
      }
      
      // Check if active tour exists
      const tour = await SELECT.one.from(ActiveTour).where({ ID: activeTourID });
      if (!tour) {
        return { orderID: null, message: 'Active tour not found', totalAmount: 0 };
      }
      
      // Check if tour has enough seats
      if (tour.MaxCapacity - tour.CurrentBookings < (adultCount + childCount)) {
        return { orderID: null, message: 'Not enough available seats for this tour', totalAmount: 0 };
      }
      
      // Calculate total amount
      const amount = await calculateOrderAmount(activeTourID, adultCount, childCount, promotionID);
      
      // Start transaction
      const tx = cds.transaction(req);
      
      // Create order record
      const order = {
        ID: orderID,
        CustomerID: customerType === 'Individual' ? customerID : null,
        BusinessCustomerID: customerType === 'Business' ? customerID : null,
        CustomerType: customerType,
        ActiveTourID: activeTourID,
        OrderDate: orderDate,
        AdultCount: adultCount,
        ChildCount: childCount,
        TotalAmount: amount.totalAmount,
        PaidAmount: 0,
        RemainingAmount: amount.totalAmount,
        Status: 'Pending',
        PromotionID: promotionID,
        Notes: notes
      };
      
      await tx.run(INSERT.into(Order).entries(order));
      
      // Update tour booking count
      await tx.run(
        UPDATE(ActiveTour)
          .set({ CurrentBookings: { '+=': adultCount + childCount } })
          .where({ ID: activeTourID })
      );
      
      await tx.commit();
      
      return {
        orderID: orderID,
        message: 'Order created successfully',
        totalAmount: amount.totalAmount
      };
    } catch (error) {
      console.error('Error creating order:', error);
      return {
        orderID: null,
        message: `Error creating order: ${error.message}`,
        totalAmount: 0
      };
    }
  });
  
  /**
   * Updates an existing order
   */
  srv.on('updateOrder', async (req) => {
    const { orderID, adultCount, childCount, promotionID, notes } = req.data;
    
    try {
      // Validate input
      if (adultCount < 0 || childCount < 0) {
        return { success: false, message: 'Number of adults and children must be non-negative', totalAmount: 0 };
      }
      
      if (adultCount === 0 && childCount === 0) {
        return { success: false, message: 'At least one adult or child must be specified', totalAmount: 0 };
      }
      
      // Get the existing order
      const order = await SELECT.one.from(Order).where({ ID: orderID });
      
      if (!order) {
        return { success: false, message: 'Order not found', totalAmount: 0 };
      }
      
      // Check if the order is already completed or canceled
      if (order.Status === 'Completed' || order.Status === 'Canceled') {
        return { success: false, message: `Cannot update a ${order.Status.toLowerCase()} order`, totalAmount: 0 };
      }
      
      // Get the tour
      const tour = await SELECT.one.from(ActiveTour).where({ ID: order.ActiveTourID });
      
      if (!tour) {
        return { success: false, message: 'Tour not found', totalAmount: 0 };
      }
      
      // Calculate the new booking count difference
      const currentBookingCount = order.AdultCount + order.ChildCount;
      const newBookingCount = adultCount + childCount;
      const bookingDifference = newBookingCount - currentBookingCount;
      
      // Check if the tour has enough seats if we're increasing the booking count
      if (bookingDifference > 0) {
        if (tour.MaxCapacity - tour.CurrentBookings < bookingDifference) {
          return { success: false, message: 'Not enough available seats for this tour', totalAmount: 0 };
        }
      }
      
      // Calculate the new total amount
      const amount = await calculateOrderAmount(order.ActiveTourID, adultCount, childCount, promotionID);
      
      // Start a transaction
      const tx = cds.transaction(req);
      
      try {
        // Update the order
        await tx.run(
          UPDATE(Order)
            .set({
              AdultCount: adultCount,
              ChildCount: childCount,
              TotalAmount: amount.totalAmount,
              RemainingAmount: amount.totalAmount - order.PaidAmount,
              PromotionID: promotionID,
              Notes: notes
            })
            .where({ ID: orderID })
        );
        
        // Update the tour booking count if necessary
        if (bookingDifference !== 0) {
          await tx.run(
            UPDATE(ActiveTour)
              .set({ CurrentBookings: { '+=': bookingDifference } })
              .where({ ID: order.ActiveTourID })
          );
        }
        
        await tx.commit();
        
        return {
          success: true,
          message: 'Order updated successfully',
          totalAmount: amount.totalAmount
        };
      } catch (error) {
        await tx.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error updating order:', error);
      return {
        success: false,
        message: `Error updating order: ${error.message}`,
        totalAmount: 0
      };
    }
  });
  
  /**
   * Cancels an order
   */
  srv.on('cancelOrder', async (req) => {
    const { orderID, reason } = req.data;
    
    try {
      // Get the existing order
      const order = await SELECT.one.from(Order).where({ ID: orderID });
      
      if (!order) {
        return { success: false, message: 'Order not found' };
      }
      
      // Check if the order is already completed or canceled
      if (order.Status === 'Completed') {
        return { success: false, message: 'Cannot cancel a completed order' };
      }
      
      if (order.Status === 'Canceled') {
        return { success: false, message: 'Order is already canceled' };
      }
      
      // Start a transaction
      const tx = cds.transaction(req);
      
      try {
        // Update the order status
        await tx.run(
          UPDATE(Order)
            .set({
              Status: 'Canceled',
              Notes: order.Notes ? `${order.Notes}\nCanceled: ${reason}` : `Canceled: ${reason}`
            })
            .where({ ID: orderID })
        );
        
        // Update the tour booking count
        await tx.run(
          UPDATE(ActiveTour)
            .set({ CurrentBookings: { '-=': order.AdultCount + order.ChildCount } })
            .where({ ID: order.ActiveTourID })
        );
        
        await tx.commit();
        
        return {
          success: true,
          message: 'Order canceled successfully'
        };
      } catch (error) {
        await tx.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error canceling order:', error);
      return {
        success: false,
        message: `Error canceling order: ${error.message}`
      };
    }
  });
  
  /**
   * Updates the status of an order
   */
  srv.on('updateOrderStatus', async (req) => {
    const { orderID, status } = req.data;
    
    try {
      // Validate status
      if (!['Pending', 'Completed', 'Canceled'].includes(status)) {
        return { success: false, message: 'Invalid status. Must be one of: Pending, Completed, Canceled' };
      }
      
      // Get the existing order
      const order = await SELECT.one.from(Order).where({ ID: orderID });
      
      if (!order) {
        return { success: false, message: 'Order not found' };
      }
      
      // Additional validation when changing to Completed
      if (status === 'Completed' && order.RemainingAmount > 0) {
        return { success: false, message: 'Cannot complete an order with remaining balance' };
      }
      
      // Start a transaction
      const tx = cds.transaction(req);
      
      try {
        // Handle special case for cancellation (need to update tour bookings)
        if (status === 'Canceled' && order.Status !== 'Canceled') {
          // Update the tour booking count
          await tx.run(
            UPDATE(ActiveTour)
              .set({ CurrentBookings: { '-=': order.AdultCount + order.ChildCount } })
              .where({ ID: order.ActiveTourID })
          );
        }
        
        // Update the order status
        await tx.run(
          UPDATE(Order)
            .set({ Status: status })
            .where({ ID: orderID })
        );
        
        await tx.commit();
        
        return {
          success: true,
          message: `Order status updated to ${status} successfully`
        };
      } catch (error) {
        await tx.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      return {
        success: false,
        message: `Error updating order status: ${error.message}`
      };
    }
  });
  
  /**
   * Adds a payment to an order
   */
  srv.on('addPayment', async (req) => {
    const { orderID, paymentDate, amount, paymentMethod, recordTransaction } = req.data;
    
    try {
      // Validate input
      if (amount <= 0) {
        return { paymentID: null, message: 'Payment amount must be greater than zero', remainingAmount: 0 };
      }
      
      // Get the existing order
      const order = await SELECT.one.from(Order).where({ ID: orderID });
      
      if (!order) {
        return { paymentID: null, message: 'Order not found', remainingAmount: 0 };
      }
      
      // Check if the order is already canceled
      if (order.Status === 'Canceled') {
        return { paymentID: null, message: 'Cannot add payment to a canceled order', remainingAmount: 0 };
      }
      console.log("order ", order);
      // Calculate the new remaining amount
      const currentPaidAmount = parseFloat(order.PaidAmount) || 0;
      const paymentAmount = parseFloat(amount) || 0;
      const totalAmount = parseFloat(order.TotalAmount) || 0;
      const newPaidAmount = currentPaidAmount + paymentAmount;
      const newRemainingAmount = totalAmount - newPaidAmount;
      
      // Generate payment ID
      const paymentID = cds.utils.uuid();
      
      // Start a transaction
      const tx = cds.transaction(req);
      
      try {
        // Insert the payment
        await tx.run(
          INSERT.into(Payment).entries({
            ID: paymentID,
            OrderID: orderID,
            PaymentDate: paymentDate || new Date(),
            Amount: amount,
            PaymentMethod: paymentMethod
          })
        );
        
        // Update the order's paid and remaining amounts
        await tx.run(
          UPDATE(Order)
            .set({
              PaidAmount: newPaidAmount,
              RemainingAmount: newRemainingAmount,
              // Automatically set to Completed if fully paid
              Status: newRemainingAmount <= 0 ? 'Completed' : order.Status
            })
            .where({ ID: orderID })
        );
        
        // Record transaction in customer history if requested
        if (recordTransaction) {
          const transactionDescription = `Payment for Order ${orderID.substring(0, 8)}`;
          
          if (order.CustomerType === 'Individual') {
            await tx.run(
              INSERT.into(CustomerTransactionHistory).entries({
                ID: cds.utils.uuid(),
                CustomerID: order.CustomerID,
                TransactionDate: paymentDate || new Date(),
                Amount: amount,
                Description: transactionDescription
              })
            );
            
            // Update customer's total transactions
            await tx.run(
              UPDATE(Customer)
                .set({ TotalTransactions: { '+=': amount } })
                .where({ ID: order.CustomerID })
            );
          } else if (order.CustomerType === 'Business') {
            await tx.run(
              INSERT.into(BusinessCustomerTransactionHistory).entries({
                ID: cds.utils.uuid(),
                BusinessCustomerID: order.BusinessCustomerID,
                TransactionDate: paymentDate || new Date(),
                Amount: amount,
                Description: transactionDescription
              })
            );
            
            // Update business customer's total transactions
            await tx.run(
              UPDATE(BusinessCustomer)
                .set({ TotalTransactions: { '+=': amount } })
                .where({ ID: order.BusinessCustomerID })
            );
          }
        }
        
        await tx.commit();
        
        return {
          paymentID: paymentID,
          message: 'Payment added successfully',
          remainingAmount: newRemainingAmount
        };
      } catch (error) {
        await tx.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error adding payment:', error);
      return {
        paymentID: null,
        message: `Error adding payment: ${error.message}`,
        remainingAmount: 0
      };
    }
  });
  
  /**
   * Updates an existing payment
   */
  srv.on('updatePayment', async (req) => {
    const { paymentID, paymentDate, amount, paymentMethod } = req.data;
    
    try {
      // Validate input
      if (amount <= 0) {
        return { success: false, message: 'Payment amount must be greater than zero', remainingAmount: 0 };
      }
      
      // Get the existing payment
      const payment = await SELECT.one.from(Payment).where({ ID: paymentID });
      
      if (!payment) {
        return { success: false, message: 'Payment not found', remainingAmount: 0 };
      }
      
      // Get the order
      const order = await SELECT.one.from(Order).where({ ID: payment.OrderID });
      
      if (!order) {
        return { success: false, message: 'Associated order not found', remainingAmount: 0 };
      }
      
      // Check if the order is already canceled
      if (order.Status === 'Canceled') {
        return { success: false, message: 'Cannot update payment for a canceled order', remainingAmount: 0 };
      }
      
      // Calculate the new paid and remaining amounts
      const am = parseFloat(amount) || 0;
      const pAm = parseFloat(payment.Amount) || 0;
      const oPAm  = parseFloat(order.PaidAmount) || 0;
      const oTA = parseFloat(order.TotalAmount) || 0;
      const amountDifference = am - pAm;
      const newPaidAmount = oPAm + amountDifference;
      const newRemainingAmount = oTA - newPaidAmount;
      
      // Start a transaction
      const tx = cds.transaction(req);
      
      try {
        // Update the payment
        await tx.run(
          UPDATE(Payment)
            .set({
              PaymentDate: paymentDate,
              Amount: amount,
              PaymentMethod: paymentMethod
            })
            .where({ ID: paymentID })
        );
        
        // Update the order's paid and remaining amounts
        await tx.run(
          UPDATE(Order)
            .set({
              PaidAmount: newPaidAmount,
              RemainingAmount: newRemainingAmount,
              // Automatically set to Completed if fully paid
              Status: newRemainingAmount <= 0 ? 'Completed' : order.Status
            })
            .where({ ID: order.ID })
        );
        
        await tx.commit();
        
        return {
          success: true,
          message: 'Payment updated successfully',
          remainingAmount: newRemainingAmount
        };
      } catch (error) {
        await tx.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error updating payment:', error);
      return {
        success: false,
        message: `Error updating payment: ${error.message}`,
        remainingAmount: 0
      };
    }
  });
  
  /**
   * Deletes a payment
   */
  srv.on('deletePayment', async (req) => {
    const { paymentID } = req.data;
    
    try {
      // Get the existing payment
      const payment = await SELECT.one.from(Payment).where({ ID: paymentID });
      
      if (!payment) {
        return { success: false, message: 'Payment not found', remainingAmount: 0 };
      }
      
      // Get the order
      const order = await SELECT.one.from(Order).where({ ID: payment.OrderID });
      
      if (!order) {
        return { success: false, message: 'Associated order not found', remainingAmount: 0 };
      }
      
      // Check if the order is already canceled or completed
      if (order.Status === 'Canceled') {
        return { success: false, message: 'Cannot delete payment for a canceled order', remainingAmount: 0 };
      }
      
      if (order.Status === 'Completed' && order.PaidAmount - payment.Amount < order.TotalAmount) {
        // This would make it incomplete again
        return { success: false, message: 'Deleting this payment would make a completed order incomplete', remainingAmount: 0 };
      }
      
      // Calculate the new paid and remaining amounts
      const newPaidAmount = order.PaidAmount - payment.Amount;
      const newRemainingAmount = order.TotalAmount - newPaidAmount;
      
      // Start a transaction
      const tx = cds.transaction(req);
      
      try {
        // Delete the payment
        await tx.run(DELETE.from(Payment).where({ ID: paymentID }));
        
        // Update the order's paid and remaining amounts
        await tx.run(
          UPDATE(Order)
            .set({
              PaidAmount: newPaidAmount,
              RemainingAmount: newRemainingAmount,
              // Update status if needed
              Status: order.Status === 'Completed' ? 'Pending' : order.Status
            })
            .where({ ID: order.ID })
        );
        
        await tx.commit();
        
        return {
          success: true,
          message: 'Payment deleted successfully',
          remainingAmount: newRemainingAmount
        };
      } catch (error) {
        await tx.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error deleting payment:', error);
      return {
        success: false,
        message: `Error deleting payment: ${error.message}`,
        remainingAmount: 0
      };
    }
  });
  
  /**
   * Processes a refund for an overpaid order
   */
  srv.on('processRefund', async (req) => {
    const { orderID, amount, refundMethod, notes } = req.data;
    try {
      // Validate input
      if (amount <= 0) {
        return { success: false, message: 'Refund amount must be greater than zero', remainingAmount: 0 };
      }
      
      // Get the existing order
      const order = await SELECT.one.from(Order).where({ ID: orderID });
      
      if (!order) {
        return { success: false, message: 'Order not found', remainingAmount: 0 };
      }
      
      // Check if the order has a negative remaining amount (overpaid)
      if (order.RemainingAmount >= 0) {
        return { success: false, message: 'Order is not overpaid, no refund needed', remainingAmount: order.RemainingAmount };
      }
      
      // Check if refund amount is not greater than overpaid amount
      const overpaidAmount = Math.abs(order.RemainingAmount);
      if (amount > overpaidAmount) {
        return { success: false, message: `Refund amount cannot exceed overpaid amount of ${overpaidAmount}`, remainingAmount: order.RemainingAmount };
      }
      
      // Calculate the new paid and remaining amounts
      const am = parseFloat(amount) || 0;
      const newPaidAmount = order.PaidAmount - am;
      const newRemainingAmount = order.TotalAmount - newPaidAmount;
      
      // Generate payment ID for the refund
      const paymentID = cds.utils.uuid();
      
      // Start a transaction
      const tx = cds.transaction(req);
      
      try {
        // Insert the refund as a negative payment
        await tx.run(
          INSERT.into(Payment).entries({
            ID: paymentID,
            OrderID: orderID,
            PaymentDate: new Date(),
            Amount: -amount, // Negative amount for refund
            PaymentMethod: refundMethod
          })
        );
        
        // Update the order's paid and remaining amounts
        await tx.run(
          UPDATE(Order)
            .set({
              PaidAmount: newPaidAmount,
              RemainingAmount: newRemainingAmount,
              Notes: order.Notes ? `${order.Notes}\nRefund processed: ${notes}` : `Refund processed: ${notes}`
            })
            .where({ ID: orderID })
        );
        
        // Record transaction in customer history as negative amount
        const transactionDescription = `Refund for Order ${orderID.substring(0, 8)} - ${notes}`;
        
        if (order.CustomerType === 'Individual') {
          await tx.run(
            INSERT.into(CustomerTransactionHistory).entries({
              ID: cds.utils.uuid(),
              CustomerID: order.CustomerID,
              TransactionDate: new Date(),
              Amount: -amount, // Negative amount for refund
              Description: transactionDescription
            })
          );
          
          // Update customer's total transactions
          await tx.run(
            UPDATE(Customer)
              .set({ TotalTransactions: { '-=': amount } })
              .where({ ID: order.CustomerID })
          );
        } else if (order.CustomerType === 'Business') {
          await tx.run(
            INSERT.into(BusinessCustomerTransactionHistory).entries({
              ID: cds.utils.uuid(),
              BusinessCustomerID: order.BusinessCustomerID,
              TransactionDate: new Date(),
              Amount: -amount, // Negative amount for refund
              Description: transactionDescription
            })
          );
          
          // Update business customer's total transactions
          await tx.run(
            UPDATE(BusinessCustomer)
              .set({ TotalTransactions: { '-=': amount } })
              .where({ ID: order.BusinessCustomerID })
          );
        }
        
        await tx.commit();
        
        return {
          success: true,
          message: 'Refund processed successfully',
          remainingAmount: newRemainingAmount
        };
      } catch (error) {
        await tx.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error processing refund:', error);
      return {
        success: false,
        message: `Error processing refund: ${error.message}`,
        remainingAmount: 0
      };
    }
  });
  
  /**
   * Gets detailed information about an order
   */
  srv.on('getOrderDetails', async (req) => {
    const { orderID } = req.data;
    
    try {
      // Get the order
      const order = await SELECT.one.from(Order).where({ ID: orderID });
      
      if (!order) {
        return req.error(404, 'Order not found');
      }
      
      // Get customer information based on customer type
      let customer = {};
      if (order.CustomerType === 'Individual') {
        const individualCustomer = await SELECT.one.from(Customer)
          .columns('ID', 'FullName as Name', 'Phone', 'Email')
          .where({ ID: order.CustomerID });
        
        customer = individualCustomer || {};
      } else if (order.CustomerType === 'Business') {
        const businessCustomer = await SELECT.one.from(BusinessCustomer)
          .columns('ID', 'CompanyName as Name', 'Phone', 'Email')
          .where({ ID: order.BusinessCustomerID });
        
        customer = businessCustomer || {};
      }
      
      // Get tour information
      const tour = await SELECT.one.from(ActiveTour)
        .columns('ID', 'TourName', 'DepartureDate', 'ReturnDate', 'TemplateID')
        .where({ ID: order.ActiveTourID });
      
      // Get tour prices
      let adultPrice = 0;
      let childPrice = 0;
      
      if (tour) {
        const priceTerms = await SELECT.one.from(TourTemplatePriceTerms)
          .columns('AdultPrice', 'ChildrenPrice')
          .where({ TourTemplateID: tour.TemplateID });
        
        if (priceTerms) {
          adultPrice = priceTerms.AdultPrice;
          childPrice = priceTerms.ChildrenPrice;
        }
      }
      
      // Get promotion information if applicable
      let promotion = {};
      if (order.PromotionID) {
        const promoInfo = await SELECT.one.from(Promotion)
          .columns('ID', 'PromotionName', 'Discount')
          .where({ ID: order.PromotionID });
        
        promotion = promoInfo || {};
      }
      
      // Get payments
      const payments = await SELECT.from(Payment)
        .where({ OrderID: orderID })
        .orderBy({ PaymentDate: 'desc' });
      
      return {
        order: order,
        customer: customer,
        tour: {
          ...tour,
          AdultPrice: adultPrice,
          ChildPrice: childPrice
        },
        promotion: promotion,
        payments: payments
      };
    } catch (error) {
      console.error('Error retrieving order details:', error);
      return req.error(500, `Error retrieving order details: ${error.message}`);
    }
  });
  
  /**
   * Lists orders with filtering and pagination
   */
  srv.on('listOrders', async (req) => {
    const {
      searchTerm,
      customerID,
      tourID,
      status,
      fromDate,
      toDate,
      skip,
      limit
    } = req.data;
    
    try {
      // Build the query
      let query = SELECT.from(Order);
      let countQuery = SELECT.from(Order).columns('count(*) as count');
      let whereConditions = [];
      
      // Apply filters
      if (customerID) {
        whereConditions.push(`(CustomerID = '${customerID}' OR BusinessCustomerID = '${customerID}')`);
      }
      
      if (tourID) {
        whereConditions.push(`ActiveTourID = '${tourID}'`);
      }
      
      if (status) {
        whereConditions.push(`Status = '${status}'`);
      }
      
      if (fromDate) {
        whereConditions.push(`OrderDate >= '${fromDate}'`);
      }
      
      if (toDate) {
        whereConditions.push(`OrderDate <= '${toDate}'`);
      }
      
      // Apply where conditions if any
      if (whereConditions.length > 0) {
        const whereClause = whereConditions.join(' AND ');
        query.where(whereClause);
        countQuery.where(whereClause);
      }
      
      // Apply pagination
      query.limit(limit || 20, skip || 0);
      
      // Execute queries
      const orders = await query;
      const countResult = await countQuery;
      const total = countResult[0].count;
      
      // Enhance the orders with additional information
      const enhancedOrders = await Promise.all(orders.map(async order => {
        // Get customer name
        let customerName = 'Unknown';
        if (order.CustomerType === 'Individual' && order.CustomerID) {
          const customer = await SELECT.one.from(Customer)
            .columns('FullName')
            .where({ ID: order.CustomerID });
          
          if (customer) {
            customerName = customer.FullName;
          }
        } else if (order.CustomerType === 'Business' && order.BusinessCustomerID) {
          const business = await SELECT.one.from(BusinessCustomer)
            .columns('CompanyName')
            .where({ ID: order.BusinessCustomerID });
          
          if (business) {
            customerName = business.CompanyName;
          }
        }
        
        // Get tour name and dates
        let tourName = 'Unknown';
        let departureDate = null;
        let returnDate = null;
        
        if (order.ActiveTourID) {
          const tour = await SELECT.one.from(ActiveTour)
            .columns('TourName', 'DepartureDate', 'ReturnDate')
            .where({ ID: order.ActiveTourID });
          
          if (tour) {
            tourName = tour.TourName;
            departureDate = tour.DepartureDate;
            returnDate = tour.ReturnDate;
          }
        }
        
        return {
          ID: order.ID,
          OrderDate: order.OrderDate,
          CustomerName: customerName,
          CustomerType: order.CustomerType,
          TourName: tourName,
          DepartureDate: departureDate,
          ReturnDate: returnDate,
          TotalAmount: order.TotalAmount,
          PaidAmount: order.PaidAmount,
          RemainingAmount: order.RemainingAmount,
          Status: order.Status
        };
      }));
      
      return {
        items: enhancedOrders,
        pagination: {
          total: total,
          skip: skip || 0,
          limit: limit || 20
        }
      };
    } catch (error) {
      console.error('Error listing orders:', error);
      return req.error(500, `Error listing orders: ${error.message}`);
    }
  });
  
  /**
   * Calculates the total amount for an order based on tour prices and promotion
   */
  srv.on('calculateOrderAmount', async (req) => {
    const { activeTourID, adultCount, childCount, promotionID } = req.data;
    
    try {
      return await calculateOrderAmount(activeTourID, adultCount, childCount, promotionID);
    } catch (error) {
      console.error('Error calculating order amount:', error);
      return req.error(500, `Error calculating order amount: ${error.message}`);
    }
  });
  
  /**
   * Helper function to calculate order amount
   */
  async function calculateOrderAmount(activeTourID, adultCount, childCount, promotionID) {
    // Get the tour
    const tour = await SELECT.one.from(ActiveTour)
      .columns('TemplateID')
      .where({ ID: activeTourID });
    
    if (!tour) {
      throw new Error('Tour not found');
    }
    
    // Get tour prices
    const priceTerms = await SELECT.one.from(TourTemplatePriceTerms)
      .columns('AdultPrice', 'ChildrenPrice')
      .where({ TourTemplateID: tour.TemplateID });
    
    if (!priceTerms) {
      throw new Error('Tour price information not found');
    }
    
    // Calculate base amounts
    const adultPrice = priceTerms.AdultPrice || 0;
    const childPrice = priceTerms.ChildrenPrice || 0;
    const adultTotal = adultPrice * adultCount;
    const childTotal = childPrice * childCount;
    let totalBeforeDiscount = adultTotal + childTotal;
    
    // Apply promotion discount if applicable
    let discountAmount = 0;
    
    if (promotionID) {
      const promotion = await SELECT.one.from(Promotion)
        .columns('Discount')
        .where({ ID: promotionID });
      
      if (promotion) {
        discountAmount = totalBeforeDiscount * promotion.Discount;
      }
    }
    
    // Calculate final total
    const totalAmount = totalBeforeDiscount - discountAmount;
    
    return {
      adultPrice,
      childPrice,
      adultTotal,
      childTotal,
      discountAmount,
      totalAmount
    };
  }
  
  /**
   * Gets active tours that can be selected for orders
   */
  srv.on('getActiveToursForOrder', async (req) => {
    try {
      // Get active tours that are open for booking
      const tours = await SELECT.from(ActiveTour)
        .where({ Status: 'Open' })
        .orderBy({ DepartureDate: 'asc' });
      
      // Enhance with price information
      const enhancedTours = await Promise.all(tours.map(async tour => {
        // Get tour prices
        const priceTerms = await SELECT.one.from(TourTemplatePriceTerms)
          .columns('AdultPrice', 'ChildrenPrice')
          .where({ TourTemplateID: tour.TemplateID });
        
        const adultPrice = priceTerms ? priceTerms.AdultPrice : 0;
        const childPrice = priceTerms ? priceTerms.ChildrenPrice : 0;
        
        // Calculate available seats
        const availableSeats = tour.MaxCapacity - tour.CurrentBookings;
        
        return {
          ID: tour.ID,
          TourName: tour.TourName,
          DepartureDate: tour.DepartureDate,
          ReturnDate: tour.ReturnDate,
          AdultPrice: adultPrice,
          ChildPrice: childPrice,
          AvailableSeats: availableSeats,
          Status: tour.Status
        };
      }));
      
      return enhancedTours;
    } catch (error) {
      console.error('Error retrieving active tours for order:', error);
      return req.error(500, `Error retrieving active tours: ${error.message}`);
    }
  });
  
  /**
   * Gets customers that can be selected for orders
   */
  srv.on('getCustomersForOrder', async (req) => {
    const { searchTerm, customerType } = req.data;
    
    try {
      // Prepare result
      let individuals = [];
      let businesses = [];
      
      // Get individual customers if requested
      if (customerType === 'Individual' || customerType === 'All') {
        let query = SELECT.from(Customer)
          .columns('ID', 'FullName', 'Phone', 'Email');
        
        if (searchTerm) {
          query.where(`FullName LIKE '%${searchTerm}%' OR Phone LIKE '%${searchTerm}%' OR Email LIKE '%${searchTerm}%'`);
        }
        
        individuals = await query;
      }
      
      // Get business customers if requested
      if (customerType === 'Business' || customerType === 'All') {
        let query = SELECT.from(BusinessCustomer)
          .columns('ID', 'CompanyName', 'ContactPerson', 'Phone', 'Email');
        
        if (searchTerm) {
          query.where(`CompanyName LIKE '%${searchTerm}%' OR ContactPerson LIKE '%${searchTerm}%' OR Phone LIKE '%${searchTerm}%' OR Email LIKE '%${searchTerm}%'`);
        }
        
        businesses = await query;
      }
      
      return {
        individuals,
        businesses
      };
    } catch (error) {
      console.error('Error retrieving customers for order:', error);
      return req.error(500, `Error retrieving customers: ${error.message}`);
    }
  });
};