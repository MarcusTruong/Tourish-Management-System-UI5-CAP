const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {
  const { Suppliers, Services, SupplierDebts } = this.entities;

  // Handler cho createSupplier
  this.on('createSupplier', async (req) => {
    const { supplierName, address, phone, email } = req.data;
    const tx = cds.transaction(req);

    try {
      const supplier = {
        ID: cds.utils.uuid(),
        SupplierName: supplierName,
        Address: address,
        Phone: phone,
        Email: email
      };
      const createdSupplier = await tx.run(INSERT.into(Suppliers).entries(supplier));
      await tx.commit();
      return {
        ID: createdSupplier.ID,
        SupplierName: createdSupplier.SupplierName,
        Address: createdSupplier.Address,
        Phone: createdSupplier.Phone,
        Email: createdSupplier.Email
      };
    } catch (error) {
      await tx.rollback();
      req.error(500, `Failed to create supplier: ${error.message}`);
    }
  });

  // Handler cho updateSupplier
  this.on('updateSupplier', async (req) => {
    const { supplierID, supplierName, address, phone, email } = req.data;
    const tx = cds.transaction(req);

    try {
      const supplier = await tx.run(SELECT.one.from(Suppliers).where({ ID: supplierID }));
      if (!supplier) {
        req.error(404, `Supplier with ID ${supplierID} not found`);
        return;
      }
      const updatedSupplier = await tx.run(
        UPDATE(Suppliers)
          .set({ SupplierName: supplierName, Address: address, Phone: phone, Email: email })
          .where({ ID: supplierID })
      );
      await tx.commit();
      return {
        ID: supplierID,
        SupplierName: supplierName,
        Address: address,
        Phone: phone,
        Email: email
      };
    } catch (error) {
      await tx.rollback();
      req.error(500, `Failed to update supplier: ${error.message}`);
    }
  });

  // Handler cho deleteSupplier
  this.on('deleteSupplier', async (req) => {
    const { supplierID } = req.data;
    const tx = cds.transaction(req);

    try {
      const supplier = await tx.run(SELECT.one.from(Suppliers).where({ ID: supplierID }));
      if (!supplier) {
        req.error(404, `Supplier with ID ${supplierID} not found`);
        return;
      }
      await tx.run(DELETE.from(Suppliers).where({ ID: supplierID }));
      await tx.commit();
      return true;
    } catch (error) {
      await tx.rollback();
      req.error(500, `Failed to delete supplier: ${error.message}`);
    }
  });

  // Handler cho createService
  this.on('createService', async (req) => {
    const { supplierID, serviceName, serviceType, description, price } = req.data;
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
      const createdService = await tx.run(INSERT.into(Services).entries(service));
      await tx.commit();
      return {
        ID: createdService.ID,
        SupplierID: createdService.SupplierID,
        ServiceName: createdService.ServiceName,
        ServiceType: createdService.ServiceType,
        Description: createdService.Description,
        Price: createdService.Price
      };
    } catch (error) {
      await tx.rollback();
      req.error(500, `Failed to create service: ${error.message}`);
    }
  });

  // Handler cho updateService
  this.on('updateService', async (req) => {
    const { serviceID, serviceName, serviceType, description, price } = req.data;
    const tx = cds.transaction(req);

    try {
      const service = await tx.run(SELECT.one.from(Services).where({ ID: serviceID }));
      if (!service) {
        req.error(404, `Service with ID ${serviceID} not found`);
        return;
      }
      const updatedService = await tx.run(
        UPDATE(Services)
          .set({ ServiceName: serviceName, ServiceType: serviceType, Description: description, Price: price })
          .where({ ID: serviceID })
      );
      await tx.commit();
      return {
        ID: serviceID,
        SupplierID: service.SupplierID,
        ServiceName: serviceName,
        ServiceType: serviceType,
        Description: description,
        Price: price
      };
    } catch (error) {
      await tx.rollback();
      req.error(500, `Failed to update service: ${error.message}`);
    }
  });

  // Handler cho deleteService
  this.on('deleteService', async (req) => {
    const { serviceID } = req.data;
    const tx = cds.transaction(req);

    try {
      const service = await tx.run(SELECT.one.from(Services).where({ ID: serviceID }));
      if (!service) {
        req.error(404, `Service with ID ${serviceID} not found`);
        return;
      }
      await tx.run(DELETE.from(Services).where({ ID: serviceID }));
      await tx.commit();
      return true;
    } catch (error) {
      await tx.rollback();
      req.error(500, `Failed to delete service: ${error.message}`);
    }
  });

  // Handler cho createSupplierDebt
  this.on('createSupplierDebt', async (req) => {
    const { supplierID, amount, dueDate, status } = req.data;
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
      const createdDebt = await tx.run(INSERT.into(SupplierDebts).entries(debt));
      await tx.commit();
      return {
        ID: createdDebt.ID,
        SupplierID: createdDebt.SupplierID,
        Amount: createdDebt.Amount,
        DueDate: createdDebt.DueDate,
        Status: createdDebt.Status
      };
    } catch (error) {
      await tx.rollback();
      req.error(500, `Failed to create supplier debt: ${error.message}`);
    }
  });

  // Handler cho markDebtAsPaid
  this.on('markDebtAsPaid', async (req) => {
    const { debtID } = req.data;
    const tx = cds.transaction(req);

    try {
      const debt = await tx.run(SELECT.one.from(SupplierDebts).where({ ID: debtID }));
      if (!debt) {
        req.error(404, `Debt with ID ${debtID} not found`);
        return;
      }
      const updatedDebt = await tx.run(
        UPDATE(SupplierDebts)
          .set({ Status: 'Completed' })
          .where({ ID: debtID })
      );
      await tx.commit();
      return {
        ID: debtID,
        SupplierID: debt.SupplierID,
        Amount: debt.Amount,
        DueDate: debt.DueDate,
        Status: 'Completed'
      };
    } catch (error) {
      await tx.rollback();
      req.error(500, `Failed to mark debt as paid: ${error.message}`);
    }
  });

  // Handler cho searchSuppliers
  this.on('searchSuppliers', async (req) => {
    const { searchTerm } = req.data;
    try {
      const suppliers = await SELECT.from(Suppliers)
        .where`SupplierName LIKE ${`%${searchTerm}%`} OR Email LIKE ${`%${searchTerm}%`} OR Phone LIKE ${`%${searchTerm}%`}`;
      return suppliers.map(s => ({
        ID: s.ID,
        SupplierName: s.SupplierName,
        Address: s.Address,
        Phone: s.Phone,
        Email: s.Email
      }));
    } catch (error) {
      req.error(500, `Failed to search suppliers: ${error.message}`);
    }
  });

  // Handler cho getSupplierDetails
  this.on('getSupplierDetails', async (req) => {
    const { supplierID } = req.data;
    try {
      const supplier = await SELECT.one.from(Suppliers).where({ ID: supplierID });
      if (!supplier) {
        req.error(404, `Supplier with ID ${supplierID} not found`);
        return;
      }
      const services = await SELECT.from(Services).where({ SupplierID: supplierID });
      const debts = await SELECT.from(SupplierDebts).where({ SupplierID: supplierID });
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
        }))
      };
    } catch (error) {
      req.error(500, `Failed to get supplier details: ${error.message}`);
    }
  });

  // Handler cho getActiveServices
  this.on('getActiveServices', async () => {
    try {
      const services = await SELECT.from(Services);
      return services.map(s => ({
        ID: s.ID,
        SupplierID: s.SupplierID,
        ServiceName: s.ServiceName,
        ServiceType: s.ServiceType,
        Description: s.Description,
        Price: s.Price
      }));
    } catch (error) {
      req.error(500, `Failed to get active services: ${error.message}`);
    }
  });
});