const Staff = require('../models/staffMember');
const Service = require('../models/services');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Review = require('../models/review');
const Appointment = require('../models/bookingAppointment');

// Utility function to check if a string is invalid
function isStringInvalid(string) {
    return !string || string.trim().length === 0;
}

// Function to generate JWT token
const generateAccessToken = (id, name) => {
    return jwt.sign({ staffId: id, name}, "secretkey", { expiresIn: "1h" });
};

// Login function using WebSockets
const staffLogin = async (io, socket, data ) => {
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
        socket.emit("staff-login-response", { success: true, token, message: "Login successful!"});
    } catch (error) {
        console.error(error);
        socket.emit("staff-login-response", { success: false, message: "Login failed, try again." });
    }
};

const getMyReviewsById = async (io, socket, data) => {
    try {
        console.log("Incoming data:", data);
        const { staffId } = data;

        if (!staffId) {
            console.warn("Missing staffId in received data");
            return socket.emit('my-reviews-id', []);
        }

        const reviews = await Review.findAll({
            where: { staffId },
            include: [
                { model: Staff },
                {
                    model: Appointment,
                    include: [{ model: Service, as: 'service' }]
                }
            ]
        });

        socket.emit('my-reviews-id', reviews);
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
  
        review.staffResponse = staffResponse;
        await review.save();
  
        const fullReview = await Review.findByPk(reviewId, {
          include: [{ model: Staff }, { model: Service, as:'service' }]
        });
  
        // Notify customer in real-time
        io.to(`user-${review.userId}`).emit('review-response', fullReview);
        socket.emit('review-response-saved', fullReview);
      } catch (err) {
        console.error("Error responding to review", err);
      }
};



module.exports = {
    staffLogin,
    generateAccessToken,
    getMyReviewsById,
    respondToReview
};
