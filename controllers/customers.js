const User = require('../models/user');
const StaffSlots = require('../models/staffSlots');
const Staff = require('../models/staffMember');
const Service = require('../models/services');
const Appointment = require('../models/bookingAppointment');
const { createOrder } = require("../service/cashfreeService");
const { getPaymentStatus } = require("../service/cashfreeService");
const sequelize = require('../util/database');
const Order = require('../models/paymentOrder');
const sendEmail = require('../service/sendEmail');
const { Op } = require('sequelize');
const Review = require('../models/review');
const moment = require('moment');

// helper function to format 24h time to 12h
function formatTime(time24) {
    const [hours, minutes] = time24.split(':');
    const date = new Date();
    date.setHours(parseInt(hours));
    date.setMinutes(parseInt(minutes));

    let options = { hour: 'numeric', minute: 'numeric', hour12: true };
    return date.toLocaleTimeString([], options);
}


const logoutUser = async (req, res) => {
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

const getProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const profile = await User.findByPk(userId);

        return res.status(200).json({ success: true, profile });
    } catch (error) {
        console.log("Get profile error:", error);
        return res.status(500).json({ success: false, message: 'Something went wrong!' });
    }
};

const updateProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { name, email, phonenumber } = req.body;

        //console.log("Profile Id:", userId);

        const profile = await User.findByPk(userId);
        if (!profile) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        profile.name = name;
        profile.email = email;
        profile.phonenumber = phonenumber;

        await profile.save();
        return res.status(200).json({ success: true, message: "Profile Updated Successfully" });
    } catch (err) {
        console.log("Update profile error:", err);
        return res.status(500).json({ success: false, message: "Error updating profile" });
    }
};

const getAvailableSlots = async (req, res, next) => {
    try {
        const { date, serviceId } = req.query;

        //console.log(date, serviceId);

        if (!date || !serviceId) {
            return res.status(400).json({ message: "Date and serviceId are required." });
        }


        // 1. Find all staff who provide this service (specializationId)
        const staffs = await Staff.findAll({
            where: { specializationId: serviceId },
            attributes: ['id']
        });

        const staffIds = staffs.map(s => s.id);

        if (staffIds.length === 0) {
            return res.status(404).json({ message: "No staff available for selected service." });
        }

        // 2. Find all slots selected by staff for that date
        const slots = await StaffSlots.findAll({
            where: {
                staffId: staffIds,
                date: date
            },
            attributes: ['id', 'date', 'startTime', 'endTime', 'staffId', 'status'],
            include: [
                {
                    model: Staff,
                    attributes: ['id', 'staffname']  // staffName
                },
                {
                    model: Service,
                    attributes: ['id', 'name', 'price']  // serviceName, servicePrice
                }
            ]
        });


        let formattedSlots = slots.map(slot => ({
            startTime: slot.startTime,
            endTime: slot.endTime,
            staffName: slot.Staff?.staffname || 'Unknown',
            serviceName: slot.Service?.name,
            servicePrice: slot.Service?.price,
            serviceId: slot.Service?.id,
            staffId: slot.Staff?.id,
            date: slot.date,
            isDisabled: slot.status,
            slotId: slot.id
        }));

        //console.log("Formatted:", formattedSlots);


        return res.status(200).json({ success: true, formattedSlots });
    } catch (error) {
        console.error("Error fetching slots:", error);
        res.status(500).json({ message: "Something went wrong." });
    }
};

