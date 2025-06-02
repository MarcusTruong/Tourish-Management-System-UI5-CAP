/**
 * Implementation for Tour Service
 */
const cds = require('@sap/cds');
const cloudinaryService = require('./cloudinary-service');

module.exports = async (srv) => {
  cloudinaryService(srv);

  const { 
    TourTemplates, TourTemplateImages, TourTemplateSchedules, 
    TourTemplateActivities, TourTemplatePriceTerms, TourTemplateHistories,
    ActiveTours, Passengers, ActiveTourServices, 
    TourEstimates, TourCostItems, ActiveTourHistories 
  } = srv.entities;

  // TOUR TEMPLATE MANAGEMENT - STEP 1: Basic Information
  
  /**
   * Creates a new tour template with basic information and images
   */
  srv.on('createTourTemplateBasicInfo', async (req) => {
    const { templateName, description, numberDays, numberNights, tourType, images } = req.data;
    
    // Generate a new cds.utils.uuid for the template
    const templateID = cds.utils.uuid();
    const timestamp = new Date();
    const user = req.user.id || 'system';
    
    // Create the tour template
    await cds.transaction(req).run(
      INSERT.into(TourTemplates).entries({
        ID: templateID,
        TemplateName: templateName,
        Description: description,
        NumberDays: numberDays,
        NumberNights: numberNights,
        TourType: tourType,
        CreatedByID: user,
        CreatedAt: timestamp,
        UpdatedAt: timestamp,
        Status: 'Draft'
      })
    );
    
    // Add images if provided
    if (images && images.length > 0) {
      const imageEntries = images.map(img => ({
        ID: cds.utils.uuid(),
        TourTemplateID: templateID,
        ImageURL: img.imageURL,
        Caption: img.caption,
        IsMain: img.isMain
      }));
      
      await cds.transaction(req).run(
        INSERT.into(TourTemplateImages).entries(imageEntries)
      );
    }
    
    // Log the history
    await cds.transaction(req).run(
      INSERT.into(TourTemplateHistories).entries({
        ID: cds.utils.uuid(),
        TourTemplateID: templateID,
        ModifiedDate: timestamp,
        ModifiedBy: user,
        Changes: 'Created tour template with basic information'
      })
    );
    
    return {
      templateID: templateID,
      templateName: templateName,
      message: 'Tour template created successfully'
    };
  });
  
  /**
   * Updates basic information for a tour template
   */
  srv.on('updateTourTemplateBasicInfo', async (req) => {
    const { templateID, templateName, description, numberDays, numberNights, tourType } = req.data;
    const timestamp = new Date();
    const user = req.user.id || 'system';
    
    try {
      // Update the tour template
      const result = await cds.transaction(req).run(
        UPDATE(TourTemplates)
          .set({
            TemplateName: templateName,
            Description: description,
            NumberDays: numberDays,
            NumberNights: numberNights,
            TourType: tourType,
            UpdatedAt: timestamp
          })
          .where({ ID: templateID })
      );
      
      if (result === 0) {
        return {
          success: false,
          message: 'Tour template not found'
        };
      }
      
      // Log the history
      await cds.transaction(req).run(
        INSERT.into(TourTemplateHistories).entries({
          ID: cds.utils.uuid(),
          TourTemplateID: templateID,
          ModifiedDate: timestamp,
          ModifiedBy: user,
          Changes: 'Updated basic information'
        })
      );
      
      return {
        success: true,
        message: 'Tour template updated successfully'
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: `Error updating tour template: ${error.message}`
      };
    }
  });
  
  /**
   * Adds an image to a tour template
   */
  srv.on('addImageToTemplate', async (req) => {
    const { templateID, imageURL, caption, isMain } = req.data;
    const imageID = cds.utils.uuid();
    
    try {
      // If isMain is true, set all other images to non-main
      if (isMain) {
        await cds.transaction(req).run(
          UPDATE(TourTemplateImages)
            .set({ IsMain: false })
            .where({ TourTemplateID: templateID })
        );
      }
      
      // Create the new image
      await cds.transaction(req).run(
        INSERT.into(TourTemplateImages).entries({
          ID: imageID,
          TourTemplateID: templateID,
          ImageURL: imageURL,
          Caption: caption,
          IsMain: isMain
        })
      );
      
      return {
        imageID: imageID,
        message: 'Image added successfully'
      };
    } catch (error) {
      console.error(error);
      return {
        imageID: null,
        message: `Error adding image: ${error.message}`
      };
    }
  });
  
  /**
   * Removes an image from a tour template
   */
  srv.on('removeImageFromTemplate', async (req) => {
    const { imageID } = req.data;
    
    try {
      // Get image info to check if it's a main image
      const image = await SELECT.one.from(TourTemplateImages).where({ ID: imageID });
      
      if (!image) {
        return {
          success: false,
          message: 'Image not found'
        };
      }
      
      // Delete the image
      await cds.transaction(req).run(
        DELETE.from(TourTemplateImages).where({ ID: imageID })
      );
      
      // If it was a main image, set another image as main if any exists
      if (image.IsMain) {
        const remainingImages = await SELECT.from(TourTemplateImages)
          .where({ TourTemplateID: image.TourTemplateID })
          .limit(1);
          
        if (remainingImages.length > 0) {
          await cds.transaction(req).run(
            UPDATE(TourTemplateImages)
              .set({ IsMain: true })
              .where({ ID: remainingImages[0].ID })
          );
        }
      }
      
      return {
        success: true,
        message: 'Image removed successfully'
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: `Error removing image: ${error.message}`
      };
    }
  });
  
  /**
   * Sets an image as the main image for a tour template
   */
  srv.on('setMainImage', async (req) => {
    const { imageID, templateID } = req.data;
    
    try {
      // First reset all images to non-main
      await cds.transaction(req).run(
        UPDATE(TourTemplateImages)
          .set({ IsMain: false })
          .where({ TourTemplateID: templateID })
      );
      
      // Set the specified image as main
      const result = await cds.transaction(req).run(
        UPDATE(TourTemplateImages)
          .set({ IsMain: true })
          .where({ ID: imageID })
      );
      
      if (result === 0) {
        return {
          success: false,
          message: 'Image not found'
        };
      }
      
      return {
        success: true,
        message: 'Main image set successfully'
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: `Error setting main image: ${error.message}`
      };
    }
  });
  
  // TOUR TEMPLATE MANAGEMENT - STEP 2: Schedules
  
  /**
   * Adds schedules to a tour template
   */
  srv.on('addTourTemplateSchedules', async (req) => {
    const { templateID, schedules } = req.data;
    const timestamp = new Date();
    const user = req.user.id || 'system';
    
    try {
      // Process and insert each schedule
      for (const schedule of schedules) {
        const scheduleID = cds.utils.uuid();
        
        // Insert schedule
        await cds.transaction(req).run(
          INSERT.into(TourTemplateSchedules).entries({
            ID: scheduleID,
            TourTemplateID: templateID,
            DayNumber: schedule.dayNumber,
            DayTitle: schedule.dayTitle,
            Overview: schedule.overview,
            BreakfastIncluded: schedule.breakfastIncluded,
            LunchIncluded: schedule.lunchIncluded,
            DinnerIncluded: schedule.dinnerIncluded
          })
        );
        
        // Insert activities if provided
        if (schedule.activities && schedule.activities.length > 0) {
          const activityEntries = schedule.activities.map(activity => ({
            ID: cds.utils.uuid(),
            ScheduleID: scheduleID,
            StartTime: activity.startTime,
            EndTime: activity.endTime,
            Title: activity.title,
            Description: activity.description
          }));
          
          await cds.transaction(req).run(
            INSERT.into(TourTemplateActivities).entries(activityEntries)
          );
        }
      }
      
      // Log the history
      await cds.transaction(req).run(
        INSERT.into(TourTemplateHistories).entries({
          ID: cds.utils.uuid(),
          TourTemplateID: templateID,
          ModifiedDate: timestamp,
          ModifiedBy: user,
          Changes: 'Added tour schedules'
        })
      );
      
      // Update template status
      await cds.transaction(req).run(
        UPDATE(TourTemplates)
          .set({ UpdatedAt: timestamp })
          .where({ ID: templateID })
      );
      
      return {
        success: true,
        message: 'Tour schedules added successfully'
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: `Error adding tour schedules: ${error.message}`
      };
    }
  });
  
  /**
   * Updates a tour template schedule
   */
  srv.on('updateTourTemplateSchedule', async (req) => {
    const { scheduleID, dayTitle, overview, breakfastIncluded, lunchIncluded, dinnerIncluded } = req.data;
    
    try {
      // Update the schedule
      const result = await cds.transaction(req).run(
        UPDATE(TourTemplateSchedules)
          .set({
            DayTitle: dayTitle,
            Overview: overview,
            BreakfastIncluded: breakfastIncluded,
            LunchIncluded: lunchIncluded,
            DinnerIncluded: dinnerIncluded
          })
          .where({ ID: scheduleID })
      );
      
      if (result === 0) {
        return {
          success: false,
          message: 'Schedule not found'
        };
      }
      
      // Get the template ID for updating timestamp
      const schedule = await SELECT.one.from(TourTemplateSchedules).where({ ID: scheduleID });
      
      if (schedule) {
        await cds.transaction(req).run(
          UPDATE(TourTemplates)
            .set({ UpdatedAt: new Date() })
            .where({ ID: schedule.TourTemplateID })
        );
      }
      
      return {
        success: true,
        message: 'Schedule updated successfully'
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: `Error updating schedule: ${error.message}`
      };
    }
  });
  
  /**
   * Adds an activity to a schedule
   */
  srv.on('addActivityToSchedule', async (req) => {
    const { scheduleID, startTime, endTime, title, description } = req.data;
    const activityID = cds.utils.uuid();
    
    try {
      // Create the activity
      await cds.transaction(req).run(
        INSERT.into(TourTemplateActivities).entries({
          ID: activityID,
          ScheduleID: scheduleID,
          StartTime: startTime,
          EndTime: endTime,
          Title: title,
          Description: description
        })
      );
      
      return {
        activityID: activityID,
        message: 'Activity added successfully'
      };
    } catch (error) {
      console.error(error);
      return {
        activityID: null,
        message: `Error adding activity: ${error.message}`
      };
    }
  });
  
  /**
   * Updates an activity
   */
  srv.on('updateActivity', async (req) => {
    const { activityID, startTime, endTime, title, description } = req.data;
    
    try {
      // Update the activity
      const result = await cds.transaction(req).run(
        UPDATE(TourTemplateActivities)
          .set({
            StartTime: startTime,
            EndTime: endTime,
            Title: title,
            Description: description
          })
          .where({ ID: activityID })
      );
      
      if (result === 0) {
        return {
          success: false,
          message: 'Activity not found'
        };
      }
      
      return {
        success: true,
        message: 'Activity updated successfully'
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: `Error updating activity: ${error.message}`
      };
    }
  });
  
  /**
   * Deletes an activity
   */
  srv.on('deleteActivity', async (req) => {
    const { activityID } = req.data;
    
    try {
      // Delete the activity
      const result = await cds.transaction(req).run(
        DELETE.from(TourTemplateActivities).where({ ID: activityID })
      );
      
      if (result === 0) {
        return {
          success: false,
          message: 'Activity not found'
        };
      }
      
      return {
        success: true,
        message: 'Activity deleted successfully'
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: `Error deleting activity: ${error.message}`
      };
    }
  });
  
  // TOUR TEMPLATE MANAGEMENT - STEP 3: Price Terms
  
  /**
   * Adds price terms to a tour template
   */
  srv.on('addTourTemplatePriceTerms', async (req) => {
    const { 
      templateID, adultPrice, childrenPrice, 
      servicesIncluded, servicesNotIncluded, 
      cancellationTerms, generalTerms 
    } = req.data;
    const timestamp = new Date();
    const user = req.user.id || 'system';
    
    try {
      // Check if price terms already exist
      const existingTerms = await SELECT.one.from(TourTemplatePriceTerms)
        .where({ TourTemplateID: templateID });
      
      if (existingTerms) {
        // Update existing price terms
        await cds.transaction(req).run(
          UPDATE(TourTemplatePriceTerms)
            .set({
              AdultPrice: adultPrice,
              ChildrenPrice: childrenPrice,
              ServicesIncluded: servicesIncluded,
              ServicesNotIncluded: servicesNotIncluded,
              CancellationTerms: cancellationTerms,
              GeneralTerms: generalTerms
            })
            .where({ TourTemplateID: templateID })
        );
      } else {
        // Create new price terms
        await cds.transaction(req).run(
          INSERT.into(TourTemplatePriceTerms).entries({
            ID: cds.utils.uuid(),
            TourTemplateID: templateID,
            AdultPrice: adultPrice,
            ChildrenPrice: childrenPrice,
            ServicesIncluded: servicesIncluded,
            ServicesNotIncluded: servicesNotIncluded,
            CancellationTerms: cancellationTerms,
            GeneralTerms: generalTerms
          })
        );
      }
      
      // Log the history
      await cds.transaction(req).run(
        INSERT.into(TourTemplateHistories).entries({
          ID: cds.utils.uuid(),
          TourTemplateID: templateID,
          ModifiedDate: timestamp,
          ModifiedBy: user,
          Changes: 'Added/updated price terms'
        })
      );
      
      // Update template status
      await cds.transaction(req).run(
        UPDATE(TourTemplates)
          .set({ UpdatedAt: timestamp })
          .where({ ID: templateID })
      );
      
      return {
        success: true,
        message: 'Price terms added successfully'
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: `Error adding price terms: ${error.message}`
      };
    }
  });
  
  /**
   * Updates price terms for a tour template
   */
  srv.on('updateTourTemplatePriceTerms', async (req) => {
    const { 
      templateID, adultPrice, childrenPrice, 
      servicesIncluded, servicesNotIncluded, 
      cancellationTerms, generalTerms 
    } = req.data;
    
    try {
      // Update the price terms
      const result = await cds.transaction(req).run(
        UPDATE(TourTemplatePriceTerms)
          .set({
            AdultPrice: adultPrice,
            ChildrenPrice: childrenPrice,
            ServicesIncluded: servicesIncluded,
            ServicesNotIncluded: servicesNotIncluded,
            CancellationTerms: cancellationTerms,
            GeneralTerms: generalTerms
          })
          .where({ TourTemplateID: templateID })
      );
      
      if (result === 0) {
        return {
          success: false,
          message: 'Price terms not found'
        };
      }
      
      return {
        success: true,
        message: 'Price terms updated successfully'
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: `Error updating price terms: ${error.message}`
      };
    }
  });
  
  // TOUR TEMPLATE MANAGEMENT - General Operations
  
  /**
   * Completes the tour template creation process
   */
  srv.on('completeTourTemplateCreation', async (req) => {
    const { templateID } = req.data;
    const timestamp = new Date();
    const user = req.user.id || 'system';
    
    try {
      // Validate template has all required components
      const template = await SELECT.one.from(TourTemplates).where({ ID: templateID });
      
      if (!template) {
        return {
          success: false,
          message: 'Tour template not found',
          status: 'Error'
        };
      }
      
      // Check if schedules exist
      const schedules = await SELECT.from(TourTemplateSchedules)
        .where({ TourTemplateID: templateID });
      
      if (schedules.length === 0) {
        return {
          success: false,
          message: 'Tour template must have at least one schedule',
          status: 'Incomplete'
        };
      }
      
      // Check if price terms exist
      const priceTerms = await SELECT.one.from(TourTemplatePriceTerms)
        .where({ TourTemplateID: templateID });
      
      if (!priceTerms) {
        return {
          success: false,
          message: 'Tour template must have price terms',
          status: 'Incomplete'
        };
      }
      
      // Set template status to Published
      await cds.transaction(req).run(
        UPDATE(TourTemplates)
          .set({ 
            Status: 'Published',
            UpdatedAt: timestamp 
          })
          .where({ ID: templateID })
      );
      
      // Log the history
      await cds.transaction(req).run(
        INSERT.into(TourTemplateHistories).entries({
          ID: cds.utils.uuid(),
          TourTemplateID: templateID,
          ModifiedDate: timestamp,
          ModifiedBy: user,
          Changes: 'Completed tour template creation - Published'
        })
      );
      
      return {
        success: true,
        message: 'Tour template published successfully',
        status: 'Published'
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: `Error completing tour template: ${error.message}`,
        status: 'Error'
      };
    }
  });
  
  /**
   * Updates a tour template status
   */
  srv.on('updateTourTemplateStatus', async (req) => {
    const { templateID, status } = req.data;
    const timestamp = new Date();
    const user = req.user.id || 'system';
    
    try {
      // Update the template status
      const result = await cds.transaction(req).run(
        UPDATE(TourTemplates)
          .set({ 
            Status: status,
            UpdatedAt: timestamp 
          })
          .where({ ID: templateID })
      );
      
      if (result === 0) {
        return {
          success: false,
          message: 'Tour template not found'
        };
      }
      
      // Log the history
      await cds.transaction(req).run(
        INSERT.into(TourTemplateHistories).entries({
          ID: cds.utils.uuid(),
          TourTemplateID: templateID,
          ModifiedDate: timestamp,
          ModifiedBy: user,
          Changes: `Status updated to ${status}`
        })
      );
      
      return {
        success: true,
        message: `Tour template status updated to ${status}`
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: `Error updating template status: ${error.message}`
      };
    }
  });
  
  /**
   * Logs changes to a tour template
   */
  srv.on('logTourTemplateHistory', async (req) => {
    const { templateID, modifiedBy, changes } = req.data;
    
    try {
      // Create history entry
      await cds.transaction(req).run(
        INSERT.into(TourTemplateHistories).entries({
          ID: cds.utils.uuid(),
          TourTemplateID: templateID,
          ModifiedDate: new Date(),
          ModifiedBy: modifiedBy,
          Changes: changes
        })
      );
      
      return {
        success: true,
        message: 'History logged successfully'
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: `Error logging history: ${error.message}`
      };
    }
  });
  
  /**
   * Deletes a tour template
   */
  srv.on('deleteTourTemplate', async (req) => {
    const { templateID } = req.data;
    
    try {
      // Check if there are active tours associated with the template
      const activeTours = await SELECT.from(ActiveTours)
        .where({ TemplateID: templateID });
      
      if (activeTours.length > 0) {
        return {
          success: false,
          message: 'Cannot delete template with active tours'
        };
      }
      
      // Delete all related records in transaction
      await cds.transaction(req).run(async tx => {
        // Get all schedule IDs for the template
        const schedules = await tx.run(
          SELECT.from(TourTemplateSchedules)
            .columns('ID')
            .where({ TourTemplateID: templateID })
        );
        
        // Delete activities for each schedule
        for (const schedule of schedules) {
          await tx.run(
            DELETE.from(TourTemplateActivities)
              .where({ ScheduleID: schedule.ID })
          );
        }
        
        // Delete schedules
        await tx.run(
          DELETE.from(TourTemplateSchedules)
            .where({ TourTemplateID: templateID })
        );
        
        // Delete price terms
        await tx.run(
          DELETE.from(TourTemplatePriceTerms)
            .where({ TourTemplateID: templateID })
        );
        
        // Delete images
        await tx.run(
          DELETE.from(TourTemplateImages)
            .where({ TourTemplateID: templateID })
        );
        
        // Delete history
        await tx.run(
          DELETE.from(TourTemplateHistories)
            .where({ TourTemplateID: templateID })
        );
        
        // Delete template
        await tx.run(
          DELETE.from(TourTemplates)
            .where({ ID: templateID })
        );
      });
      
      return {
        success: true,
        message: 'Tour template deleted successfully'
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: `Error deleting template: ${error.message}`
      };
    }
  });
  
  /**
   * Gets detailed information about a tour template
   */
  srv.on('getTourTemplateDetails', async (req) => {
    const { templateID } = req.data;
    
    try {
      // Get template basic info
      const template = await SELECT.one.from(TourTemplates).where({ ID: templateID });
      
      if (!template) {
        return req.error(404, 'Tour template not found');
      }
      
      // Get template images
      const images = await SELECT.from(TourTemplateImages)
        .where({ TourTemplateID: templateID });
      
      // Get schedules with activities
      const schedules = await SELECT.from(TourTemplateSchedules)
        .where({ TourTemplateID: templateID })
        .orderBy('DayNumber');
      
      // For each schedule, get activities
      for (let i = 0; i < schedules.length; i++) {
        const activities = await SELECT.from(TourTemplateActivities)
          .where({ ScheduleID: schedules[i].ID })
          .orderBy('StartTime');
          
        schedules[i].Activities = activities;
      }
      
      // Get price terms
      const priceTerms = await SELECT.one.from(TourTemplatePriceTerms)
        .where({ TourTemplateID: templateID });
      
      // Get history
      const history = await SELECT.from(TourTemplateHistories)
        .where({ TourTemplateID: templateID })
        .orderBy({ ModifiedDate: 'desc' });
      
      // Get active tours based on this template
      const activeTours = await SELECT.from(ActiveTours)
        .where({ TemplateID: templateID })
        .columns('ID', 'TourName', 'DepartureDate', 'ReturnDate', 'Status', 'CurrentBookings');
      
      return {
        template: template,
        images: images,
        schedules: schedules,
        priceTerms: priceTerms || {},
        history: history,
        activeTours: activeTours
      };
    } catch (error) {
      console.error(error);
      return req.error(500, `Error retrieving template details: ${error.message}`);
    }
  });
  
  /**
   * Lists tour templates with filters and pagination
   */
  srv.on('listTourTemplates', async (req) => {
    const { searchTerm, tourType, status, skip, limit } = req.data;
    
    try {
      // Truy vấn cơ bản để lấy dữ liệu templates
      let query = SELECT.from(TourTemplates);
      
      // Xây dựng điều kiện WHERE
      let conditions = [];
      
      if (searchTerm) {
        conditions.push(`TemplateName like '%${searchTerm}%'`);
      }
      
      if (tourType) {
        conditions.push(`TourType = '${tourType}'`);
      }
      
      if (status) {
        conditions.push(`Status = '${status}'`);
      }
      
      // Thêm điều kiện vào truy vấn nếu có
      if (conditions.length > 0) {
        query.where(conditions.join(' and '));
      }
      
      // Thêm phân trang
      query.limit(limit || 10, skip || 0);
      
      // Thực hiện truy vấn
      let templates = await query;
      
      // Lấy MainImageURL từ TourTemplateImages
      for (let template of templates) {
        const mainImage = await SELECT.from(TourTemplateImages)
          .where({ TourTemplateID: template.ID, IsMain: true })
          .columns('ImageURL');
        
        template.MainImageURL = mainImage.length > 0 ? mainImage[0].ImageURL : null;
      }
      
      // Lấy ActiveToursCount cho mỗi template
      for (let template of templates) {
        const activeToursCount = await SELECT.from(ActiveTours)
          .where({ TemplateID: template.ID })
          .columns('count(*) as count');
        
        template.ActiveToursCount = activeToursCount[0].count;
      }
      
      // Lấy AdultPrice từ TourTemplatePriceTerms
      for (let template of templates) {
        const priceInfo = await SELECT.from(TourTemplatePriceTerms)
          .where({ TourTemplateID: template.ID })
          .columns('AdultPrice');
        
        template.AdultPrice = priceInfo.length > 0 ? priceInfo[0].AdultPrice : null;
      }
      
      // Đếm tổng số bản ghi (không có giới hạn)
      let countQuery = SELECT.from(TourTemplates).columns('count(*) as total');
      
      if (conditions.length > 0) {
        countQuery.where(conditions.join(' and '));
      }
      
      let countResult = await countQuery;
      let total = countResult[0].total;
      
      return {
        items: templates,
        pagination: {
          total: total,
          skip: skip || 0,
          limit: limit || 10
        }
      };
    } catch (error) {
      console.error(error);
      return req.error(500, `Error listing templates: ${error.message}`);
    }
  });
  
  /**
   * Gets available tour types
   */
  srv.on('getAvailableTourTypes', async (req) => {
    try {
      // Get distinct tour types from existing templates
      const results = await SELECT.distinct.from(TourTemplates)
        .columns('TourType')
        .where('TourType is not null');
      
      // Extract the types
      const types = results.map(result => result.TourType);
      
      // Add default types if none exist
      if (types.length === 0) {
        return ['Adventure', 'Cultural', 'Relaxation', 'Historical', 'Beach', 'Mountain'];
      }
      
      return types;
    } catch (error) {
      console.error(error);
      return req.error(500, `Error retrieving tour types: ${error.message}`);
    }
  });
  
  // ACTIVE TOUR MANAGEMENT
  
  /**
   * Creates an active tour from a template
   */
  srv.on('createActiveTour', async (req) => {
    const { 
      templateID, tourName, departureDate, returnDate, 
      saleStartDate, saleEndDate, maxCapacity, responsiblePersonID 
    } = req.data;
    const tourID = cds.utils.uuid();
    const timestamp = new Date();
    const user = req.user.id || 'system';
    
    try {
      // Verify template exists and is published
      const template = await SELECT.one.from(TourTemplates)
        .where({ ID: templateID });
      
      if (!template) {
        return {
          tourID: null,
          tourName: null,
          message: 'Tour template not found'
        };
      }
      
      if (template.Status !== 'Published') {
        return {
          tourID: null,
          tourName: null,
          message: 'Tour template must be published to create active tours'
        };
      }
      
      // Create active tour
      await cds.transaction(req).run(
        INSERT.into(ActiveTours).entries({
          ID: tourID,
          TemplateID: templateID,
          TourName: tourName,
          DepartureDate: departureDate,
          ReturnDate: returnDate,
          SaleStartDate: saleStartDate,
          SaleEndDate: saleEndDate,
          MaxCapacity: maxCapacity,
          CurrentBookings: 0,
          ResponsiblePersonID: responsiblePersonID,
          Status: 'Open',
          CreatedAt: timestamp,
          UpdatedAt: timestamp
        })
      );
      
      // Create an empty estimate record
      await cds.transaction(req).run(
        INSERT.into(TourEstimates).entries({
          ID: cds.utils.uuid(),
          ActiveTourID: tourID,
          EstimatedCost: 0,
          EstimatedRevenue: 0,
          EstimatedProfit: 0,
          LastUpdated: timestamp,
          Notes: 'Initial estimate'
        })
      );
      
      // Log the history
      await cds.transaction(req).run(
        INSERT.into(ActiveTourHistories).entries({
          ID: cds.utils.uuid(),
          ActiveTourID: tourID,
          ModifiedDate: timestamp,
          ModifiedBy: user,
          Changes: 'Created active tour from template'
        })
      );
      
      return {
        tourID: tourID,
        tourName: tourName,
        message: 'Active tour created successfully'
      };
    } catch (error) {
      console.error(error);
      return {
        tourID: null,
        tourName: null,
        message: `Error creating active tour: ${error.message}`
      };
    }
  });
  
  /**
   * Updates an active tour
   */
  srv.on('updateActiveTour', async (req) => {
    const { 
      tourID, tourName, departureDate, returnDate, 
      saleStartDate, saleEndDate, maxCapacity, responsiblePersonID 
    } = req.data;
    const timestamp = new Date();
    const user = req.user.id || 'system';
    
    try {
      // Update the active tour
      const result = await cds.transaction(req).run(
        UPDATE(ActiveTours)
          .set({
            TourName: tourName,
            DepartureDate: departureDate,
            ReturnDate: returnDate,
            SaleStartDate: saleStartDate,
            SaleEndDate: saleEndDate,
            MaxCapacity: maxCapacity,
            ResponsiblePersonID: responsiblePersonID,
            UpdatedAt: timestamp
          })
          .where({ ID: tourID })
      );
      
      if (result === 0) {
        return {
          success: false,
          message: 'Active tour not found'
        };
      }
      
      // Log the history
      await cds.transaction(req).run(
        INSERT.into(ActiveTourHistories).entries({
          ID: cds.utils.uuid(),
          ActiveTourID: tourID,
          ModifiedDate: timestamp,
          ModifiedBy: user,
          Changes: 'Updated tour details'
        })
      );
      
      return {
        success: true,
        message: 'Active tour updated successfully'
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: `Error updating active tour: ${error.message}`
      };
    }
  });
  
  /**
   * Updates the status of an active tour
   */
  srv.on('updateActiveTourStatus', async (req) => {
    const { tourID, status } = req.data;
    const timestamp = new Date();
    const user = req.user.id || 'system';
    
    try {
      // Update the active tour status
      const result = await cds.transaction(req).run(
        UPDATE(ActiveTours)
          .set({
            Status: status,
            UpdatedAt: timestamp
          })
          .where({ ID: tourID })
      );
      
      if (result === 0) {
        return {
          success: false,
          message: 'Active tour not found'
        };
      }
      
      // Log the history
      await cds.transaction(req).run(
        INSERT.into(ActiveTourHistories).entries({
          ID: cds.utils.uuid(),
          ActiveTourID: tourID,
          ModifiedDate: timestamp,
          ModifiedBy: user,
          Changes: `Status updated to ${status}`
        })
      );
      
      return {
        success: true,
        message: `Tour status updated to ${status}`
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: `Error updating tour status: ${error.message}`
      };
    }
  });
  
  /**
   * Cancels an active tour with a reason
   */
  srv.on('cancelActiveTour', async (req) => {
    const { tourID, reason } = req.data;
    const timestamp = new Date();
    const user = req.user.id || 'system';
    
    try {
      // Update the active tour status
      const result = await cds.transaction(req).run(
        UPDATE(ActiveTours)
          .set({
            Status: 'Canceled',
            UpdatedAt: timestamp
          })
          .where({ ID: tourID })
      );
      
      if (result === 0) {
        return {
          success: false,
          message: 'Active tour not found'
        };
      }
      
      // Log the history with reason
      await cds.transaction(req).run(
        INSERT.into(ActiveTourHistories).entries({
          ID: cds.utils.uuid(),
          ActiveTourID: tourID,
          ModifiedDate: timestamp,
          ModifiedBy: user,
          Changes: `Tour canceled. Reason: ${reason}`
        })
      );
      
      return {
        success: true,
        message: 'Tour canceled successfully'
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: `Error canceling tour: ${error.message}`
      };
    }
  });
  
  /**
   * Logs changes to an active tour
   */
  srv.on('logActiveTourHistory', async (req) => {
    const { tourID, modifiedBy, changes } = req.data;
    
    try {
      // Create history entry
      await cds.transaction(req).run(
        INSERT.into(ActiveTourHistories).entries({
          ID: cds.utils.uuid(),
          ActiveTourID: tourID,
          ModifiedDate: new Date(),
          ModifiedBy: modifiedBy,
          Changes: changes
        })
      );
      
      return {
        success: true,
        message: 'History logged successfully'
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: `Error logging history: ${error.message}`
      };
    }
  });
  
  // PASSENGER MANAGEMENT
  
  /**
   * Adds a passenger to an active tour
   */
// Trong file srv/tour-service.js, cập nhật phần PASSENGER MANAGEMENT:

// PASSENGER MANAGEMENT
  
/**
 * Adds a passenger to an order
 */
srv.on('addPassenger', async (req) => {
  const { 
    orderID, fullName, gender, 
    birthDate, idNumber, phone, email, 
    specialRequirements, isAdult 
  } = req.data;
  const passengerID = cds.utils.uuid();
  const timestamp = new Date();
  
  try {
    // Check if order exists
    const order = await SELECT.one.from('tourish.management.Order')
      .where({ ID: orderID });
    
    if (!order) {
      return {
        passengerID: null,
        message: 'Order not found'
      };
    }
    
    // Get the active tour to check capacity
    const tour = await SELECT.one.from(ActiveTours)
      .where({ ID: order.ActiveTourID });
    
    if (!tour) {
      return {
        passengerID: null,
        message: 'Active tour not found'
      };
    }
    
    if (order.Status !== 'Pending' && order.Status !== 'Completed') {
      return {
        passengerID: null,
        message: 'Cannot add passengers to canceled orders'
      };
    }
    
    // Count current passengers for this order
    const currentPassengers = await SELECT.from(Passengers)
      .where({ OrderID: orderID });
    
    const currentAdults = currentPassengers.filter(p => p.IsAdult).length;
    const currentChildren = currentPassengers.filter(p => !p.IsAdult).length;
    
    // Check if we're not exceeding the order's passenger count
    if (isAdult && currentAdults >= order.AdultCount) {
      return {
        passengerID: null,
        message: 'Cannot add more adults than specified in the order'
      };
    }
    
    if (!isAdult && currentChildren >= order.ChildCount) {
      return {
        passengerID: null,
        message: 'Cannot add more children than specified in the order'
      };
    }
    
    // Create passenger
    await cds.transaction(req).run(
      INSERT.into(Passengers).entries({
        ID: passengerID,
        OrderID: orderID,
        FullName: fullName,
        Gender: gender,
        BirthDate: birthDate,
        IDNumber: idNumber,
        Phone: phone,
        Email: email,
        SpecialRequirements: specialRequirements,
        IsAdult: isAdult
      })
    );
    
    // Log the change in active tour history
    await cds.transaction(req).run(
      INSERT.into(ActiveTourHistories).entries({
        ID: cds.utils.uuid(),
        ActiveTourID: order.ActiveTourID,
        ModifiedDate: timestamp,
        ModifiedBy: req.user.id || 'system',
        Changes: `Added passenger: ${fullName} to Order ${orderID.substring(0, 8)}`
      })
    );
    
    return {
      passengerID: passengerID,
      message: 'Passenger added successfully'
    };
  } catch (error) {
    console.error(error);
    return {
      passengerID: null,
      message: `Error adding passenger: ${error.message}`
    };
  }
});

/**
 * Updates passenger information
 */
srv.on('updatePassenger', async (req) => {
  const { 
    passengerID, fullName, gender, 
    birthDate, idNumber, phone, email, 
    specialRequirements, isAdult 
  } = req.data;
  
  try {
    // Update the passenger
    const result = await cds.transaction(req).run(
      UPDATE(Passengers)
        .set({
          FullName: fullName,
          Gender: gender,
          BirthDate: birthDate,
          IDNumber: idNumber,
          Phone: phone,
          Email: email,
          SpecialRequirements: specialRequirements,
          IsAdult: isAdult
        })
        .where({ ID: passengerID })
    );
    
    if (result === 0) {
      return {
        success: false,
        message: 'Passenger not found'
      };
    }
    
    return {
      success: true,
      message: 'Passenger updated successfully'
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: `Error updating passenger: ${error.message}`
    };
  }
});

/**
 * Removes a passenger from an order
 */
srv.on('removePassenger', async (req) => {
  const { passengerID } = req.data;
  const timestamp = new Date();
  
  try {
    // Get passenger info for history log
    const passenger = await SELECT.one.from(Passengers).where({ ID: passengerID });
    
    if (!passenger) {
      return {
        success: false,
        message: 'Passenger not found'
      };
    }
    
    // Get order info
    const order = await SELECT.one.from('tourish.management.Order')
      .where({ ID: passenger.OrderID });
    
    if (!order) {
      return {
        success: false,
        message: 'Associated order not found'
      };
    }
    
    // Delete the passenger
    await cds.transaction(req).run(
      DELETE.from(Passengers).where({ ID: passengerID })
    );
    
    // Log the change
    await cds.transaction(req).run(
      INSERT.into(ActiveTourHistories).entries({
        ID: cds.utils.uuid(),
        ActiveTourID: order.ActiveTourID,
        ModifiedDate: timestamp,
        ModifiedBy: req.user.id || 'system',
        Changes: `Removed passenger: ${passenger.FullName} from Order ${order.ID.substring(0, 8)}`
      })
    );
    
    return {
      success: true,
      message: 'Passenger removed successfully'
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: `Error removing passenger: ${error.message}`
    };
  }
});



srv.on('getOrdersWithPassengers', async (req) => {
  const { tourID } = req.data;
  
  try {
    // Get all orders for this tour
    const orders = await SELECT.from('tourish.management.Order')
      .where({ ActiveTourID: tourID, Status: { '!=': 'Canceled' } });
    
    // Process each order
    const ordersWithPassengers = [];
    
    for (const order of orders) {
      // Get customer name
      let customerName = 'Unknown';
      if (order.CustomerType === 'Individual' && order.CustomerID) {
        const customer = await SELECT.one.from('tourish.management.Customer')
          .columns('FullName')
          .where({ ID: order.CustomerID });
        customerName = customer ? customer.FullName : 'Unknown';
      } else if (order.CustomerType === 'Business' && order.BusinessCustomerID) {
        const business = await SELECT.one.from('tourish.management.BusinessCustomer')
          .columns('CompanyName')
          .where({ ID: order.BusinessCustomerID });
        customerName = business ? business.CompanyName : 'Unknown';
      }
      
      // Get existing passengers for this order
      const existingPassengers = await SELECT.from(Passengers)
        .where({ OrderID: order.ID });
      
      // Count adults and children
      const existingAdults = existingPassengers.filter(p => p.IsAdult).length;
      const existingChildren = existingPassengers.filter(p => !p.IsAdult).length;
      
      // Create passenger list with placeholders
      const passengerList = [];
      
      // Add existing passengers
      existingPassengers.forEach(p => {
        passengerList.push({
          ...p,
          IsPlaceholder: false
        });
      });
      
      // Add placeholder slots for remaining adults
      for (let i = existingAdults; i < order.AdultCount; i++) {
        passengerList.push({
          ID: null,
          FullName: '',
          Gender: '',
          BirthDate: null,
          IDNumber: '',
          Phone: '',
          Email: '',
          SpecialRequirements: '',
          IsAdult: true,
          IsPlaceholder: true
        });
      }
      
      // Add placeholder slots for remaining children
      for (let i = existingChildren; i < order.ChildCount; i++) {
        passengerList.push({
          ID: null,
          FullName: '',
          Gender: '',
          BirthDate: null,
          IDNumber: '',
          Phone: '',
          Email: '',
          SpecialRequirements: '',
          IsAdult: false,
          IsPlaceholder: true
        });
      }
      
      ordersWithPassengers.push({
        OrderID: order.ID,
        CustomerID: order.CustomerID || order.BusinessCustomerID,
        CustomerName: customerName,
        CustomerType: order.CustomerType,
        OrderDate: order.OrderDate,
        AdultCount: order.AdultCount,
        ChildCount: order.ChildCount,
        Status: order.Status,
        Passengers: passengerList
      });
    }
    
    return ordersWithPassengers;
  } catch (error) {
    console.error(error);
    return req.error(500, `Error retrieving orders with passengers: ${error.message}`);
  }
});

/**
 * Gets the list of all passengers for a tour (across all orders)
 */
srv.on('getPassengerList', async (req) => {
  const { tourID } = req.data;
  
  try {
    // Get all orders for this tour
    const orders = await SELECT.from('tourish.management.Order')
      .where({ ActiveTourID: tourID });
    
    // Get all passengers for these orders
    const passengers = [];
    
    for (const order of orders) {
      // Get customer info
      let customerName = 'Unknown';
      if (order.CustomerType === 'Individual' && order.CustomerID) {
        const customer = await SELECT.one.from('tourish.management.Customer')
          .columns('FullName')
          .where({ ID: order.CustomerID });
        customerName = customer ? customer.FullName : 'Unknown';
      } else if (order.CustomerType === 'Business' && order.BusinessCustomerID) {
        const business = await SELECT.one.from('tourish.management.BusinessCustomer')
          .columns('CompanyName')
          .where({ ID: order.BusinessCustomerID });
        customerName = business ? business.CompanyName : 'Unknown';
      }
      
      // Get passengers for this order
      const orderPassengers = await SELECT.from(Passengers)
        .where({ OrderID: order.ID });
      
      // Add customer info to each passenger
      orderPassengers.forEach(p => {
        passengers.push({
          ID: p.ID,
          OrderID: p.OrderID,
          CustomerName: customerName,
          OrderDate: order.OrderDate,
          FullName: p.FullName,
          Gender: p.Gender,
          BirthDate: p.BirthDate,
          IDNumber: p.IDNumber,
          Phone: p.Phone,
          Email: p.Email,
          SpecialRequirements: p.SpecialRequirements,
          IsAdult: p.IsAdult
        });
      });
    }
    
    return passengers;
  } catch (error) {
    console.error(error);
    return req.error(500, `Error retrieving passengers: ${error.message}`);
  }
});

/**
 * Gets passengers for a specific order
 */
srv.on('getPassengersByOrder', async (req) => {
  const { orderID } = req.data;
  
  try {
    // Get all passengers for the order
    const passengers = await SELECT.from(Passengers)
      .where({ OrderID: orderID });
    
    return passengers;
  } catch (error) {
    console.error(error);
    return req.error(500, `Error retrieving passengers: ${error.message}`);
  }
});
  
  // TOUR SERVICES MANAGEMENT
  
  /**
   * Adds a service to an active tour
   */
  srv.on('addServiceToActiveTour', async (req) => {
    const { tourID, serviceID, quantity, unitPrice, notes } = req.data;
    const tourServiceID = cds.utils.uuid();
    const timestamp = new Date();
    
    try {
      // Get service info
      const service = await SELECT.one.from('tourish.management.Service')
        .where({ ID: serviceID });
      
      if (!service) {
        return {
          tourServiceID: null,
          message: 'Service not found'
        };
      }
      
      // Calculate total price
      const totalPrice = quantity * unitPrice;
      
      // Create tour service
      await cds.transaction(req).run(
        INSERT.into(ActiveTourServices).entries({
          ID: tourServiceID,
          ActiveTourID: tourID,
          ServiceID: serviceID,
          Quantity: quantity,
          UnitPrice: unitPrice,
          TotalPrice: totalPrice,
          Notes: notes
        })
      );
      
      // Log the change
      await cds.transaction(req).run(
        INSERT.into(ActiveTourHistories).entries({
          ID: cds.utils.uuid(),
          ActiveTourID: tourID,
          ModifiedDate: timestamp,
          ModifiedBy: 'system',
          Changes: `Added service: ${service.ServiceName}, Quantity: ${quantity}`
        })
      );
      
      return {
        tourServiceID: tourServiceID,
        message: 'Service added successfully'
      };
    } catch (error) {
      console.error(error);
      return {
        tourServiceID: null,
        message: `Error adding service: ${error.message}`
      };
    }
  });
  
  /**
   * Updates a tour service
   */
  srv.on('updateActiveTourService', async (req) => {
    const { tourServiceID, quantity, unitPrice, notes } = req.data;
    
    try {
      // Calculate total price
      const totalPrice = quantity * unitPrice;
      
      // Update the tour service
      const result = await cds.transaction(req).run(
        UPDATE(ActiveTourServices)
          .set({
            Quantity: quantity,
            UnitPrice: unitPrice,
            TotalPrice: totalPrice,
            Notes: notes
          })
          .where({ ID: tourServiceID })
      );
      
      if (result === 0) {
        return {
          success: false,
          message: 'Tour service not found'
        };
      }
      
      return {
        success: true,
        message: 'Tour service updated successfully'
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: `Error updating tour service: ${error.message}`
      };
    }
  });
  
  /**
   * Removes a service from a tour
   */
  srv.on('removeActiveTourService', async (req) => {
    const { tourServiceID } = req.data;
    const timestamp = new Date();
    
    try {
      // Get service info for history log
      const tourService = await SELECT.one.from(ActiveTourServices)
        .where({ ID: tourServiceID });
      
      if (!tourService) {
        return {
          success: false,
          message: 'Tour service not found'
        };
      }
      
      // Get service name
      const service = await SELECT.one.from('tourish.management.Service')
        .columns('ServiceName')
        .where({ ID: tourService.ServiceID });
      
      // Delete the tour service
      await cds.transaction(req).run(
        DELETE.from(ActiveTourServices).where({ ID: tourServiceID })
      );
      
      // Log the change
      await cds.transaction(req).run(
        INSERT.into(ActiveTourHistories).entries({
          ID: cds.utils.uuid(),
          ActiveTourID: tourService.ActiveTourID,
          ModifiedDate: timestamp,
          ModifiedBy: 'system',
          Changes: `Removed service: ${service ? service.ServiceName : 'Unknown'}`
        })
      );
      
      return {
        success: true,
        message: 'Tour service removed successfully'
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: `Error removing tour service: ${error.message}`
      };
    }
  });
  
  /**
   * Gets the services for an active tour
   */
  srv.on('getActiveTourServices', async (req) => {
    const { tourID } = req.data;
    
    try {
      // Get all services for the tour
      const tourServices = await SELECT.from(ActiveTourServices)
        .where({ ActiveTourID: tourID });
      
      // Fetch additional service info
      const servicesWithDetails = await Promise.all(tourServices.map(async ts => {
        const service = await SELECT.one.from('tourish.management.Service')
          .where({ ID: ts.ServiceID });
          
        const supplier = service ? await SELECT.one.from('tourish.management.Supplier')
          .columns('ID', 'SupplierName')
          .where({ ID: service.SupplierID }) : null;
        
        return {
          ID: ts.ID,
          ServiceID: ts.ServiceID,
          ServiceName: service ? service.ServiceName : 'Unknown',
          ServiceType: service ? service.ServiceType : 'Unknown',
          SupplierID: supplier ? supplier.ID : null,
          SupplierName: supplier ? supplier.SupplierName : 'Unknown',
          Quantity: ts.Quantity,
          UnitPrice: ts.UnitPrice,
          TotalPrice: ts.TotalPrice,
          Notes: ts.Notes
        };
      }));
      
      return servicesWithDetails;
    } catch (error) {
      console.error(error);
      return req.error(500, `Error retrieving tour services: ${error.message}`);
    }
  });
  
  // FINANCIAL ESTIMATES
  
  /**
   * Creates a tour estimate
   */
  srv.on('createTourEstimate', async (req) => {
    const { tourID, estimatedCost, estimatedRevenue, estimatedProfit, notes } = req.data;
    const estimateID = cds.utils.uuid();
    const timestamp = new Date();
    
    try {
      // Check if estimate already exists
      const existingEstimate = await SELECT.one.from(TourEstimates)
        .where({ ActiveTourID: tourID });
      
      if (existingEstimate) {
        // Update existing estimate
        await cds.transaction(req).run(
          UPDATE(TourEstimates)
            .set({
              EstimatedCost: estimatedCost,
              EstimatedRevenue: estimatedRevenue,
              EstimatedProfit: estimatedProfit,
              LastUpdated: timestamp,
              Notes: notes
            })
            .where({ ActiveTourID: tourID })
        );
        
        return {
          estimateID: existingEstimate.ID,
          message: 'Tour estimate updated successfully'
        };
      }
      
      // Create new estimate
      await cds.transaction(req).run(
        INSERT.into(TourEstimates).entries({
          ID: estimateID,
          ActiveTourID: tourID,
          EstimatedCost: estimatedCost,
          EstimatedRevenue: estimatedRevenue,
          EstimatedProfit: estimatedProfit,
          LastUpdated: timestamp,
          Notes: notes
        })
      );
      
      return {
        estimateID: estimateID,
        message: 'Tour estimate created successfully'
      };
    } catch (error) {
      console.error(error);
      return {
        estimateID: null,
        message: `Error creating tour estimate: ${error.message}`
      };
    }
  });
  
  /**
   * Updates a tour estimate
   */
  srv.on('updateTourEstimate', async (req) => {
    const { estimateID, estimatedCost, estimatedRevenue, estimatedProfit, notes } = req.data;
    const timestamp = new Date();
    
    try {
      // Update the estimate
      const result = await cds.transaction(req).run(
        UPDATE(TourEstimates)
          .set({
            EstimatedCost: estimatedCost,
            EstimatedRevenue: estimatedRevenue,
            EstimatedProfit: estimatedProfit,
            LastUpdated: timestamp,
            Notes: notes
          })
          .where({ ID: estimateID })
      );
      
      if (result === 0) {
        return {
          success: false,
          message: 'Tour estimate not found'
        };
      }
      
      return {
        success: true,
        message: 'Tour estimate updated successfully'
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: `Error updating tour estimate: ${error.message}`
      };
    }
  });
  
  /**
   * Adds a cost item to an estimate
   */
  srv.on('addCostItem', async (req) => {
    const { estimateID, itemName, category, cost, notes } = req.data;
    const costItemID = cds.utils.uuid();
    
    try {
      // Create the cost item
      await cds.transaction(req).run(
        INSERT.into(TourCostItems).entries({
          ID: costItemID,
          EstimateID: estimateID,
          ItemName: itemName,
          Category: category,
          Cost: cost,
          Notes: notes
        })
      );
      
      // Update the estimate's last updated timestamp
      await cds.transaction(req).run(
        UPDATE(TourEstimates)
          .set({ LastUpdated: new Date() })
          .where({ ID: estimateID })
      );
      
      return {
        costItemID: costItemID,
        message: 'Cost item added successfully'
      };
    } catch (error) {
      console.error(error);
      return {
        costItemID: null,
        message: `Error adding cost item: ${error.message}`
      };
    }
  });
  
  /**
   * Updates a cost item
   */
  srv.on('updateCostItem', async (req) => {
    const { costItemID, itemName, category, cost, notes } = req.data;
    
    try {
      // Get the cost item to find its estimateID
      const costItem = await SELECT.one.from(TourCostItems)
        .where({ ID: costItemID });
        
      if (!costItem) {
        return {
          success: false,
          message: 'Cost item not found'
        };
      }
      
      // Update the cost item
      await cds.transaction(req).run(
        UPDATE(TourCostItems)
          .set({
            ItemName: itemName,
            Category: category,
            Cost: cost,
            Notes: notes
          })
          .where({ ID: costItemID })
      );
      
      // Update the estimate's last updated timestamp
      await cds.transaction(req).run(
        UPDATE(TourEstimates)
          .set({ LastUpdated: new Date() })
          .where({ ID: costItem.EstimateID })
      );
      
      return {
        success: true,
        message: 'Cost item updated successfully'
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: `Error updating cost item: ${error.message}`
      };
    }
  });
  
  /**
   * Removes a cost item
   */
  srv.on('removeCostItem', async (req) => {
    const { costItemID } = req.data;
    
    try {
      // Get the cost item to find its estimateID
      const costItem = await SELECT.one.from(TourCostItems)
        .where({ ID: costItemID });
        
      if (!costItem) {
        return {
          success: false,
          message: 'Cost item not found'
        };
      }
      
      // Delete the cost item
      await cds.transaction(req).run(
        DELETE.from(TourCostItems).where({ ID: costItemID })
      );
      
      // Update the estimate's last updated timestamp
      await cds.transaction(req).run(
        UPDATE(TourEstimates)
          .set({ LastUpdated: new Date() })
          .where({ ID: costItem.EstimateID })
      );
      
      return {
        success: true,
        message: 'Cost item removed successfully'
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: `Error removing cost item: ${error.message}`
      };
    }
  });
  
  /**
   * Gets the estimate for a tour
   */
  srv.on('getTourEstimate', async (req) => {
    const { tourID } = req.data;
    
    try {
      // Get the estimate for the tour
      const estimate = await SELECT.one.from(TourEstimates)
        .where({ ActiveTourID: tourID });
      
      if (!estimate) {
        return req.error(404, 'Tour estimate not found');
      }
      
      // Get cost items
      const costItems = await SELECT.from(TourCostItems)
        .where({ EstimateID: estimate.ID });
      
      return {
        ID: estimate.ID,
        EstimatedCost: estimate.EstimatedCost,
        EstimatedRevenue: estimate.EstimatedRevenue,
        EstimatedProfit: estimate.EstimatedProfit,
        LastUpdated: estimate.LastUpdated,
        Notes: estimate.Notes,
        CostItems: costItems
      };
    } catch (error) {
      console.error(error);
      return req.error(500, `Error retrieving tour estimate: ${error.message}`);
    }
  });
  
  // ACTIVE TOUR DETAILS AND LISTING
  
  /**
   * Gets detailed information about an active tour
   */
  srv.on('getActiveTourDetails', async (req) => {
    const { tourID } = req.data;
    
    try {
      // Get tour basic info
      const tour = await SELECT.one.from(ActiveTours).where({ ID: tourID });
      
      if (!tour) {
        return req.error(404, 'Active tour not found');
      }
      
      // Get responsible person info
      const responsiblePerson = await SELECT.one.from('tourish.management.User')
        .columns('FullName')
        .where({ ID: tour.ResponsiblePersonID });
      
      // Get template info
      const template = await SELECT.one.from(TourTemplates)
        .columns('TemplateName', 'Description', 'NumberDays', 'NumberNights', 'TourType')
        .where({ ID: tour.TemplateID });
      
      // Get schedules from template
      const schedules = await SELECT.from(TourTemplateSchedules)
        .where({ TourTemplateID: tour.TemplateID })
        .orderBy('DayNumber');
      
      // For each schedule, get activities
      for (let i = 0; i < schedules.length; i++) {
        const activities = await SELECT.from(TourTemplateActivities)
          .where({ ScheduleID: schedules[i].ID })
          .orderBy('StartTime');
          
        schedules[i].Activities = activities;
      }
      
      // Get images from template
      const images = await SELECT.from(TourTemplateImages)
        .where({ TourTemplateID: tour.TemplateID });
      
      // Get passenger count through orders - UPDATED
      const orders = await SELECT.from('tourish.management.Order')
        .columns('ID')
        .where({ ActiveTourID: tourID });
      
      let passengerCount = 0;
      for (const order of orders) {
        const passengersInOrderResult = await SELECT.from(Passengers)
          .columns('count(*) as count')
          .where({ OrderID: order.ID });
        passengerCount += passengersInOrderResult[0]?.count || 0;
      }
      
      // Get service count
      const serviceCountResult = await SELECT.from(ActiveTourServices)
        .columns('count(*) as count')
        .where({ ActiveTourID: tourID });
      const serviceCount = serviceCountResult[0]?.count || 0;
      
      // Get estimate
      const estimate = await SELECT.one.from(TourEstimates)
        .where({ ActiveTourID: tourID });
      
      // Get price terms from template
      const priceTerms = await SELECT.one.from(TourTemplatePriceTerms)
        .where({ TourTemplateID: tour.TemplateID });
      
      // Get history
      const history = await SELECT.from(ActiveTourHistories)
        .where({ ActiveTourID: tourID })
        .orderBy({ ModifiedDate: 'desc' });
      
      return {
        tour: {
          ...tour,
          ResponsiblePersonName: responsiblePerson ? responsiblePerson.FullName : 'Unknown'
        },
        template: template || {},
        schedules: schedules,
        images: images,
        passengerCount: passengerCount,
        serviceCount: serviceCount,
        estimate: estimate ? {
          EstimatedCost: estimate.EstimatedCost,
          EstimatedRevenue: estimate.EstimatedRevenue,
          EstimatedProfit: estimate.EstimatedProfit
        } : {},
        terms: priceTerms ? {
            AdultPrice: priceTerms.AdultPrice,
            ChildrenPrice: priceTerms.ChildrenPrice,
            ServicesIncluded: priceTerms.ServicesIncluded,
            ServicesNotIncluded: priceTerms.ServicesNotIncluded,
            CancellationTerms: priceTerms.CancellationTerms,
            GeneralTerms: priceTerms.GeneralTerms
          } : {},
          history: history
        };
      } catch (error) {
        console.error(error);
        return req.error(500, `Error retrieving active tour details: ${error.message}`);
      }
    });
    
    /**
     * Lists active tours with filters and pagination
     */
    srv.on('listActiveTours', async (req) => {
      const { 
        searchTerm, status, fromDepartureDate, toDepartureDate, 
        fromSaleDate, toSaleDate, responsiblePersonID, skip, limit 
      } = req.data;
      
      try {
        // Basic query to get active tours
        let query = SELECT.from(ActiveTours);
        
        // Build WHERE conditions
        let conditions = [];
        
        if (searchTerm) {
          conditions.push(`TourName like '%${searchTerm}%'`);
        }
        
        if (status) {
          conditions.push(`Status = '${status}'`);
        }
        
        if (fromDepartureDate) {
          conditions.push(`DepartureDate >= '${fromDepartureDate}'`);
        }
        
        if (toDepartureDate) {
          conditions.push(`DepartureDate <= '${toDepartureDate}'`);
        }
        
        if (fromSaleDate) {
          conditions.push(`SaleStartDate >= '${fromSaleDate}'`);
        }
        
        if (toSaleDate) {
          conditions.push(`SaleEndDate <= '${toSaleDate}'`);
        }
        
        if (responsiblePersonID) {
          conditions.push(`ResponsiblePersonID = '${responsiblePersonID}'`);
        }
        
        // Add conditions to the query if any exist
        if (conditions.length > 0) {
          query.where(conditions.join(' and '));
        }
        
        // Add pagination
        query.limit(limit || 10, skip || 0);
        
        // Execute query
        let tours = await query;
        
        // Get additional information for each tour
        for (let tour of tours) {
          // Get template name
          const template = await SELECT.one.from(TourTemplates)
            .columns('TemplateName')
            .where({ ID: tour.TemplateID });
          
          tour.TemplateName = template ? template.TemplateName : 'Unknown';
          
          // Get responsible person name
          const responsiblePerson = await SELECT.one.from('tourish.management.User')
            .columns('FullName')
            .where({ ID: tour.ResponsiblePersonID });
          
          tour.ResponsiblePersonName = responsiblePerson ? responsiblePerson.FullName : 'Unknown';
          
          // Get estimate data
          const estimate = await SELECT.one.from(TourEstimates)
            .columns('EstimatedProfit')
            .where({ ActiveTourID: tour.ID });
          
          tour.EstimatedProfit = estimate ? estimate.EstimatedProfit : 0;
          
          // Get main image
          const mainImage = await SELECT.one.from(TourTemplateImages)
            .where({ TourTemplateID: tour.TemplateID, IsMain: true })
            .columns('ImageURL');
          
          tour.MainImageURL = mainImage && mainImage.length > 0 ? mainImage[0].ImageURL : null;
        }
        
        // Count total records (without pagination)
        let countQuery = SELECT.from(ActiveTours).columns('count(*) as total');
        
        if (conditions.length > 0) {
          countQuery.where(conditions.join(' and '));
        }
        
        let countResult = await countQuery;
        let total = countResult[0].total;
        
        // Return the formatted result
        return {
          items: tours,
          pagination: {
            total: total,
            skip: skip || 0,
            limit: limit || 10
          }
        };
      } catch (error) {
        console.error('Error listing active tours:', error);
        return req.error(500, `Error listing active tours: ${error.message}`);
      }
    });
    
    // DASHBOARD AND REPORTING
    
    /**
     * Gets dashboard data for tours
     */
    srv.on('getToursDashboardData', async (req) => {
      try {
        // Count active tours
        const activeToursCountResult = await SELECT.from(ActiveTours)
          .columns('count(*) as count')
          .where({ Status: 'Open' });
        const activeToursCount = activeToursCountResult[0]?.count || 0;
        
        // Count draft templates  
        const draftTemplatesCountResult = await SELECT.from(TourTemplates)
          .columns('count(*) as count')
          .where({ Status: 'Draft' });
        const draftTemplatesCount = draftTemplatesCountResult[0]?.count || 0;
        
        // Count published templates
        const publishedTemplatesCountResult = await SELECT.from(TourTemplates)
          .columns('count(*) as count')
          .where({ Status: 'Published' });
        const publishedTemplatesCount = publishedTemplatesCountResult[0]?.count || 0;
        
        // Get upcoming departures
        const today = new Date();
        const todayString = today.toISOString().split('T')[0];
        const upcomingDepartures = await SELECT.from(ActiveTours)
          .columns('ID', 'TourName', 'DepartureDate', 'CurrentBookings', 'MaxCapacity')
          .where(`DepartureDate >= '${todayString}'`)
          .orderBy('DepartureDate')
          .limit(5);
        
        // Get recently created templates
        const recentlyCreatedTemplates = await SELECT.from(TourTemplates)
          .columns('ID', 'TemplateName', 'CreatedAt', 'TourType')
          .orderBy({ CreatedAt: 'desc' })
          .limit(5);
        
        // Get tour type distribution - Fixed approach
        const tourTypeDistribution = [];
        try {
          const allTemplates = await SELECT.from(TourTemplates)
            .columns('TourType')
            .where('TourType IS NOT NULL');
          
          // Group by tour type in JavaScript
          const typeGroups = {};
          allTemplates.forEach(template => {
            const type = template.TourType;
            if (type) {
              typeGroups[type] = (typeGroups[type] || 0) + 1;
            }
          });
          
          // Convert to array format
          Object.keys(typeGroups).forEach(type => {
            tourTypeDistribution.push({
              TourType: type,
              Count: typeGroups[type]
            });
          });
        } catch (typeError) {
          console.error('Error getting tour type distribution:', typeError);
          // Continue with empty array
        }
        
        // Get monthly stats (6 months) - Fixed approach
        const monthlyStats = [];
        const currentDate = new Date();
        
        for (let i = 5; i >= 0; i--) { // Start from 5 months ago to current
          const month = new Date(currentDate);
          month.setMonth(currentDate.getMonth() - i);
          const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
          const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
          
          const monthStartString = monthStart.toISOString().split('T')[0];
          const monthEndString = monthEnd.toISOString().split('T')[0];
          
          try {
            // Count tours departing in this month
            const toursCountResult = await SELECT.from(ActiveTours)
              .columns('count(*) as count')
              .where(`DepartureDate >= '${monthStartString}' AND DepartureDate <= '${monthEndString}'`);
            const toursCount = toursCountResult[0]?.count || 0;
            
            // Get tours in this month for passenger and revenue calculation
            const toursInMonth = await SELECT.from(ActiveTours)
              .columns('ID')
              .where(`DepartureDate >= '${monthStartString}' AND DepartureDate <= '${monthEndString}'`);
            
            // Count total passengers for tours departing in this month
            let passengersCount = 0;
            if (toursInMonth && toursInMonth.length > 0) {
              for (const tour of toursInMonth) {
                try {
                  // Get orders for this tour first
                  const ordersForTour = await SELECT.from('tourish.management.Order')
                    .columns('ID')
                    .where({ ActiveTourID: tour.ID });
                  
                  // Count passengers for each order
                  for (const order of ordersForTour) {
                    const passengerCountResult = await SELECT.from(Passengers)
                      .columns('count(*) as count')
                      .where({ OrderID: order.ID });
                    passengersCount += passengerCountResult[0]?.count || 0;
                  }
                } catch (passengerError) {
                  console.error('Error counting passengers for tour:', tour.ID, passengerError);
                  // Continue with next tour
                }
              }
            }
            
            // Calculate estimated revenue for tours departing in this month
            let estimatedRevenue = 0;
            if (toursInMonth && toursInMonth.length > 0) {
              for (const tour of toursInMonth) {
                try {
                  const estimate = await SELECT.one.from(TourEstimates)
                    .columns('EstimatedRevenue')
                    .where({ ActiveTourID: tour.ID });
                    
                  if (estimate && estimate.EstimatedRevenue) {
                    estimatedRevenue += parseFloat(estimate.EstimatedRevenue) || 0;
                  }
                } catch (estimateError) {
                  console.error('Error getting estimate for tour:', tour.ID, estimateError);
                  // Continue with next tour
                }
              }
            }
            
            monthlyStats.push({
              Month: `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`,
              ToursCount: toursCount,
              PassengersCount: passengersCount,
              EstimatedRevenue: estimatedRevenue
            });
          } catch (monthError) {
            console.error('Error processing month data:', monthError);
            // Add empty data for this month
            monthlyStats.push({
              Month: `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`,
              ToursCount: 0,
              PassengersCount: 0,
              EstimatedRevenue: 0
            });
          }
        }
        
        const result = {
          activeToursCount: parseInt(activeToursCount),
          draftTemplatesCount: parseInt(draftTemplatesCount),
          publishedTemplatesCount: parseInt(publishedTemplatesCount),
          upcomingDepartures: upcomingDepartures || [],
          recentlyCreatedTemplates: recentlyCreatedTemplates || [],
          tourTypeDistribution: tourTypeDistribution || [],
          monthlyStats: monthlyStats || []
        };
        
        console.log('Dashboard data retrieved successfully:', result);
        return result;
        
      } catch (error) {
        console.error('Error in getToursDashboardData:', error);
        
        // Return default data instead of error to prevent frontend crashes
        return {
          activeToursCount: 0,
          draftTemplatesCount: 0,
          publishedTemplatesCount: 0,
          upcomingDepartures: [],
          recentlyCreatedTemplates: [],
          tourTypeDistribution: [],
          monthlyStats: []
        };
      }
    });
    
    /**
     * Generates a report for a tour
     */
    srv.on('generateTourReport', async (req) => {
      const { tourID, reportType } = req.data;
      
      try {
        // This would typically connect to a reporting service
        // For now, we'll just return a message
        
        // Validate tour exists
        const tour = await SELECT.one.from(ActiveTours).where({ ID: tourID });
        
        if (!tour) {
          return {
            reportURL: null,
            message: 'Tour not found'
          };
        }
        
        // In a real implementation, this would generate a report and save it to a file service
        // Then return the URL to the file
        
        return {
          reportURL: `/reports/${reportType}/${tourID}.pdf`,
          message: `${reportType} report generated successfully`
        };
      } catch (error) {
        console.error(error);
        return {
          reportURL: null,
          message: `Error generating report: ${error.message}`
        };
      }
    });
    
    /**
     * Generates an analytics report for tours
     */
    srv.on('generateToursAnalyticsReport', async (req) => {
      const { fromDate, toDate, tourTypes, status } = req.data;
      
      try {
        // Build query for tours in date range
        let query = SELECT.from(ActiveTours);
        let where = [];
        
        if (fromDate) {
          where.push(`DepartureDate >= '${fromDate}'`);
        }
        
        if (toDate) {
          where.push(`DepartureDate <= '${toDate}'`);
        }
        
        if (tourTypes && tourTypes.length > 0) {
          const typesClause = tourTypes.map(type => `'${type}'`).join(',');
          
          // First we need to get template IDs matching these types
          const templateQuery = `SELECT ID FROM "tourish.management.TourTemplate" WHERE "TourType" IN (${typesClause})`;
          const templates = await cds.run(templateQuery);
          
          if (templates.length > 0) {
            const templateIDs = templates.map(t => `'${t.ID}'`).join(',');
            where.push(`TemplateID IN (${templateIDs})`);
          } else {
            // No templates with these types
            return {
              reportURL: null,
              message: 'No tours found matching the selected tour types',
              summary: {
                totalTours: 0,
                totalPassengers: 0,
                totalRevenue: 0,
                totalProfit: 0,
                averageOccupancyRate: 0
              }
            };
          }
        }
        
        if (status && status.length > 0) {
          const statusClause = status.map(s => `'${s}'`).join(',');
          where.push(`Status IN (${statusClause})`);
        }
        
        if (where.length > 0) {
          const whereClause = where.join(' AND ');
          query = query.where(whereClause);
        }
        
        // Execute query
        const tours = await query;
        
        if (tours.length === 0) {
          return {
            reportURL: null,
            message: 'No tours found matching the criteria',
            summary: {
              totalTours: 0,
              totalPassengers: 0,
              totalRevenue: 0,
              totalProfit: 0,
              averageOccupancyRate: 0
            }
          };
        }
        
        // Calculate summary statistics
        let totalPassengers = 0;
        let totalRevenue = 0;
        let totalProfit = 0;
        let totalCapacity = 0;
        
        for (const tour of tours) {
          // Add to total capacity
          totalCapacity += tour.MaxCapacity;
          
          // Count passengers
          const passengerCount = await SELECT.from(Passengers)
            .where({ ActiveTourID: tour.ID })
            .count();
            
          totalPassengers += passengerCount;
          
          // Get financial data
          const estimate = await SELECT.one.from(TourEstimates)
            .where({ ActiveTourID: tour.ID });
            
          if (estimate) {
            totalRevenue += estimate.EstimatedRevenue;
            totalProfit += estimate.EstimatedProfit;
          }
        }
        
        // Calculate average occupancy rate
        const averageOccupancyRate = totalCapacity > 0 ? 
          (totalPassengers / totalCapacity) * 100 : 0;
        
        // In a real implementation, this would generate a report and save it to a file service
        // Then return the URL to the file
        
        return {
          reportURL: `/reports/analytics/${fromDate}-${toDate}.pdf`,
          message: 'Analytics report generated successfully',
          summary: {
            totalTours: tours.length,
            totalPassengers,
            totalRevenue,
            totalProfit,
            averageOccupancyRate
          }
        };
      } catch (error) {
        console.error(error);
        return {
          reportURL: null,
          message: `Error generating analytics report: ${error.message}`,
          summary: {
            totalTours: 0,
            totalPassengers: 0,
            totalRevenue: 0,
            totalProfit: 0,
            averageOccupancyRate: 0
          }
        };
      }
    });
  };