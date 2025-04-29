const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {
  const { Suppliers, Services, SupplierDebts } = this.entities;

  // Handler cho createSupplier
this.on('createSupplier', async (req) => {
  const { supplierName, address, phone, email } = req.data;
  
  // Validate input
  if (!supplierName || supplierName.trim() === '') {
    req.error(400, 'Supplier name is required');
    return;
  }
  
  if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    req.error(400, 'Invalid email format');
    return;
  }
  
  const tx = cds.transaction(req);

  try {
    console.log('Starting transaction for creating supplier');
    
    // Kiểm tra trùng lặp dựa trên tên, địa chỉ, email hoặc số điện thoại
    const duplicateChecks = [];
    
    if (supplierName) {
      duplicateChecks.push(`SupplierName = '${supplierName}'`);
    }
    
    if (email) {
      duplicateChecks.push(`Email = '${email}'`);
    }
    
    if (phone) {
      duplicateChecks.push(`Phone = '${phone}'`);
    }
    
    
    if (duplicateChecks.length > 0) {
      // Xây dựng câu lệnh truy vấn kiểm tra trùng lặp
      const duplicateQuery = SELECT.from(Suppliers).where(duplicateChecks.join(' OR '));
      const existingSuppliers = await tx.run(duplicateQuery);
      
      if (existingSuppliers.length > 0) {
        // Chuẩn bị thông báo lỗi chi tiết
        const existingSupplier = existingSuppliers[0];
        let duplicateReason = [];
        
        if (existingSupplier.SupplierName === supplierName) {
          duplicateReason.push(`name "${supplierName}"`);
        }
        
        if (existingSupplier.Email === email) {
          duplicateReason.push(`email "${email}"`);
        }
        
        if (existingSupplier.Phone === phone) {
          duplicateReason.push(`phone "${phone}"`);
        }
        
        const errorMessage = `Supplier already exists with the same ${duplicateReason.join(', ')}`;
        
        // Cung cấp thông tin về nhà cung cấp hiện có
        await tx.rollback();
        req.error(409, {
          message: errorMessage,
          existingSupplier: {
            ID: existingSupplier.ID,
            SupplierName: existingSupplier.SupplierName,
            Email: existingSupplier.Email,
            Phone: existingSupplier.Phone,
            Address: existingSupplier.Address
          }
        });
        return;
      }
    }
    
    // Nếu không có trùng lặp, tiếp tục tạo nhà cung cấp mới
    const supplier = {
      ID: cds.utils.uuid(),
      SupplierName: supplierName,
      Address: address,
      Phone: phone,
      Email: email
    };
    
    await tx.run(INSERT.into(Suppliers).entries(supplier));
    console.log('Supplier inserted:', supplier);

    const createdSupplier = await tx.run(SELECT.one.from(Suppliers).where({ ID: supplier.ID }));
    await tx.commit();
    console.log('Transaction committed successfully');

    return {
      ID: createdSupplier.ID,
      SupplierName: createdSupplier.SupplierName,
      Address: createdSupplier.Address,
      Phone: createdSupplier.Phone,
      Email: createdSupplier.Email
    };
  } catch (error) {
    console.error('Error occurred:', error);
    await tx.rollback();
    req.error(500, `Failed to create supplier: ${error.message}`);
  }
});

  // Handler cho updateSupplier