const searchSlots = async (req, res, next) => {
    try {
        const { date, serviceId, fromTime, toTime } = req.query;

        if (!date || !serviceId || !fromTime || !toTime) {
            return res.status(400).json({ success: false, message: "Missing required parameters" });
        }

        // Fetch all available slots for the given date and service
        let allSlots = await StaffSlots.findAll({
            where: { date: date, serviceId: serviceId},
            include: [
                {
                    model: Staff,
                    attributes: ['id', 'staffname']  // staffName
                },
                {
                    model: Service,
                    attributes: ['id', 'name', 'price']  // serviceName, servicePrice
                }
            ]
        });
        // getSlotsForDateAndService() -> Your DB function to fetch slots (you must have this)

        // Filter slots between fromTime and toTime
        const filteredSlots = allSlots.filter(slot => {
            const slotStart = moment(slot.startTime, "HH:mm");  // Assume your slots have startTime and endTime in "HH:mm"
            const slotEnd = moment(slot.endTime, "HH:mm");
            const from = moment(fromTime, "HH:mm");
            const to = moment(toTime, "HH:mm");

            return slotStart.isSameOrAfter(from) && slotEnd.isSameOrBefore(to);
        });


        const formattedSlots = filteredSlots.map(slot => ({
            id: slot.id,
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            staffId: slot.staffId,
            serviceId: slot.serviceId,
            serviceName: slot.Service?.name,
            servicePrice: slot.Service?.price,
            staffName: slot.Staff?.staffname || 'Unknown',
            isDisabled: slot.status,
            slotId: slot.id
        }));


        return res.status(200).json({ success: true, slots: formattedSlots });


    } catch (error) {
        console.error("Error fetching slots:", error);
        return res.status(500).json({ message: "An error occurred while searching for slots!" });
    }
};

const bookAndPay = async (req, res, next) => {
    const transaction = await sequelize.transaction();//creating a transaction object
    try {
        const { serviceId, date, time, staffId, slotId } = req.body;
        //console.log("Bosy:", serviceId, date, time, staffId);
        const service = await Service.findByPk(serviceId);
        const userId = req.user.id;
        const orderId = "ORDER-" + Date.now();
        const orderAmount = service.price;
        const orderCurrency = "INR";
        const customerID = userId.toString();
        const customerPhone = "9999999999"; // Placeholder, ideally get from user profile

        const timeFormatted = formatTime(time);

        const appointment = await Appointment.create({
            date,
            time: timeFormatted,
            isPaid: false,
            status: 'pending',
            serviceId: serviceId,
            userId: userId,
            staffId: staffId,
            isStaffAvailable: true,
            slotId: slotId
        }, { transaction });

        const paymentSessionId = await createOrder(orderId, orderAmount, orderCurrency, customerID, customerPhone);

        await Order.create({
            userId: userId,
            orderAmount,
            orderCurrency,
            appointmentId: appointment.id,
            orderId,
            serviceId: serviceId,
            paymentSessionId,
            paymentStatus: "PENDING",

        }, { transaction });

        const fullAppointment = await Appointment.findByPk(appointment.id, {
            include: [
                { model: User, attributes: ['name'] },
                { model: Service, attributes: ['id', 'name', 'price'] },
                { model: Staff, attributes: ['id', 'staffname'] },
                { model: StaffSlots, attributes: ['id'] }
            ],
            transaction
        });

        // Commit transaction if all operations succeed
        await transaction.commit();

        // ✅ Return fullAppointment (with user, service, staff inside it)
        return res.status(200).json({
            success: true,
            message: "Appointment created Successfully",
            paymentSessionId,
            orderId,
            appointment: fullAppointment
        });

    } catch (err) {
        await transaction.rollback();
        console.error("Error initiating payment:", err);
        return res.status(200).json({ success: false, message: "Something went wrong during payment" });
    }
};

