require('dotenv').config();
const Service = require('../models/services');
const User = require('../models/user');
const Staff = require('../models/staffMember');
const Appointment = require('../models/bookingAppointment');
const WorkingHours = require('../models/workingHours'); // Assuming you have a model for working hours
const { getWeekday } = require('../service/helper'); // Utility function to get the weekday from a date
const { generateSlots } = require('../service/slotGenerator'); // Function to generate time slots based on working hours and service duration
const Order = require("../models/paymentOrder");
const { createOrder } = require("../service/cashfreeService");
const { getPaymentStatus } = require("../service/cashfreeService");


const addWorkingHours = async (io, socket, data) => {
    try {
        const { startTime, endTime, day } = data;
        const newWorkingHour = await WorkingHours.create({
            startTime,
            endTime,
            day
        });

        io.emit('working-hours-updated', newWorkingHour);
    } catch (error) {
        console.error('Error adding working hours:', error);
        socket.emit('error', 'Failed to add working hours.');
    }
};

const getWorkingHours = async (io, socket) => {
    try {

        const workingHours = await WorkingHours.findAll();

        socket.emit('working-hours-list', workingHours);
    } catch (error) {
        console.error('Error fetching working hours:', error);
        socket.emit('error', 'Failed to fetch working hours.');
    }
};

const getAvailableSlots = async (io, socket, { date, time, serviceId }) => {
    try {
        const service = await Service.findByPk(serviceId);
        if (!service) return socket.emit("available-slots", []);
  
        const appointments = await Appointment.findAll({ where: { date, serviceId } });
        const bookedTimes = appointments.map(a => a.time.slice(0, 5)); // "10:00:00" → "10:00"

  
        const day = getWeekday(date);
        const workingHours = await WorkingHours.findOne({ where: { day } });
        const duration = parseInt(service.duration) || 30; // Default to 30 minutes if not set
  
        const allSlots = generateSlots(workingHours, duration, bookedTimes);

        const availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot));

        socket.emit('available-slots', availableSlots);
      } catch (err) {
        console.error('Error fetching available slots:', err);
        socket.emit("available-slots", []);
      }
  
}

const bookAppointment = async (io, socket, { serviceId, date, time, status }) => {
    try {
        const userId = socket.user.id; // Assuming user ID is stored in socket.user
        const appointment = await Appointment.create({ userId, serviceId, date, time, status: 'pending' });
        const fullAppointment = await Appointment.findByPk(appointment.id, {
            include: [User, Service]
        });
        io.emit('appointment-added', fullAppointment); // broadcast
    } catch (err) {
        console.error("Error booking appointment:", err);
    }
}
const getAppointments = async (io, socket) => {
    try {
        const appointments = await Appointment.findAll({
          where: { userId:socket.user.id },
          include: [User, { model: Service, as: 'service', attributes: ['name']}],
        });
        socket.emit('user-appointment-list', appointments);
      } catch (err) {
        console.error("Error fetching user appointments:", err);
        socket.emit('user-appointment-list', []);
      }
};

const rescheduleAppointment = async (io, socket, { appointmentId, date, time, serviceId }) => {
    try {
        const appointment = await Appointment.findByPk(appointmentId);
        if (!appointment) return;

        appointment.serviceId = serviceId;
        appointment.date = date;
        appointment.time = time;
        await appointment.save();

        // Re-fetch related user/service for frontend display
        const updated = await Appointment.findByPk(appointmentId, {
            include: [User, { model: Service, as: 'service', attributes: ['name'] }]
        });

        io.emit('appointment-rescheduled', updated);
    } catch (err) {
        console.error('Error updating appointment:', err);
    }
};

const cancelAppointment = async (io, socket, appointmentId) => {
    try {
      const appointment = await Appointment.findByPk(appointmentId);
  
      if (!appointment) {
        return socket.emit("appointment-cancel-failed", "Appointment not found");
      }
  
      await appointment.destroy();
  
      io.emit("appointment-cancelled", appointmentId); // Notify all clients
    } catch (err) {
      console.error("Error cancelling appointment:", err);
      socket.emit("appointment-cancel-failed", "Something went wrong");
    }
};

const paymentOrder = async (io, socket, { appointmentId, serviceId, userId }) => {
    try {
        // 🧠 1. Fetch the service and get the price
    const service = await Service.findByPk(serviceId);

    if (!service) {
      return socket.emit("premium-purchase-initiated", {
        success: false,
        message: "Service not found"
      });
    }

    const orderAmount = service.price; //  Get price from service
    const orderId = "ORDER-" + Date.now();
    const orderCurrency = "INR";
    const customerPhone = "9999999999";

    //  2. Create Cashfree order
    const paymentSessionId = await createOrder(
      orderId,
      orderAmount,
      orderCurrency,
      userId.toString(),
      customerPhone
    );

    //  3. Save order in DB
    await Order.create({
      userId,
      orderAmount,
      orderCurrency,
      orderId,
      paymentSessionId,
      paymentStatus: "PENDING"
    });

    //  4. Emit result back
    socket.emit("premium-purchase-initiated", {
      success: true,
      paymentSessionId,
      orderId
    });

  } catch (err) {
    console.error("Purchase Error:", err);
    socket.emit("premium-purchase-initiated", {
      success: false,
      message: "Failed to initiate purchase"
    });
  }
};

const checkPaymentStatus = async (io, socket, { orderId, userId }) => {
    try {
        if (!orderId) {
          return socket.emit('payment-status-checked', { success: false, message: "Missing orderId" });
        }

        const orderStatus = await getPaymentStatus(orderId);
        const order = await Order.findOne({ where: { orderId, userId } });

        if (!order) {
          return socket.emit('payment-status-checked', { success: false, message: "Order not found" });
        }

        if (orderStatus === "SUCCESS") {
          await Promise.all([
            order.update({ paymentStatus: "SUCCESS" }),
            appointment.update({ ispaid: true }, { where: { id: userId } })
          ]);

          const newToken = generateAccessToken(userId, undefined, true);
          return socket.emit('payment-status-checked', {
            success: true,
            paymentStatus: "SUCCESS",
            token: newToken
          });
        }

        return socket.emit('payment-status-checked', {
          success: true,
          paymentStatus: orderStatus
        });

      } catch (error) {
        console.error("Check Payment Error:", error.message);
        socket.emit('payment-status-checked', {
          success: false,
          message: "Error checking payment status"
        });
      }
};
  



module.exports = {
    addWorkingHours,
    getWorkingHours,
    getAvailableSlots,
    bookAppointment,
    getAppointments,
    rescheduleAppointment,
    cancelAppointment, 
    paymentOrder,
    checkPaymentStatus
};