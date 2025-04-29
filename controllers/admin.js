const Service = require('../models/services');
const WorkingHours = require('../models/workingHours');
const Staff = require('../models/staffMember');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Review = require('../models/review');
const Appointment = require('../models/bookingAppointment');
const StaffSlots = require('../models/staffSlots');
const User = require('../models/user');

const logoutUser = async(req, res) => {
    try {
        
        // If using sessions, destroy it
        if (req.session) {
            req.session.destroy(err => {
                if (err) {
                    return res.status(500).json({ message: 'Logout failed. Try again!' });
                }
                res.status(200).json({ message: 'Logged out successfully!' });
            });
        } else {
            res.status(200).json({ message: 'Logged out successfully!' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong!' });
    }
};

const addService = async(req, res, next) => {
    try {
        const userId = req.user.id;
        const { name, description, duration, price, availability } = req.body;

        if (!name || !description || !duration || !price || !availability) {
            return res.status(400).json({ success: false, message: "All fields are required." });
        }
    

        //create service table
        const service = await Service.create({
            name,
            description,
            duration,
            price,
            availability,
            userId
        });

        return res.status(200).json({ success: true, service});
    } catch(err) {
        console.log("Error adding Service:", err);
        return res.status(500).json({ success: false, error: err.message});
    }
};

const getAllServices = async(req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const services = await Service.findAll({
            offset: (page - 1) * limit,
            limit: limit,
            order: [['createdAt', 'ASC']]
        });

        const totalItems = await Service.count();

        return res.status(200).json({
            success: true, services,
            currentPage: page,
            hasNextPage: limit * page < totalItems,
            nextPage: page + 1,
            hasPreviousPage: page > 1,
            previousPage: page - 1,
            lastPage: Math.ceil(totalItems / limit),
        });
    } catch(err) {
        console.log("Error getting services:", err);
        return res.status(500).json({ success: false, error: err.message});
    }
};

const editService = async(req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description, duration, price, availability } = req.body;

        const service = await Service.findByPk(id);
        service.name = name;
        service.description = description;
        service.duration = duration;
        service.price = price;
        service.availability = availability;

        await service.save();

        return res.status(200).json({ success: true, message: "Service updated successfully", service});

    } catch (error) {
        console.error("Error updating service:", error);
        res.status(500).json({ success: false, message: "Server error while updating service." });
    }
};

const deleteService = async(req, res, next) => {
    try {
        const { id } = req.params;

        await Service.destroy({
            where: { id }
        });

        return res.status(200).json({success: true, message: "Service deleted Successfully"});
    } catch (err) {
        console.error("Delete service error:", err);
        return res.status(500).json({ success: false, message: "Failed to delete service." });
    }
};

const addWorkingHours = async(req, res, next) => {
    try {
        const userId = req.user.id;
        const { day, startTime, endTime } = req.body;
        const workingHour = await WorkingHours.create({
            day,
            startTime,
            endTime,
            userId
        });

        return res.status(200).json({ success: true, workingHour});
    } catch (err) {
        console.error("Add workinghour error:", err);
        return res.status(500).json({ success: false, message: "Failed to add workinghour." });
    }
};

const getWorkingHours = async(req, res, next) => {
    try {
        const workingHours = await WorkingHours.findAll();

        res.status(200).json({success: true, workingHours});
    } catch(err) {
        console.log("Get workinghours err:", err);
        return res.status(500).json({ success: false, message: "Failed to get workinghours." });
    }
};

const updateWorkingHours = async(req, res, next) => {
    try {
        const { id } = req.params;
        const { day, startTime, endTime } = req.body;

        const workingHour = await WorkingHours.findByPk(id);
        workingHour.day = day;
        workingHour.startTime = startTime;
        workingHour.endTime = endTime;
        
        await workingHour.save();

        return res.status(200).json({success: true, workingHour, message: "WorkingHour updated successfully"})
    } catch(err) {
        console.log("Update workinghours err:", err);
        return res.status(500).json({ success: false, message: "Failed to update workinghours." });
    }
};

const addStaff = async(req, res, next) => {
    try {

        const userId = req.user.id;
        const { staffname, staffemail, staffphone, staffpassword, specializationId, isAvailable } = req.body;

        if (!staffname || !staffemail || !staffphone || !staffpassword || !isAvailable || !specializationId) {
            return res.status(400).json({ success: false, message: "All fields are required." });
        }
    
        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(staffpassword, 10);

        //create service table
        const staff = await Staff.create({
            staffname,
            staffemail,
            staffphone,
            staffpassword: hashedPassword,
            specializationId,
            isAvailable,
            userId
        });

        return res.status(200).json({ success: true, message:"Staff added Successfully", staff});
    } catch(err) {
        console.log("Error adding Staff:", err);
        return res.status(500).json({ success: false, error: err.message});
    }
};

