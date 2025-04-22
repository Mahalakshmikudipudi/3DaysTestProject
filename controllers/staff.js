const Staff = require('../models/staffMember');
const Service = require('../models/services');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Review = require('../models/review');
const Appointment = require('../models/bookingAppointment');
const User = require('../models/user');
const { Op } = require('sequelize');
const { findSocketByStaffId } = require('../helper/findSocketById');
const sendEmail = require('../service/sendEmail');

function convertTo12HourFormat(time24) {
    const [hour, minute] = time24.split(':').map(Number);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
}



// Utility function to check if a string is invalid
function isStringInvalid(string) {
    return !string || string.trim().length === 0;
}

// Function to generate JWT token
const generateAccessToken = (id, name) => {
    return jwt.sign({ staffId: id, name }, "secretkey", { expiresIn: "1h" });
};

// Login function using WebSockets
const staffLogin = async (io, socket, data) => {
    try {
        const { staffemail, staffpassword } = data;

        // Check for missing fields
        if (isStringInvalid(staffemail) || isStringInvalid(staffpassword)) {
            return socket.emit("staff-login-response", { success: false, message: "Email or password is missing" });
        }

        // Find user by email
        const staff = await Staff.findOne({ where: { staffemail } });
        if (!staff) {
            return socket.emit("staff-login-response", { success: false, message: "User not found" });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(staffpassword, staff.staffpassword);
        if (!isPasswordValid) {
            return socket.emit("staff-login-response", { success: false, message: "Incorrect password" });
        }

        // Generate JWT token
        const token = generateAccessToken(staff.id, staff.staffname);

        // Send success response with token
        socket.emit("staff-login-response", { success: true, token, message: "Login successful!" });
    } catch (error) {
        console.error(error);
        socket.emit("staff-login-response", { success: false, message: "Login failed, try again." });
    }
};

const getMyReviewsById = async (io, socket, data) => {
    try {
        // ✅ Convert to integers and fallback if invalid
        console.log("Incoming data:", data);
        const { staffId } = data;
        let { page, limit } = data;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 5;

        const offset = (page - 1) * limit;

        if (!staffId) {
            console.warn("Missing staffId in received data");
            return socket.emit('my-reviews-id', []);
        }

        const { rows: reviews, count: total } = await Review.findAndCountAll({
            where: { staffId },
            attributes: ['id', 'rating', 'comment', 'Response', 'createdAt'],
            include: [
                { model: Staff },
                {
                    model: Appointment,
                    include: [{ model: Service, as: 'service' }]
                }
            ],
            order: [['createdAt', 'DESC']],
            offset,
            limit
        });

        console.log("Reviews sent:", reviews.map(r => r.Response));


        socket.emit("my-reviews-id", {
            reviews,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
          });
    } catch (error) {
        console.error("Error fetching reviews:", error.message, error.stack);
        socket.emit('my-reviews-id', { success: false, message: "Failed to fetch reviews." });
    }
};


const respondToReview = async (io, socket, data) => {
    try {
        //console.log("Data", data);
        const { reviewId, staffResponse } = data;
        const staffId = socket.staff.id; // Get the staff ID from the authenticated socket
        const review = await Review.findByPk(reviewId);
        if (!review || review.staffId !== staffId) return;

        if (review.Response) {
            return socket.emit('error', 'Admin has already responded to this review.');
        }

        review.Response = staffResponse;
        await review.save();

        const fullReview = await Review.findByPk(reviewId, {
            include: [{ model: Staff }, { model: Service, as: 'service' }]
        });

        // Notify customer in real-time
        io.to(`user-${review.userId}`).emit('review-response', fullReview);
        socket.emit('review-response-saved', fullReview);
    } catch (err) {
        console.error("Error responding to review", err);
    }
};

const getAppointmentsByStaff = async (io, socket, data) => {
    const staffId = socket.staff.id;
    const appointments = await Appointment.findAll({
        where: { assignedStaffId: staffId },
        include: [
            { model: Service, as: 'service' },
            { model: Staff },
            { model: User, as: 'user' }
        ]
    });
    socket.emit('my-appointments-data', appointments);
};

const changeAvailabilityByStaff = async (io, socket, data) => {
    const staffId = socket.staff.id;
    const { appointmentId } = data;

    const appointment = await Appointment.findByPk(appointmentId, {
        include: [
            { model: User, as: "user" },
            { model: Staff, as: "Staff" },
            { model: Service, as: "service" }
        ]
    });

    if (!appointment || appointment.assignedStaffId !== staffId) {
        return socket.emit("error", "Invalid appointment or unauthorized access.");
    }

    // Prevent changing availability if already completed
    if (appointment.status === 'completed') {
        return socket.emit("error", "Cannot change availability for a completed appointment.");
    }

    // Mark current staff unavailable for this appointment
    appointment.isStaffAvailable = false;
    await appointment.save();

    // Randomly find replacement staff for the same service
    const availableStaff = await Staff.findAll({
        where: {
            specializationId: appointment.serviceId,
            isAvailable: true,
            id: { [Op.ne]: staffId }
        }
    });

    const replacement = availableStaff.length
        ? availableStaff[Math.floor(Math.random() * availableStaff.length)]
        : null;

    if (replacement) {
        appointment.assignedStaffId = replacement.id;
        appointment.isStaffAvailable = true;
        await appointment.save();

        // Notify the new staff via socket
        const newStaffSocket = findSocketByStaffId(io, replacement.id);
        if (newStaffSocket) {
            newStaffSocket.emit('new-appointment-assigned', appointment);
        }

        const timeFormatted = convertTo12HourFormat(appointment.time);

        // Notify new staff by email
        sendEmail({
            to: replacement.staffemail,
            subject: "New Appointment Assigned",
            html: `<p>You've been assigned a new appointment (ID: ${appointment.id}) for service ID: ${appointment.serviceId}.</p>`
        });

        // Notify the customer
        sendEmail({
            to: appointment.user.email,
            subject: "Your Appointment Has Been Updated",
            html: `<p>Hi ${appointment.user.name},<br>Your appointment for "${appointment.service.name}" on ${appointment.date} at ${timeFormatted} has been reassigned to a new staff member: ${replacement.staffname}.<br>Thank you!</p>`
        });
    }

    // Let the staff know the availability update is done
    socket.emit("availability-updated", {
        appointmentId: appointment.id,
        isStaffAvailable: appointment.isStaffAvailable
    });
};




module.exports = {
    staffLogin,
    generateAccessToken,
    getMyReviewsById,
    respondToReview,
    getAppointmentsByStaff,
    changeAvailabilityByStaff
};
