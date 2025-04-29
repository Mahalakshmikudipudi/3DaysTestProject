const Staff = require('../models/staffMember');
const Service = require('../models/services');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const WorkingHours = require('../models/workingHours');
const { generateSlots } = require('../helper/slotGenerator');
const StaffSlots = require('../models/staffSlots');
const Review = require('../models/review');
const Appointment = require('../models/bookingAppointment');
const sendEmail = require('../service/sendEmail');
const User = require('../models/user');


// Utility function to check if a string is invalid
function isStringInvalid(string) {
    return !string || string.trim().length === 0;
}

// Function to generate JWT token
const generateAccessToken = (id, name, specializationId) => {
    return jwt.sign({ staffId: id, name, specializationId }, "secretkey", { expiresIn: "1h" });
};

const logoutStaff = async (req, res) => {
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

const staffLogin = async (req, res, next) => {
    try {
        const { staffemail, staffpassword } = req.body;

        // Check for missing fields
        if (isStringInvalid(staffemail) || isStringInvalid(staffpassword)) {
            return res.status(501).json({ success: false, message: "Email or password is missing" });
        }

        // Find user by email
        const staff = await Staff.findOne({ where: { staffemail } });
        if (!staff) {
            return res.status(402).json({ success: false, message: "User not found" });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(staffpassword, staff.staffpassword);
        if (!isPasswordValid) {
            return res.status(503).json({ success: false, message: "Incorrect password" });
        }

        // Generate JWT token
        const token = generateAccessToken(staff.id, staff.staffname, staff.specializationId);
        return res.status(201).json({ success: true, message: "Logged in successfully", token });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Login failed, try again." });
    }

};

const getAllSlots = async (req, res) => {
    try {
        const { date, serviceId } = req.query;
        const staffId = req.staff.id;
        const selectedDate = new Date(date);
        const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
        
        console.log(dayName);

        const service = await Service.findByPk(serviceId);
        if (!service) return res.status(404).json({ error: "Service not found" });
        const serviceDuration = service.duration;

        const staff = await Staff.findOne({
            where: { id: staffId },
        });
        if (!staff) return res.status(404).json({ error: "Staff not found" });
        //console.log(staff);

        const workingHours = await WorkingHours.findOne({
            where: { day: dayName}
        });

        const startTime = workingHours.startTime;  // e.g., "09:00"
        const endTime = workingHours.endTime;      // e.g., "21:00"

        const allSlots = generateSlots(startTime, endTime, serviceDuration, selectedDate);
        //console.log(workingHours);

        // Fetch already booked slots for that date
        const bookedSlots = await StaffSlots.findAll({
            where: {
                staffId,
                date
            },
            attributes: ['startTime', 'endTime']
        });

        const selectedSlots = bookedSlots.map(slot => ({
            start: slot.startTime,
            end: slot.endTime
        }));

        //console.log("Selected Slots:", selectedSlots);

        return res.status(200).json({ success: true, message:"Slots generated Successfully", allSlots, selectedSlots });

    } catch(err) {
        console.log("Error get slots:", err);
        return res.status(500).json({ success: false, message:"Error getting slots"});
    }
};

const saveSelectedSlots = async(req, res, next) => {
    try {
        const { date, serviceId, slots } = req.body;
        const staffId = req.staff.id; // assuming auth middleware sets req.user

        // 2. Insert new slots
        const slotsToCreate = slots.map(slot => ({
            staffId,
            serviceId: serviceId,
            date,
            startTime: slot.start,
            endTime: slot.end,
            status: false
        }));

        const selectedSlots = await StaffSlots.bulkCreate(slotsToCreate);

        return res.status(200).json({ success: true, message: "Slots updated successfully", selectedSlots });
    } catch (err) {
        console.error("Error saving slots:", err);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

const getReviews = async (req, res, next) => {
    try {
        const staffId = req.staff.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const totalItems = await Review.count({ where: { staffId: staffId } });

        const reviews = await Review.findAll({
            where: { staffId: staffId },
            attributes: ['id', 'rating', 'comment', 'Response', 'createdAt'],
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



        return res.status(200).json({
            success: true, reviews,
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

const respondToReviewByStaff = async(req, res, next) => {
    try {
        const { reviewId, staffResponse } = req.body;
        const staffId = req.staff.id;

        const review = await Review.findByPk(reviewId);
        if (!review || review.staffId !== staffId) return;

        if (review.Response) {
            return res.status(500).json({success: false, message:'Admin has already responded to this review.'});
        }
        review.Response = staffResponse;
        await review.save();

        const fullReview = await Review.findByPk(reviewId, {
            include: [{ model: Staff }, { model: Service}]
        });

        return res.status(200).json({success: true, fullReview});

    } catch(err) {
        console.error("Error responding to review", err);
        return res.status(500).json({success: false, message:"Something went wrong"});
    }
};

const getAppointments = async(req, res, next) => {
    try {
        //console.log("req.staff:", req.staff.id);
        const staffId = req.staff.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        if (!req.staff) {
            return res.status(401).json({
              success: false,
              message: "Unauthorized: No staff information found",
              appointments: []  // <= include this to prevent frontend crash
            });
          }

        const totalItems = await Appointment.count({ where: { staffId: staffId } });

        //console.log("TotalItems:", totalItems);

        const appointments = await Appointment.findAll({
            where: { staffId },
            include: [
              { model: Service },
              { model: Staff },
              { model: User }
            ],
            offset: (page - 1) * limit,
            limit,
        });

        //console.log("Appointments:", appointments);

        return res.status(200).json({success: true, appointments,
            currentPage: page,
            hasNextPage: limit * page < totalItems,
            nextPage: page + 1,
            hasPreviousPage: page > 1,
            previousPage: page - 1,
            lastPage: Math.ceil(totalItems / limit),
        });

    } catch(err) {
        return res.status(500).json({success: false, message: "get appointments failed", appointments: []});
    }
};

const updateAvailability = async(req, res, next) => {
    try {
        const { appointmentId } = req.params;
        const staffId = req.staff.id
        console.log("AppointmentId", appointmentId);
        const appointment = await Appointment.findByPk(appointmentId, {
            include: [
                { model: User},
                { model: Staff},
                { model: Service},
            ]
        });
        if (!appointment || appointment.staffId !== staffId) {
            return res.status(402).json({success: false, message:"Invalid appointment or unauthorized access."});
        }
        if (appointment.status === 'completed') {
            return res.status(401).json({success: false, message:"Cannot change availability for a completed appointment."});
        }
        appointment.isStaffAvailable = false;
        appointment.status = 'cancelled';
        await appointment.save();

        await sendEmail({
            to: appointment.user.email,
            subject: "Your appointment is canceled",
            html: `<p>Hi ${appointment.user.name},</p>
            <p> your appointment is canceled due to unavailability of staff who is assigned</p>`
        });

        //console.log("Appointment:", appointment);
        
        return res.status(200).json({success: true, message: "Availability Updated Successfully", appointment});
    
    }catch(err) {
        console.error("Update availability error:", err);
        return res.status(500).json({success: false, message:"Availability updated failed"});
    }
}


module.exports = {
    logoutStaff,
    staffLogin,
    generateAccessToken,
    getAllSlots,
    saveSelectedSlots,
    getReviews,
    respondToReviewByStaff,
    getAppointments,
    updateAvailability,
}