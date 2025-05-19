/**
 * Implementation for Customer Service
 */
const cds = require('@sap/cds');

module.exports = async (srv) => {
  const { 
    Customer, 
    BusinessCustomer, 
    CustomerTransactionHistory, 
    BusinessCustomerTransactionHistory,
    Contract,
    Order
  } = cds.entities('tourish.management');


  // INDIVIDUAL CUSTOMER MANAGEMENT
  
  /**
   * Creates a new individual customer
   */
  srv.on('createCustomer', async (req) => {
    const { fullName, phone, email, address, birthday, notes } = req.data;
    
    // Generate a new UUID for the customer
    const customerID = cds.utils.uuid();
    const timestamp = new Date();
    
    try {
      // Insert the new customer
      await cds.transaction(req).run(
        INSERT.into(Customer).entries({
          ID: customerID,
          FullName: fullName,
          Phone: phone,
          Email: email,
          Address: address,
          BirthDay: birthday,
          Notes: notes,
          TotalTransactions: 0.00
        })
      );
      
      return {
        customerID: customerID,
        message: 'Customer created successfully'
      };
    } catch (error) {
      console.error(error);
      return {
        customerID: null,
        message: `Error creating customer: ${error.message}`
      };
    }
  });
  
  /**
   * Updates an existing individual customer
   */
  srv.on('updateCustomer', async (req) => {
    const { customerID, fullName, phone, email, address, birthday, notes } = req.data;
    
    try {
      // Update the customer
      const result = await cds.transaction(req).run(
        UPDATE(Customer)
          .set({
            FullName: fullName,
            Phone: phone,
            Email: email,
            Address: address,
            BirthDay: birthday,
            Notes: notes
          })
          .where({ ID: customerID })
      );
      
      if (result === 0) {
        return {
          success: false,
          message: 'Customer not found'
        };
      }
      
      return {
        success: true,
        message: 'Customer updated successfully'
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: `Error updating customer: ${error.message}`
      };
    }
  });
  
  /**
   * Deletes an individual customer
   */
  srv.on('deleteCustomer', async (req) => {
    const { customerID } = req.data;
    
    try {
      // Check if customer has related records
      const contracts = await SELECT.from(Contract).where({ CustomerID: customerID });
      const orders = await SELECT.from(Order).where({ CustomerID: customerID });
      
      if (contracts.length > 0 || orders.length > 0) {
        return {
          success: false,
          message: 'Cannot delete customer with associated contracts or orders'
        };
      }
      
      // Delete customer transactions
      await cds.transaction(req).run(
        DELETE.from(CustomerTransactionHistory).where({ CustomerID: customerID })
      );
      
      // Delete customer
      const result = await cds.transaction(req).run(
        DELETE.from(Customer).where({ ID: customerID })
      );
      
      if (result === 0) {
        return {
          success: false,
          message: 'Customer not found'
        };
      }
      
      return {
        success: true,
        message: 'Customer deleted successfully'
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: `Error deleting customer: ${error.message}`
      };
    }
  });
  
  /**
   * Records a transaction for an individual customer
   */
  srv.on('recordCustomerTransaction', async (req) => {
    const { customerID, amount, description } = req.data;
    const transactionID = cds.utils.uuid();
    const transactionDate = new Date();
    
    try {
      // Check if customer exists
      const customer = await SELECT.one.from(Customer).where({ ID: customerID });
      
      if (!customer) {
        return {
          transactionID: null,
          message: 'Customer not found'
        };
      }
      
      // Create transaction
      await cds.transaction(req).run(
        INSERT.into(CustomerTransactionHistory).entries({
          ID: transactionID,
          CustomerID: customerID,
          TransactionDate: transactionDate,
          Amount: amount,
          Description: description
        })
      );
      
      // Update customer's total transactions
      await cds.transaction(req).run(
        UPDATE(Customer)
          .set({ 
            TotalTransactions: { '+=': amount }
          })
          .where({ ID: customerID })
      );
      
      return {
        transactionID: transactionID,
        message: 'Transaction recorded successfully'
      };
    } catch (error) {
      console.error(error);
      return {
        transactionID: null,
        message: `Error recording transaction: ${error.message}`
      };
    }
  });
  
  /**
   * Gets detailed information about an individual customer
   */
  srv.on('getCustomerDetails', async (req) => {
    const { customerID } = req.data;
    
    try {
      // Get customer basic info
      const customer = await SELECT.one.from(Customer).where({ ID: customerID });
      
      if (!customer) {
        return req.error(404, 'Customer not found');
      }
      
      // Get customer transactions
      const transactions = await SELECT.from(CustomerTransactionHistory)
        .where({ CustomerID: customerID })
        .orderBy({ TransactionDate: 'desc' });
      
      // Get customer contracts
      const contracts = await SELECT.from(Contract)
        .where({ CustomerID: customerID })
        .orderBy({ ContractDate: 'desc' });
      
      // Get customer orders
      const orders = await SELECT.from(Order)
        .where({ CustomerID: customerID })
        .orderBy({ OrderDate: 'desc' });
      
      // Get tour names for contracts
      for (let i = 0; i < contracts.length; i++) {
        const tour = await SELECT.one.from('tourish.management.ActiveTour')
          .columns('TourName')
          .where({ ID: contracts[i].ActiveTourID });
        
        contracts[i].TourName = tour ? tour.TourName : 'Unknown';
      }
      
      // Get tour names for orders
      for (let i = 0; i < orders.length; i++) {
        const tour = await SELECT.one.from('tourish.management.ActiveTour')
          .columns('TourName')
          .where({ ID: orders[i].ActiveTourID });
        
        orders[i].TourName = tour ? tour.TourName : 'Unknown';
      }
      
      return {
        customer: customer,
        transactions: transactions,
        contracts: contracts,
        orders: orders
      };
    } catch (error) {
      console.error(error);
      return req.error(500, `Error retrieving customer details: ${error.message}`);
    }
  });
  
  /**
   * Lists individual customers with pagination and searching
   */
srv.on('listCustomers', async (req) => {
  const { searchTerm, skip, limit } = req.data;
  
  try {
    // Build the query
    let query = SELECT.from('tourish.management.Customer');
    let countQuery = SELECT.from('tourish.management.Customer').columns('count(*) as count');
    
    // Apply search if provided
    if (searchTerm && searchTerm.trim() !== '') {
      const searchCondition = `FullName LIKE '%${searchTerm}%' OR Email LIKE '%${searchTerm}%' OR Phone LIKE '%${searchTerm}%'`;
      query.where(searchCondition);
      countQuery.where(searchCondition);
    }
    
    // Get total count for pagination
    const countResult = await countQuery;
    const total = countResult[0]?.count || 0;
    
    // Apply pagination
    query.limit(limit || 10, skip || 0);
    
    // Execute query
    const customers = await query;
    
    return {
      items: customers,
      pagination: {
        total: total,
        skip: skip || 0,
        limit: limit || 10
      }
    };
  } catch (error) {
    console.error('Error in listCustomers:', error);
    return req.error(500, `Error listing customers: ${error.message}`);
  }
});
  
  // BUSINESS CUSTOMER MANAGEMENT
  
  /**
   * Creates a new business customer
   */
  srv.on('createBusinessCustomer', async (req) => {
    const { companyName, taxCode, contactPerson, position, phone, email, address, notes } = req.data;
    
    // Generate a new UUID for the business customer
    const customerID = cds.utils.uuid();
    
    try {
      // Insert the new business customer
      await cds.transaction(req).run(
        INSERT.into(BusinessCustomer).entries({
          ID: customerID,
          CompanyName: companyName,
          TaxCode: taxCode,
          ContactPerson: contactPerson,
          Position: position,
          Phone: phone,
          Email: email,
          Address: address,
          Notes: notes,
          TotalTransactions: 0.00
        })
      );
      
      return {
        customerID: customerID,
        message: 'Business customer created successfully'
      };
    } catch (error) {
      console.error(error);
      return {
        customerID: null,
        message: `Error creating business customer: ${error.message}`
      };
    }
  });
  
  /**
   * Updates an existing business customer
   */
  srv.on('updateBusinessCustomer', async (req) => {
    const { customerID, companyName, taxCode, contactPerson, position, phone, email, address, notes } = req.data;
    
    try {
      // Update the business customer
      const result = await cds.transaction(req).run(
        UPDATE(BusinessCustomer)
          .set({
            CompanyName: companyName,
            TaxCode: taxCode,
            ContactPerson: contactPerson,
            Position: position,
            Phone: phone,
            Email: email,
            Address: address,
            Notes: notes
          })
          .where({ ID: customerID })
      );
      
      if (result === 0) {
        return {
          success: false,
          message: 'Business customer not found'
        };
      }
      
      return {
        success: true,
        message: 'Business customer updated successfully'
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: `Error updating business customer: ${error.message}`
      };
    }
  });
  
  /**
   * Deletes a business customer
   */
  srv.on('deleteBusinessCustomer', async (req) => {
    const { customerID } = req.data;
    
    try {
      // Check if business customer has related records
      const contracts = await SELECT.from(Contract).where({ CustomerID: customerID });
      const orders = await SELECT.from(Order).where({ CustomerID: customerID });
      
      if (contracts.length > 0 || orders.length > 0) {
        return {
          success: false,
          message: 'Cannot delete business customer with associated contracts or orders'
        };
      }
      
      // Delete business customer transactions
      await cds.transaction(req).run(
        DELETE.from(BusinessCustomerTransactionHistory).where({ BusinessCustomerID: customerID })
      );
      
      // Delete business customer
      const result = await cds.transaction(req).run(
        DELETE.from(BusinessCustomer).where({ ID: customerID })
      );
      
      if (result === 0) {
        return {
          success: false,
          message: 'Business customer not found'
        };
      }
      
      return {
        success: true,
        message: 'Business customer deleted successfully'
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: `Error deleting business customer: ${error.message}`
      };
    }
  });
  
  /**
   * Records a transaction for a business customer
   */
  srv.on('recordBusinessCustomerTransaction', async (req) => {
    const { customerID, amount, description } = req.data;
    const transactionID = cds.utils.uuid();
    const transactionDate = new Date();
    
    try {
      // Check if business customer exists
      const customer = await SELECT.one.from(BusinessCustomer).where({ ID: customerID });
      
      if (!customer) {
        return {
          transactionID: null,
          message: 'Business customer not found'
        };
      }
      
      // Create transaction
      await cds.transaction(req).run(
        INSERT.into(BusinessCustomerTransactionHistory).entries({
          ID: transactionID,
          BusinessCustomerID: customerID,
          TransactionDate: transactionDate,
          Amount: amount,
          Description: description
        })
      );
      
      // Update business customer's total transactions
      await cds.transaction(req).run(
        UPDATE(BusinessCustomer)
          .set({ 
            TotalTransactions: { '+=': amount }
          })
          .where({ ID: customerID })
      );
      
      return {
        transactionID: transactionID,
        message: 'Transaction recorded successfully'
      };
    } catch (error) {
      console.error(error);
      return {
        transactionID: null,
        message: `Error recording transaction: ${error.message}`
      };
    }
  });
  
  /**
   * Gets detailed information about a business customer
   */
  srv.on('getBusinessCustomerDetails', async (req) => {
    const { customerID } = req.data;
    
    try {
      // Get business customer basic info
      const customer = await SELECT.one.from(BusinessCustomer).where({ ID: customerID });
      
      if (!customer) {
        return req.error(404, 'Business customer not found');
      }
      
      // Get business customer transactions
      const transactions = await SELECT.from(BusinessCustomerTransactionHistory)
        .where({ BusinessCustomerID: customerID })
        .orderBy({ TransactionDate: 'desc' });
      
      // Get business customer contracts
      const contracts = await SELECT.from(Contract)
        .where({ CustomerID: customerID })
        .orderBy({ ContractDate: 'desc' });
      
      // Get business customer orders
      const orders = await SELECT.from(Order)
        .where({ CustomerID: customerID })
        .orderBy({ OrderDate: 'desc' });
      
      // Get tour names for contracts
      for (let i = 0; i < contracts.length; i++) {
        const tour = await SELECT.one.from('tourish.management.ActiveTour')
          .columns('TourName')
          .where({ ID: contracts[i].ActiveTourID });
        
        contracts[i].TourName = tour ? tour.TourName : 'Unknown';
      }
      
      // Get tour names for orders
      for (let i = 0; i < orders.length; i++) {
        const tour = await SELECT.one.from('tourish.management.ActiveTour')
          .columns('TourName')
          .where({ ID: orders[i].ActiveTourID });
        
        orders[i].TourName = tour ? tour.TourName : 'Unknown';
      }
      
      return {
        customer: customer,
        transactions: transactions,
        contracts: contracts,
        orders: orders
      };
    } catch (error) {
      console.error(error);
      return req.error(500, `Error retrieving business customer details: ${error.message}`);
    }
  });
  
  /**
   * Lists business customers with pagination and searching
   */
  srv.on('listBusinessCustomers', async (req) => {
    const { searchTerm, skip, limit } = req.data;
    
    try {
      // Build the query
      let query = SELECT.from('tourish.management.BusinessCustomer');
      let countQuery = SELECT.from('tourish.management.BusinessCustomer').columns('count(*) as count');
      
      // Apply search if provided
      if (searchTerm && searchTerm.trim() !== '') {
        const searchCondition = `CompanyName LIKE '%${searchTerm}%' OR TaxCode LIKE '%${searchTerm}%' OR ContactPerson LIKE '%${searchTerm}%' OR Email LIKE '%${searchTerm}%' OR Phone LIKE '%${searchTerm}%'`;
        query.where(searchCondition);
        countQuery.where(searchCondition);
      }
      
      // Get total count for pagination
      const countResult = await countQuery;
      const total = countResult[0]?.count || 0;
      
      // Apply pagination
      query.limit(limit || 10, skip || 0);
      
      // Execute query
      const customers = await query;
      
      return {
        items: customers,
        pagination: {
          total: total,
          skip: skip || 0,
          limit: limit || 10
        }
      };
    } catch (error) {
      console.error('Error in listBusinessCustomers:', error);
      return req.error(500, `Error listing business customers: ${error.message}`);
    }
  });
  
  /**
   * Searches for all customers (individual and business)
   */
  srv.on('searchAllCustomers', async (req) => {
    const { searchTerm, customerType, skip, limit } = req.data;
    
    try {
      // Initialize results arrays
      let individualCustomers = [];
      let businessCustomers = [];
      let totalIndividual = 0;
      let totalBusiness = 0;
      
      // Search individual customers if requested
      if (customerType === 'Individual' || customerType === 'All') {
        let individualQuery = SELECT.from('tourish.management.Customer');
        let countIndividualQuery = SELECT.from('tourish.management.Customer').columns('count(*) as count');
        
        // Apply search if provided
        if (searchTerm && searchTerm.trim() !== '') {
          const searchCondition = `FullName LIKE '%${searchTerm}%' OR Email LIKE '%${searchTerm}%' OR Phone LIKE '%${searchTerm}%' OR Address LIKE '%${searchTerm}' `;
          individualQuery.where(searchCondition);
          countIndividualQuery.where(searchCondition);
        }
        
        // Get total count
        const countIndividualResult = await countIndividualQuery;
        totalIndividual = countIndividualResult[0]?.count || 0;
        
        // Apply pagination
        individualQuery.limit(limit || 10, skip || 0);
        
        // Execute query
        const individuals = await individualQuery;
        
        // Transform to required format
        individualCustomers = individuals.map(customer => ({
          ID: customer.ID,
          Type: 'Individual',
          Name: customer.FullName,
          Phone: customer.Phone,
          Address: customer.Address,
          Email: customer.Email,
          TotalTransactions: customer.TotalTransactions
        }));
      }
      
      // Search business customers if requested
      if (customerType === 'Business' || customerType === 'All') {
        let businessQuery = SELECT.from('tourish.management.BusinessCustomer');
        let countBusinessQuery = SELECT.from('tourish.management.BusinessCustomer').columns('count(*) as count');
        
        // Apply search if provided
        if (searchTerm && searchTerm.trim() !== '') {
          const searchCondition = `CompanyName LIKE '%${searchTerm}%' OR TaxCode LIKE '%${searchTerm}%' OR ContactPerson LIKE '%${searchTerm}%' OR Email LIKE '%${searchTerm}%' OR Phone LIKE '%${searchTerm}%'`;
          businessQuery.where(searchCondition);
          countBusinessQuery.where(searchCondition);
        }
        
        // Get total count
        const countBusinessResult = await countBusinessQuery;
        totalBusiness = countBusinessResult[0]?.count || 0;
        
        // Apply pagination
        businessQuery.limit(limit || 10, skip || 0);
        
        // Execute query
        const businesses = await businessQuery;
        
        // Transform to required format
        businessCustomers = businesses.map(customer => ({
          ID: customer.ID,
          Type: 'Business',
          Name: customer.CompanyName,
          Phone: customer.Phone,
          Address: customer.Address,
          Email: customer.Email,
          ContactPerson: customer.ContactPerson,
          TotalTransactions: customer.TotalTransactions
        }));
      }
      
      return {
        individualCustomers,
        businessCustomers,
        pagination: {
          totalIndividual,
          totalBusiness,
          skip: skip || 0,
          limit: limit || 10
        }
      };
    } catch (error) {
      console.error('Error in searchAllCustomers:', error);
      return req.error(500, `Error searching customers: ${error.message}`);
    }
  });
  /**
 * Gets statistics about customers
 */
srv.on('getCustomerStatistics', async (req) => {
  try {
    // Count total individual customers
    const totalIndividualQuery = SELECT.from('tourish.management.Customer')
      .columns('count(*) as count');
    const totalIndividualResult = await totalIndividualQuery;
    const totalIndividualCustomers = totalIndividualResult[0]?.count || 0;
    
    // Count total business customers
    const totalBusinessQuery = SELECT.from('tourish.management.BusinessCustomer')
      .columns('count(*) as count');
    const totalBusinessResult = await totalBusinessQuery;
    const totalBusinessCustomers = totalBusinessResult[0]?.count || 0;
    
    // Get top 10 individual customers by transaction amount
    const topIndividualQuery = SELECT.from('tourish.management.Customer')
      .columns('ID', 'FullName as Name', 'TotalTransactions')
      .orderBy({ TotalTransactions: 'desc' })
      .limit(10);
    const topIndividualCustomers = await topIndividualQuery;
    
    // Get top 10 business customers by transaction amount
    const topBusinessQuery = SELECT.from('tourish.management.BusinessCustomer')
      .columns('ID', 'CompanyName as Name', 'TotalTransactions')
      .orderBy({ TotalTransactions: 'desc' })
      .limit(10);
    const topBusinessCustomers = await topBusinessQuery;
    
    // Combine and sort top customers
    const top10ByTransaction = [
      ...topIndividualCustomers.map(c => ({ ...c, Type: 'Individual' })),
      ...topBusinessCustomers.map(c => ({ ...c, Type: 'Business' }))
    ].sort((a, b) => b.TotalTransactions - a.TotalTransactions).slice(0, 10);
    
    // Initialize customersByMonth array with default values for each month
    const customersByMonth = [];
    const currentDate = new Date();
    
    for (let i = 0; i < 6; i++) {
      const month = new Date(currentDate);
      month.setMonth(currentDate.getMonth() - i);
      
      // Format month as YYYY-MM
      const monthStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
      
      // Add default data for this month
      customersByMonth.push({
        Month: monthStr,
        IndividualCount: 0,  // Default to 0 since we can't query by creation date
        BusinessCount: 0     // Default to 0 since we can't query by creation date
      });
    }
    
    // Get recent transactions (last 10)
    const recentIndividualTransactions = await SELECT.from('tourish.management.CustomerTransactionHistory')
      .orderBy({ TransactionDate: 'desc' })
      .limit(10);
    
    const recentBusinessTransactions = await SELECT.from('tourish.management.BusinessCustomerTransactionHistory')
      .orderBy({ TransactionDate: 'desc' })
      .limit(10);
    
    // Lookup customer names for individual transactions
    for (let i = 0; i < recentIndividualTransactions.length; i++) {
      const customer = await SELECT.one.from('tourish.management.Customer')
        .columns('FullName')
        .where({ ID: recentIndividualTransactions[i].CustomerID });
      
      recentIndividualTransactions[i].CustomerName = customer ? customer.FullName : 'Unknown';
      recentIndividualTransactions[i].CustomerType = 'Individual';
    }
    
    // Lookup customer names for business transactions
    for (let i = 0; i < recentBusinessTransactions.length; i++) {
      const customer = await SELECT.one.from('tourish.management.BusinessCustomer')
        .columns('CompanyName')
        .where({ ID: recentBusinessTransactions[i].BusinessCustomerID });
      
      recentBusinessTransactions[i].CustomerName = customer ? customer.CompanyName : 'Unknown';
      recentBusinessTransactions[i].CustomerType = 'Business';
    }
    
    // Combine and sort transactions
    const recentTransactions = [
      ...recentIndividualTransactions.map(t => ({
        Date: t.TransactionDate,
        CustomerType: t.CustomerType,
        CustomerName: t.CustomerName,
        Amount: t.Amount,
        Description: t.Description
      })),
      ...recentBusinessTransactions.map(t => ({
        Date: t.TransactionDate,
        CustomerType: t.CustomerType,
        CustomerName: t.CustomerName,
        Amount: t.Amount,
        Description: t.Description
      }))
    ].sort((a, b) => new Date(b.Date) - new Date(a.Date)).slice(0, 10);
    
    return {
      totalIndividualCustomers,
      totalBusinessCustomers,
      top10ByTransaction,
      customersByMonth,
      recentTransactions
    };
  } catch (error) {
    console.error('Error in getCustomerStatistics:', error);
    return req.error(500, `Error getting customer statistics: ${error.message}`);
  }
});
};