const updatePaymentStatus = async (req, res, next) => {
    try {
        const { orderId } = req.body;

        console.log("OrderId is:", orderId);


        // Get the payment status using your existing method
        const orderStatus = await getPaymentStatus(orderId);

        // Find the order by orderId and userId
        const order = await Order.findOne({ where: { orderId, userId: req.user.id } });

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Find the appointment associated with the order
        const appointment = await Appointment.findByPk(order.appointmentId, {
            include: [
                { model: User, attributes: ['name', 'email'] },
                { model: Staff, attributes: ['id', 'staffname', 'staffemail'] },
                { model: Service, attributes: ['id', 'name'] },
                {model: StaffSlots, attributes:['id']}
            ]
        });

        // Update the order with payment status
        await order.update({ paymentStatus: orderStatus });

        // Check if payment was successful
        if (orderStatus === "SUCCESS") {
            // Update appointment to show it is paid and confirmed
            await appointment.update({ isPaid: true, status: 'confirmed' });

            const staffSlots = await StaffSlots.findByPk(appointment.slotId,{
                include: [
                    { model: Staff, attributes: ['id', 'staffname', 'staffemail'] },
                    { model: Service, attributes: ['id', 'name'] }
                ]
            });
            //console.log("staffslots", staffSlots);

            await staffSlots.update({status: true});

            //console.log("StaffSlots:", staffSlots); 

            const timeFormatted = formatTime(appointment.time);

            // Send confirmation email to the user
            await sendEmail({
                to: appointment.user.email,
                subject: 'Appointment Confirmed',
                html: `
                  <h2>Hello ${appointment.user.name},</h2>
                  <p>Your appointment has been confirmed.</p>
                  <h3>Details:</h3>
                  <ul>
                      <li><strong>Service:</strong> ${appointment.Service.name}</li>
                      <li><strong>Date:</strong> ${appointment.date}</li>
                      <li><strong>Time:</strong> ${timeFormatted}</li>
                      <li><strong>Staff:</strong> ${appointment.Staff.staffname}</li>
                  </ul>
                  <p>We look forward to seeing you!</p>
                `
            });

            // Send notification email to the staff member
            await sendEmail({
                to: appointment.Staff.staffemail,
                subject: 'New Appointment Assigned',
                html: `
                    <p>Hi ${appointment.Staff.staffname},</p>
                    <p>You have been assigned a new appointment:</p>
                    <ul>
                        <li><strong>Date:</strong> ${appointment.date}</li>
                        <li><strong>Time:</strong> ${appointment.time}</li>
                        <li><strong>Service:</strong> ${appointment.Service.name}</li>
                        <li><strong>Customer:</strong> ${appointment.user.name}</li>
                    </ul>
                    <p>Please check your dashboard for more details.</p>
                `
            });

            // Respond with a success message to the client
            return res.status(200).json({ success: true, message: "Transaction successfully updated and emails sent" });
        } else {
            // Handle failed payment
            return res.status(400).json({ success: false, message: "Payment was not successful" });
        }

    } catch (err) {
        console.error("Error updating transaction:", err);
        return res.status(500).json({ success: false, message: "Something went wrong" });
    }
};

const getAppointmentById = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const totalItems = await Appointment.count({ where: { userId: userId } });

        const appointments = await Appointment.findAll({
            where: { userId: userId },
            offset: (page - 1) * limit,
            limit: limit,
            include: [
                { model: User, attributes: ['name'] },
                { model: Service, attributes: ['name'] },
                { model: Staff, attributes: ['id', 'staffname'] }
            ],
            order: [
                ['id', 'ASC']
            ]
        });

        return res.status(200).json({
            success: true, appointments,
            currentPage: page,
            hasNextPage: limit * page < totalItems,
            nextPage: page + 1,
            hasPreviousPage: page > 1,
            previousPage: page - 1,
            lastPage: Math.ceil(totalItems / limit),
        });
    } catch (err) {
        console.log("Error getting appointments:", err);
        return res.status(500).json({ success: false, message: "Getting appointments failed" });
    }
};