this.on('updateSupplier', async (req) => {
  const { supplierID, supplierName, address, phone, email } = req.data;
  console.log(`Executing updateSupplier with ID: ${supplierID}`);
  
  // Validate input
  if (!supplierID) {
    req.error(400, 'Supplier ID is required');
    return;
  }
  
  if (!supplierName || supplierName.trim() === '') {
    req.error(400, 'Supplier name is required');
    return;
  }
  
  if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    req.error(400, 'Invalid email format');
    return;
  }
  
  const tx = cds.transaction(req);

  try {
    // Kiểm tra xem nhà cung cấp cần cập nhật có tồn tại không
    const supplier = await tx.run(SELECT.one.from(Suppliers).where({ ID: supplierID }));
    if (!supplier) {
      req.error(404, `Supplier with ID ${supplierID} not found`);
      return;
    }
    
    // Kiểm tra trùng lặp với các nhà cung cấp khác
    const duplicateChecks = [];
    
    if (supplierName && supplierName !== supplier.SupplierName) {
      duplicateChecks.push(`SupplierName = '${supplierName}'`);
    }
    
    if (email && email !== supplier.Email) {
      duplicateChecks.push(`Email = '${email}'`);
    }
    
    if (phone && phone !== supplier.Phone) {
      duplicateChecks.push(`Phone = '${phone}'`);
    }
    
    if (duplicateChecks.length > 0) {
      // Xây dựng câu lệnh truy vấn kiểm tra trùng lặp (loại trừ nhà cung cấp hiện tại)
      const duplicateQuery = SELECT.from(Suppliers)
        .where(`(${duplicateChecks.join(' OR ')}) AND ID <> '${supplierID}'`);
      
      const existingSuppliers = await tx.run(duplicateQuery);
      
      if (existingSuppliers.length > 0) {
        // Chuẩn bị thông báo lỗi chi tiết
        const existingSupplier = existingSuppliers[0];
        let duplicateReason = [];
        
        if (supplierName && existingSupplier.SupplierName === supplierName) {
          duplicateReason.push(`name "${supplierName}"`);
        }
        
        if (email && existingSupplier.Email === email) {
          duplicateReason.push(`email "${email}"`);
        }
        
        if (phone && existingSupplier.Phone === phone) {
          duplicateReason.push(`phone "${phone}"`);
        }
        
        const errorMessage = `Cannot update: another supplier already exists with the same ${duplicateReason.join(', ')}`;
        
        // Cung cấp thông tin về nhà cung cấp trùng lặp
        await tx.rollback();
        req.error(409, {
          message: errorMessage,
          existingSupplier: {
            ID: existingSupplier.ID,
            SupplierName: existingSupplier.SupplierName,
            Email: existingSupplier.Email,
            Phone: existingSupplier.Phone,
            Address: existingSupplier.Address
          }
        });
        return;
      }
    }
    
    // Nếu không có trùng lặp, tiếp tục cập nhật
    await tx.run(
      UPDATE(Suppliers)
        .set({
          SupplierName: supplierName,
          Address: address,
          Phone: phone,
          Email: email
        })
        .where({ ID: supplierID })
    );
    
    await tx.commit();
    console.log('Supplier updated successfully');
    
    return {
      ID: supplierID,
      SupplierName: supplierName,
      Address: address,
      Phone: phone,
      Email: email
    };
  } catch (error) {
    console.error('Error occurred:', error);
    await tx.rollback();
    req.error(500, `Failed to update supplier: ${error.message}`);
  }
});

  // Handler cho deleteSupplier
  this.on('deleteSupplier', async (req) => {
    const { supplierID } = req.data;
    console.log(`Executing deleteSupplier with ID: ${supplierID}`);
    
    if (!supplierID) {
      req.error(400, 'Supplier ID is required');
      return;
    }
    
    const tx = cds.transaction(req);

    try {
      const supplier = await tx.run(SELECT.one.from(Suppliers).where({ ID: supplierID }));
      if (!supplier) {
        req.error(404, `Supplier with ID ${supplierID} not found`);
        return;
      }
      
      // Check if supplier has related services
      const relatedServices = await tx.run(SELECT.from(Services).where({ SupplierID: supplierID }));
      if (relatedServices.length > 0) {
        req.error(400, `Cannot delete supplier: ${relatedServices.length} related services exist. Delete them first.`);
        return;
      }

      // Check if supplier has related debts
      const relatedDebts = await tx.run(SELECT.from(SupplierDebts).where({ SupplierID: supplierID }));
      if (relatedDebts.length > 0) {
        req.error(400, `Cannot delete supplier: ${relatedDebts.length} related debts exist. Clear them first.`);
        return;
      }
      
      await tx.run(DELETE.from(Suppliers).where({ ID: supplierID }));
      await tx.commit();
      console.log('Supplier deleted successfully');
      
      return true;
    } catch (error) {
      console.error('Error occurred:', error);
      await tx.rollback();
      req.error(500, `Failed to delete supplier: ${error.message}`);
    }
  });

  // Handler cho createService
  this.on('createService', async (req) => {
    const { supplierID, serviceName, serviceType, description, price } = req.data;
    console.log(`Executing createService for supplier ID: ${supplierID}`);
    
    // Validate input
    if (!supplierID) {
      req.error(400, 'Supplier ID is required');
      return;
    }
    
    if (!serviceName || serviceName.trim() === '') {
      req.error(400, 'Service name is required');
      return;
    }
    
    if (price === undefined || price < 0) {
      req.error(400, 'Valid price is required');
      return;
    }
    
    const tx = cds.transaction(req);

    try {
      const supplier = await tx.run(SELECT.one.from(Suppliers).where({ ID: supplierID }));
      if (!supplier) {
        req.error(404, `Supplier with ID ${supplierID} not found`);
        return;
      }
      
      const service = {
        ID: cds.utils.uuid(),
        SupplierID: supplierID,
        ServiceName: serviceName,
        ServiceType: serviceType,
        Description: description,
        Price: price
      };
      
      await tx.run(INSERT.into(Services).entries(service));
      console.log('Service created:', service);
      
      const createdService = await tx.run(SELECT.one.from(Services).where({ ID: service.ID }));
      await tx.commit();
      console.log('Transaction committed successfully');
      
      return {
        ID: createdService.ID,
        SupplierID: createdService.SupplierID,
        ServiceName: createdService.ServiceName,
        ServiceType: createdService.ServiceType,
        Description: createdService.Description,
        Price: createdService.Price
      };
    } catch (error) {
      console.error('Error occurred:', error);
      await tx.rollback();
      req.error(500, `Failed to create service: ${error.message}`);
    }
  });

  // Handler cho updateService
  this.on('updateService', async (req) => {
    const { serviceID, serviceName, serviceType, description, price } = req.data;
    console.log(`Executing updateService with ID: ${serviceID}`);
    
    // Validate input
    if (!serviceID) {
      req.error(400, 'Service ID is required');
      return;
    }
    
    if (!serviceName || serviceName.trim() === '') {
      req.error(400, 'Service name is required');
      return;
    }
    
    if (price === undefined || price < 0) {
      req.error(400, 'Valid price is required');
      return;
    }
    
    const tx = cds.transaction(req);

    try {
      const service = await tx.run(SELECT.one.from(Services).where({ ID: serviceID }));
      if (!service) {
        req.error(404, `Service with ID ${serviceID} not found`);
        return;
      }
      
      await tx.run(
        UPDATE(Services)
          .set({ 
            ServiceName: serviceName, 
            ServiceType: serviceType, 
            Description: description, 
            Price: price 
          })
          .where({ ID: serviceID })
      );
      
      await tx.commit();
      console.log('Service updated successfully');
      
      return {
        ID: serviceID,
        SupplierID: service.SupplierID,
        ServiceName: serviceName,
        ServiceType: serviceType,
        Description: description,
        Price: price
      };
    } catch (error) {
      console.error('Error occurred:', error);
      await tx.rollback();
      req.error(500, `Failed to update service: ${error.message}`);
    }
  });

  // Handler cho deleteService
  this.on('deleteService', async (req) => {
    const { serviceID } = req.data;
    console.log(`Executing deleteService with ID: ${serviceID}`);
    
    if (!serviceID) {
      req.error(400, 'Service ID is required');
      return;
    }
    
    const tx = cds.transaction(req);

    try {
      const service = await tx.run(SELECT.one.from(Services).where({ ID: serviceID }));
      if (!service) {
        req.error(404, `Service with ID ${serviceID} not found`);
        return;
      }
      
      // Check if service is used in any tours (need to check TourService entity)
      try {
        const { TourServices } = this.entities;
        const relatedTours = await tx.run(SELECT.from(TourServices).where({ ServiceID: serviceID }));
        if (relatedTours.length > 0) {
          req.error(400, `Cannot delete service: Service is currently used in ${relatedTours.length} tours`);
          return;
        }
      } catch (e) {
        console.log('TourService entity check skipped', e.message);
        // In case TourService is not properly exposed to this service
      }
      
      await tx.run(DELETE.from(Services).where({ ID: serviceID }));
      await tx.commit();
      console.log('Service deleted successfully');
      
      return true;
    } catch (error) {
      console.error('Error occurred:', error);
      await tx.rollback();
      req.error(500, `Failed to delete service: ${error.message}`);
    }
  });

  // Handler cho createSupplierDebt
  this.on('createSupplierDebt', async (req) => {
    const { supplierID, amount, dueDate, status } = req.data;
    console.log(`Executing createSupplierDebt for supplier ID: ${supplierID}`);
    
    // Validate input
    if (!supplierID) {
      req.error(400, 'Supplier ID is required');
      return;
    }
    
    if (amount === undefined || amount <= 0) {
      req.error(400, 'Valid amount is required');
      return;
    }
    
    if (!dueDate) {
      req.error(400, 'Due date is required');
      return;
    }
    
    const tx = cds.transaction(req);

    try {
      const supplier = await tx.run(SELECT.one.from(Suppliers).where({ ID: supplierID }));
      if (!supplier) {
        req.error(404, `Supplier with ID ${supplierID} not found`);
        return;
      }
      
      const debt = {
        ID: cds.utils.uuid(),
        SupplierID: supplierID,
        Amount: amount,
        DueDate: dueDate,
        Status: status || 'Pending'
      };
      
      await tx.run(INSERT.into(SupplierDebts).entries(debt));
      console.log('Supplier debt created:', debt);
      
      const createdDebt = await tx.run(SELECT.one.from(SupplierDebts).where({ ID: debt.ID }));
      await tx.commit();
      console.log('Transaction committed successfully');
      
      return {
        ID: createdDebt.ID,
        SupplierID: createdDebt.SupplierID,
        Amount: createdDebt.Amount,
        DueDate: createdDebt.DueDate,
        Status: createdDebt.Status
      };
    } catch (error) {
      console.error('Error occurred:', error);
      await tx.rollback();
      req.error(500, `Failed to create supplier debt: ${error.message}`);
    }
  });

  // Handler cho markDebtAsPaid
  this.on('markDebtAsPaid', async (req) => {
    const { debtID } = req.data;
    console.log(`Executing markDebtAsPaid with ID: ${debtID}`);
    
    if (!debtID) {
      req.error(400, 'Debt ID is required');
      return;
    }
    
    const tx = cds.transaction(req);

    try {
      const debt = await tx.run(SELECT.one.from(SupplierDebts).where({ ID: debtID }));
      if (!debt) {
        req.error(404, `Debt with ID ${debtID} not found`);
        return;
      }
      
      if (debt.Status === 'Completed') {
        req.error(400, 'This debt has already been marked as paid');
        return;
      }
      
      await tx.run(
        UPDATE(SupplierDebts)
          .set({ Status: 'Completed' })
          .where({ ID: debtID })
      );
      
      await tx.commit();
      console.log('Debt marked as paid successfully');
      
      return {
        ID: debtID,
        SupplierID: debt.SupplierID,
        Amount: debt.Amount,
        DueDate: debt.DueDate,
        Status: 'Completed'
      };
    } catch (error) {
      console.error('Error occurred:', error);
      await tx.rollback();
      req.error(500, `Failed to mark debt as paid: ${error.message}`);
    }
  });

  // Handler cho searchSuppliers
  this.on('searchSuppliers', async (req) => {
    const { searchTerm, skip = 0, limit = 20 } = req.data;
    console.log(`Executing searchSuppliers with term: ${searchTerm}`);
    
    try {
      let query = SELECT.from(Suppliers);
      
      if (searchTerm && searchTerm.trim() !== '') {
        query = query.where`SupplierName LIKE ${`%${searchTerm}%`} OR Email LIKE ${`%${searchTerm}%`} OR Phone LIKE ${`%${searchTerm}%`} OR Address LIKE ${`%${searchTerm}%`}`;
      }
      
      // Add pagination
      const suppliers = await query.limit(limit, skip);
      
      // Get total count for pagination
      const countQuery = SELECT.one.from(Suppliers).columns('count(*) as count');
      if (searchTerm && searchTerm.trim() !== '') {
        countQuery.where`SupplierName LIKE ${`%${searchTerm}%`} OR Email LIKE ${`%${searchTerm}%`} OR Phone LIKE ${`%${searchTerm}%`} OR Address LIKE ${`%${searchTerm}%`}`;
      }
      const countResult = await countQuery;
      
      return {
        items: suppliers.map(s => ({
          ID: s.ID,
          SupplierName: s.SupplierName,
          Address: s.Address,
          Phone: s.Phone,
          Email: s.Email
        })),
        pagination: {
          total: countResult ? countResult.count : 0,
          skip: skip,
          limit: limit
        }
      };
    } catch (error) {
      console.error('Error occurred:', error);
      req.error(500, `Failed to search suppliers: ${error.message}`);
    }
  });

  // Handler cho getSupplierDetails
  this.on('getSupplierDetails', async (req) => {
    const { supplierID } = req.data;
    console.log(`Executing getSupplierDetails for ID: ${supplierID}`);
    
    if (!supplierID) {
      req.error(400, 'Supplier ID is required');
      return;
    }
    
    try {
      const supplier = await SELECT.one.from(Suppliers).where({ ID: supplierID });
      if (!supplier) {
        req.error(404, `Supplier with ID ${supplierID} not found`);
        return;
      }
      
      const services = await SELECT.from(Services).where({ SupplierID: supplierID });
      const debts = await SELECT.from(SupplierDebts).where({ SupplierID: supplierID });
      
      // Calculate debt statistics
      const totalDebt = debts.reduce((sum, debt) => sum + Number(debt.Amount), 0);
      const pendingDebt = debts
        .filter(debt => debt.Status === 'Pending')
        .reduce((sum, debt) => sum + Number(debt.Amount), 0);
      
      console.log('Supplier details retrieved successfully');
      
      return {
        supplier: {
          ID: supplier.ID,
          SupplierName: supplier.SupplierName,
          Address: supplier.Address,
          Phone: supplier.Phone,
          Email: supplier.Email
        },
        services: services.map(s => ({
          ID: s.ID,
          SupplierID: s.SupplierID,
          ServiceName: s.ServiceName,
          ServiceType: s.ServiceType,
          Description: s.Description,
          Price: s.Price
        })),
        debts: debts.map(d => ({
          ID: d.ID,
          SupplierID: d.SupplierID,
          Amount: d.Amount,
          DueDate: d.DueDate,
          Status: d.Status
        })),
        debtStatistics: {
          totalDebt: totalDebt,
          pendingDebt: pendingDebt,
          completedDebt: totalDebt - pendingDebt,
          debtCount: debts.length,
          pendingDebtCount: debts.filter(debt => debt.Status === 'Pending').length
        }
      };
    } catch (error) {
      console.error('Error occurred:', error);
      req.error(500, `Failed to get supplier details: ${error.message}`);
    }
  });

  // Handler cho getActiveServices
  this.on('getActiveServices', async (req) => {
    const { serviceType, limit = 50 } = req.data || {};
    console.log('Executing getActiveServices');
    
    try {
      let query = SELECT.from(Services);
      
      if (serviceType) {
        query = query.where({ ServiceType: serviceType });
      }
      
      query = query.limit(limit);
      
      const services = await query;
      
      console.log(`Retrieved ${services.length} active services`);
      
      return services.map(s => ({
        ID: s.ID,
        SupplierID: s.SupplierID,
        ServiceName: s.ServiceName,
        ServiceType: s.ServiceType,
        Description: s.Description,
        Price: s.Price
      }));
    } catch (error) {
      console.error('Error occurred:', error);
      req.error(500, `Failed to get active services: ${error.message}`);
    }
  });

  // Function để tìm kiếm dịch vụ nâng cao