const getAllStaff = async(req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const staffList = await Staff.findAll({
            include: [{ model: Service, as: 'specialization', attributes: ['name'] }],
            offset: (page - 1) * limit,
            limit: limit,
            order: [['createdAt', 'ASC']]
        });

        const totalItems = await Staff.count();

        return res.status(200).json({
            success: true, staffList,
            currentPage: page,
            hasNextPage: limit * page < totalItems,
            nextPage: page + 1,
            hasPreviousPage: page > 1,
            previousPage: page - 1,
            lastPage: Math.ceil(totalItems / limit),
        });
    } catch(err) {
        console.log("Error getting staff:", err);
        return res.status(500).json({ success: false, error: err.message});
    }
};

const editStaff = async(req, res, next) => {
    try {
        const { id } = req.params;
        const { staffname, staffemail, staffphone, specializationId, isAvailable } = req.body;

        console.log("staffname", staffname);

        const existingStaff = await Staff.findByPk(id);
        if (!existingStaff) {
            return res.status(404).json({ success: false, message: "Staff not found" });
        }

        existingStaff.staffname = staffname;
        existingStaff.staffemail = staffemail;
        existingStaff.staffphone = staffphone;
        existingStaff.specializationId = specializationId;
        existingStaff.isAvailable = isAvailable;

        await existingStaff.save();

        return res.json({ success: true, message: "Staff updated successfully", staff: existingStaff });

    } catch (error) {
        console.error("Error updating staff:", error);
        res.status(500).json({ success: false, message: "Server error while updating staff." });
    }
};

const deleteStaff = async(req, res, next) => {
    try {
        const { id } = req.params;

        await Staff.destroy({
            where: { id }
        });

        return res.status(200).json({success: true, message: "Staff deleted Successfully"});
    } catch (err) {
        console.error("Delete staff error:", err);
        return res.status(500).json({ success: false, message: "Failed to delete staff." });
    }
};

const getAllReviews = async(req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const totalItems = await Review.count();

        const reviews = await Review.findAll({
            include: [
                            { model: Staff },
                            {
                                model: Appointment,
                                include: [{ model: Service}]
                            }
                        ],
            offset: (page - 1) * limit,
            limit: limit,
        });

        

        return res.status(200).json({ success: true, reviews, 
            currentPage: page,
            hasNextPage: limit * page < totalItems,
            nextPage: page + 1,
            hasPreviousPage: page > 1,
            previousPage: page - 1,
            lastPage: Math.ceil(totalItems / limit),
        });
    } catch (error) {
        console.error('Error fetching reviews', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const respondToReviewByAdmin = async(req, res, next) => {
    try {
        const { reviewId, adminResponse } = req.body;
      console.log("ReviewId", reviewId, adminResponse);
  
      const review = await Review.findByPk(reviewId);
      if (!review) {
        return res.status(500).json({success: false, message:'Review not found.'});
      }
  
      // Allow admin to respond only if staff hasn't responded yet
      if (review.Response) {
        return res.status(500).json({success: false, message:'Staff already responded. Admin response not allowed.'});
      }
  
      review.Response = adminResponse;
      await review.save();
      return res.status(200).json({success: true, review})
    } catch (error) {
        console.error("Error in respond-review-by-admin:", error);
        return res.status(500).json({success: false, message:'Something went wrong'});
    }
  
};

const getAllAppointments = async(req, res, next) => {
    try {
        const appointments = await Appointment.findAll({
            include: [
                { model: User, attributes: ['name', 'email'] },
                { model: Staff, attributes: ['staffname'] },
                { model: Service, attributes: ['id', 'name'] }
            ]
        });
        return res.status(200).json({success: true, appointments});
    } catch(err) {
        return res.status(500).json({success: false, message:"something went wrong"});
    }
};

const deleteAppointment = async(req, res, next) => {
    try {
        const { appointmentId } = req.params;
        const appointment = await Appointment.findByPk(appointmentId);

        if (!appointment) {
            return res.status(404).json({ success: false, message: "Appointment not found" });
        }

        await appointment.destroy({ where: { id: appointmentId}});


        const staffSlots = await StaffSlots.findByPk(appointment.slotId, {
            include: [
                { model: Staff, attributes: ['id'] },
                { model: Service, attributes: ['id'] }
            ]
        });
        await staffSlots.update({status: false});
        return res.status(200).json({ success: true, message: "Appointment deleted successfully", staffSlots, appointment });
    } catch (err) {
        console.error('Error canceling appointment:', err);
        return res.status(500).json({ success: false, message: "Error deleting appointment" });
    }

}


module.exports = {
    logoutUser,
    addService,
    getAllServices,
    editService,
    deleteService,
    addWorkingHours,
    getWorkingHours,
    updateWorkingHours,
    addStaff,
    getAllStaff,
    editStaff,
    deleteStaff,
    getAllReviews,
    respondToReviewByAdmin,
    getAllAppointments,
    deleteAppointment
}