const rescheduleAppointment = async(req, res, next) => {
    const appointmentId = req.params.id;
    const userId = req.user.id;
    const { newDate, newTime, newStaffId, newSlotId } = req.body;

    try {
        // Step 1: Find the existing appointment
        const appointment = await Appointment.findOne({
            where: { id: appointmentId, userId },
            include: [
                { model: User, attributes: ['name', 'email'] },
                { model: Staff, attributes: ['id', 'staffname', 'staffemail'] },
                { model: Service, attributes: ['id', 'name'] },
                {model: StaffSlots, attributes:['id']}
            ]
        });

        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }


        // Step 2: Validate the new slot
        const slot = await StaffSlots.findOne({
            where: {
                id: newSlotId,
                staffId: newStaffId,
                date: newDate,
                startTime: newTime,
                status: false
            }
        });

        if (!slot) {
            return res.status(400).json({ success: false, message: 'Selected slot is no longer available' });
        }

        // Step 3: Free the old slot
        await StaffSlots.update({ status: false }, {
            where: { id: appointment.slotId }
        });

        // Step 4: Book the new slot
        await StaffSlots.update({ status: true }, {
            where: { id: newSlotId }
        });

        // Step 5: Update appointment
        appointment.slotId = newSlotId;
        appointment.staffId = newStaffId;
        appointment.date = newDate;
        appointment.time = newTime;
        await appointment.save();

        const timeFormatted = formatTime(appointment.time);

        await sendEmail({
            to: appointment.user.email,
            subject: "Appointment Rescheduled",
            html:`
            <p> Hello ${appointment.user.name},</p>
            <p>This is to inform you that your appointment is rescheduled. Please see the below details</p>
            <ul>
                <li><strong>Date:</strong> ${appointment.date}</li>
                <li><strong>Time:</strong> ${timeFormatted}</li>
                <li><strong>Service:</strong> ${appointment.Service.name}</li>
                <li><strong>Customer:</strong> ${appointment.user.name}</li>
            </ul>
            <p> We look forward to sss you. </p>`
        });

        return res.json({ success: true, message: 'Appointment rescheduled successfully' });

    } catch (err) {
        console.error('Error rescheduling appointment:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

const deleteAppointment = async(req, res, next) => {
    try {
        const { id } = req.params;
        const appointment = await Appointment.findByPk(id);

        if (!appointment) {
            return res.status(404).json({ success: false, message: "Appointment not found" });
        }

        await appointment.destroy({ where: { id: id}});

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

};

const getEligibleAppointments = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const appointments = await Appointment.findAll({
            where: {
                userId: userId,
                status: 'completed'
            },
            include: [
                { model: Staff, attributes: ['staffname'] },
                { model: Service, attributes: ['name'] },
                {
                    model: Review,
                    required: false // LEFT JOIN - allow no review
                }
            ],
            order: [['date', 'ASC']]
        });

        //filter appointments that DO NOT have a Review
        const eligibleAppointments = appointments.filter(appt => !appt.Review);

        return res.status(200).json({ success: true, appointments: eligibleAppointments });
    } catch (error) {
        console.error('Error fetching eligible appointments', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};


const submitReview = async(req, res, next) => {
    try {
        const userId = req.user.id;
        const { appointmentId, rating, comment } = req.body;

        if (!appointmentId || !rating || !comment) {
            return res.status(400).json({ message: 'Missing fields' });
        }

        const appointment = await Appointment.findOne({ where: { id: appointmentId, userId: userId } });
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        const review = await Review.create({
            userId: userId,
            staffId: appointment.staffId,
            appointmentId: appointment.id,
            rating,
            comment
        });

        return res.status(200).json({success: true, message: 'Review submitted', review });
    } catch (error) {
        console.error('Error submitting review', error);
        return res.status(500).json({success:false, message: 'Internal server error' });
    }

};

const getMyReviews = async(req, res, next) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const totalItems = await Review.count({ where: { userId: userId } });

        const reviews = await Review.findAll({
            where: { userId: userId },
            include: [
                {
                  model: Appointment,
                  include: [
                    { model: Service},
                    { model: Staff}
                  ]
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
}

module.exports = {
    logoutUser,
    getProfile,
    updateProfile,
    getAvailableSlots,
    bookAndPay,
    updatePaymentStatus,
    getAppointmentById,
    searchSlots,
    rescheduleAppointment,
    deleteAppointment,
    getEligibleAppointments,
    submitReview,
    getMyReviews

}