this.on('searchServices', async (req) => {
  const { supplierID, serviceType, searchTerm, minPrice, maxPrice, skip = 0, limit = 20 } = req.data;
  console.log('Executing searchServices with filters');
  
  try {
    // Xây dựng truy vấn
    let query = SELECT.from(Services);
    let whereConditions = [];
    
    // Thêm điều kiện supplierID nếu có
    if (supplierID) {
      whereConditions.push(`SupplierID = '${supplierID}'`);
    }
    
    // Thêm điều kiện serviceType nếu có
    if (serviceType) {
      whereConditions.push(`ServiceType = '${serviceType}'`);
    }
    
    // Thêm điều kiện tìm kiếm theo tên hoặc mô tả
    if (searchTerm && searchTerm.trim() !== '') {
      whereConditions.push(`(ServiceName LIKE '%${searchTerm}%' OR Description LIKE '%${searchTerm}%')`);
    }
    
    // Thêm điều kiện khoảng giá
    if (minPrice !== undefined && maxPrice !== undefined) {
      whereConditions.push(`Price >= ${minPrice} AND Price <= ${maxPrice}`);
    } else if (minPrice !== undefined) {
      whereConditions.push(`Price >= ${minPrice}`);
    } else if (maxPrice !== undefined) {
      whereConditions.push(`Price <= ${maxPrice}`);
    }
    
    // Kết hợp các điều kiện với AND
    if (whereConditions.length > 0) {
      query = query.where(whereConditions.join(' AND '));
    }
    
    // Thêm limit và offset
    query = query.limit(limit, skip);
    
    const services = await query;
    console.log(`Found ${services.length} services matching criteria`);
    
    // Lấy thông tin nhà cung cấp cho mỗi dịch vụ
    const result = [];
    for (const service of services) {
      const supplier = await SELECT.one.from(Suppliers).where({ ID: service.SupplierID });
      result.push({
        ID: service.ID,
        SupplierID: service.SupplierID,
        SupplierName: supplier ? supplier.SupplierName : 'Unknown',
        ServiceName: service.ServiceName,
        ServiceType: service.ServiceType,
        Description: service.Description,
        Price: service.Price
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error occurred:', error);
    req.error(500, `Failed to search services: ${error.message}`);
  }
});

  // Báo cáo công nợ nhà cung cấp
this.on('getSupplierDebtReport', async (req) => {
  const { startDate, endDate, status } = req.data || {};
  console.log('Executing getSupplierDebtReport');
  
  try {
    // Xây dựng truy vấn
    let query = SELECT.from(SupplierDebts);
    let whereConditions = [];
    
    // Thêm điều kiện status nếu có
    if (status) {
      whereConditions.push(`Status = '${status}'`);
    }
    
    // Thêm điều kiện thời gian
    if (startDate && endDate) {
      whereConditions.push(`DueDate >= '${startDate}' AND DueDate <= '${endDate}'`);
    } else if (startDate) {
      whereConditions.push(`DueDate >= '${startDate}'`);
    } else if (endDate) {
      whereConditions.push(`DueDate <= '${endDate}'`);
    }
    
    // Kết hợp các điều kiện với AND
    if (whereConditions.length > 0) {
      query = query.where(whereConditions.join(' AND '));
    }
    
    const debts = await query;
    console.log(`Found ${debts.length} debts matching criteria`);
    
    // Grouping by supplier
    const debtsBySupplier = {};
    for (const debt of debts) {
      if (!debtsBySupplier[debt.SupplierID]) {
        const supplier = await SELECT.one.from(Suppliers).where({ ID: debt.SupplierID });
        debtsBySupplier[debt.SupplierID] = {
          supplierID: debt.SupplierID,
          supplierName: supplier ? supplier.SupplierName : 'Unknown',
          totalDebt: 0,
          pendingDebt: 0,
          completedDebt: 0,
          debts: []
        };
      }
      
      debtsBySupplier[debt.SupplierID].debts.push({
        ID: debt.ID,
        Amount: debt.Amount,
        DueDate: debt.DueDate,
        Status: debt.Status
      });
      
      debtsBySupplier[debt.SupplierID].totalDebt += Number(debt.Amount);
      if (debt.Status === 'Pending') {
        debtsBySupplier[debt.SupplierID].pendingDebt += Number(debt.Amount);
      } else if (debt.Status === 'Completed') {
        debtsBySupplier[debt.SupplierID].completedDebt += Number(debt.Amount);
      }
    }
    
    // Calculate total statistics
    const totalStats = {
      totalDebt: 0,
      pendingDebt: 0,
      completedDebt: 0,
      supplierCount: Object.keys(debtsBySupplier).length,
      debtCount: debts.length
    };
    
    Object.values(debtsBySupplier).forEach(supplier => {
      totalStats.totalDebt += supplier.totalDebt;
      totalStats.pendingDebt += supplier.pendingDebt;
      totalStats.completedDebt += supplier.completedDebt;
    });
    
    return {
      suppliers: Object.values(debtsBySupplier),
      statistics: totalStats
    };
  } catch (error) {
    console.error('Error occurred:', error);
    req.error(500, `Failed to get supplier debt report: ${error.message}`);
  }
});

  // Thêm function mới: getServiceTypes - lấy danh sách các loại dịch vụ hiện có
  this.on('getServiceTypes', async () => {
    console.log('Executing getServiceTypes');
    
    try {
      const services = await SELECT.from(Services);
      
      // Extract unique service types
      const serviceTypes = [...new Set(services.map(s => s.ServiceType))].filter(Boolean);
      
      console.log(`Found ${serviceTypes.length} unique service types`);
      
      return serviceTypes;
    } catch (error) {
      console.error('Error occurred:', error);
      req.error(500, `Failed to get service types: ${error.message}`);
    }
  });
});