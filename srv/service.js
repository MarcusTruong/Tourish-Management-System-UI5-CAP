const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {
  const { Workspaces, Users, Tours, TourSchedules, Orders, Customers } = this.entities;

  // Handler for creating a tour with schedules
  this.on('createTour', async (req) => {
    const { tour, schedules } = req.data;
    const tx = cds.transaction(req);

    try {
      // Generate UUID for the tour
      tour.ID = cds.utils.uuid();

      // Insert the tour
      const createdTour = await tx.run(INSERT.into(Tours).entries(tour));

      // Add schedules if provided
      if (schedules && schedules.length > 0) {
        const scheduleEntries = schedules.map(schedule => ({
          ID: cds.utils.uuid(),
          TourID: tour.ID,
          ...schedule
        }));
        await tx.run(INSERT.into(TourSchedules).entries(scheduleEntries));
      }

      await tx.commit();
      return createdTour;
    } catch (error) {
      await tx.rollback();
      req.error(500, `Failed to create tour: ${error.message}`);
    }
  });

  // Handler for creating an order
  this.on('createOrder', async (req) => {
    const { order, customerID, tourID } = req.data;
    const tx = cds.transaction(req);

    try {
      // Validate customer and tour existence
      const customer = await tx.run(SELECT.one.from(Customers).where({ ID: customerID }));
      if (!customer) {
        req.error(404, `Customer with ID ${customerID} not found`);
        return;
      }

      const tour = await tx.run(SELECT.one.from(Tours).where({ ID: tourID }));
      if (!tour) {
        req.error(404, `Tour with ID ${tourID} not found`);
        return;
      }

      // Generate UUID for the order
      order.ID = cds.utils.uuid();
      order.CustomerID = customerID;
      order.TourID = tourID;
      order.OrderDate = new Date();
      order.Status = 'Pending';

      // Calculate total amount based on tour price (simplified logic)
      order.TotalAmount = tour.Price;

      // Insert the order
      const createdOrder = await tx.run(INSERT.into(Orders).entries(order));

      await tx.commit();
      return createdOrder;
    } catch (error) {
      await tx.rollback();
      req.error(500, `Failed to create order: ${error.message}`);
    }
  });

  // Before creating a user, ensure the workspace exists and set default role
  this.before('CREATE', Users, async (req) => {
    const { WorkspaceID } = req.data;
    const workspace = await SELECT.one.from(Workspaces).where({ ID: WorkspaceID });
    if (!workspace) {
      req.error(404, `Workspace with ID ${WorkspaceID} not found`);
    }
    req.data.Status = 'Active'; // Default status
  });

  // Before creating a tour, validate the creator (User)
  this.before('CREATE', Tours, async (req) => {
    const { CreatedByID } = req.data;
    const user = await SELECT.one.from(Users).where({ ID: CreatedByID });
    if (!user) {
      req.error(404, `User with ID ${CreatedByID} not found`);
    }
  });
});