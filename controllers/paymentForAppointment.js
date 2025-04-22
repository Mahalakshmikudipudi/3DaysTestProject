require('dotenv').config();
const Order = require("../models/paymentOrder");
const { createOrder } = require("../service/cashfreeService");
const { getPaymentStatus } = require("../service/cashfreeService");
const Appointment = require("../models/bookingAppointment");
const Service = require("../models/services");
const User = require("../models/user");
const sendEmail = require('../service/sendEmail');
const Staff = require('../models/staffMember');

function convertTo12HourFormat(time24) {
    const [hour, minute] = time24.split(':').map(Number);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
}


const madePayment = async (io, socket, { appointmentId, serviceId }) => {
    try {
        const service = await Service.findByPk(serviceId);
        const orderId = "ORDER-" + Date.now();
        const orderAmount = service.price;
        const orderCurrency = "INR";
        const customerID = socket.user.id.toString();
        const customerPhone = "9999999999"; // Placeholder, ideally get from user profile

        const paymentSessionId = await createOrder(orderId, orderAmount, orderCurrency, customerID, customerPhone);

        await Order.create({
            userId: socket.user.id,
            orderAmount,
            orderCurrency,
            appointmentId,
            orderId,
            ServiceId: serviceId,
            paymentSessionId,
            paymentStatus: "PENDING"
        });

        socket.emit("payment-initiated", { paymentSessionId, orderId });

    } catch (err) {
        console.error("Error initiating payment:", err);
        socket.emit("payment-error", { message: "Something went wrong during payment" });
    }
};

const checkPaymentStatus = async (io, socket, { paymentSessionId, orderId }) => {
    try {
        console.log("OrderId is:", orderId);
        const orderStatus = await getPaymentStatus(orderId);
        const order = await Order.findOne({ where: { orderId, userId: socket.user.id } });

        if (!order) {
            return socket.emit("transaction-update-failed", { message: "Order not found" });
        }

        const appointment = await Appointment.findByPk(order.appointmentId, {
            include: [
                { model: User, attributes: ['name', 'email'] },
                { model: Staff, attributes: ['staffname', 'staffemail'] },
                { model: Service, as: 'service', attributes: ['name'] }
            ]
        });

        await order.update({ paymentStatus: orderStatus });

        if (orderStatus === "SUCCESS") {
            await appointment.update({ isPaid: true, status: 'confirmed' }); // ✅ Update `ispaid` to true
            const timeFormatted = convertTo12HourFormat(appointment.time);
            await sendEmail({
                to: appointment.user.email,
                subject: 'Appointment Confirmed',
                html: `
                  <h2>Hello ${appointment.user.name},</h2>
                  <p>Your appointment has been confirmed.</p>
                  <h3>Details:</h3>
                  <ul>
                      <li><strong>Service:</strong> ${appointment.service.name}</li>
                      <li><strong>Date:</strong> ${appointment.date}</li>
                      <li><strong>Time:</strong> ${timeFormatted}</li>
                      <li><strong>Staff:</strong> ${appointment.Staff.staffname}</li>
                  </ul>
                  <p>We look forward to seeing you!</p>
                `
            });

            await sendEmail({
                to: appointment.Staff.staffemail,
                subject: 'New Appointment Assigned',
                html: `
                    <p>Hi ${appointment.Staff.staffname},</p>
                    <p>You have been assigned a new appointment:</p>
                    <ul>
                        <li><strong>Date:</strong> ${appointment.date}</li>
                        <li><strong>Time:</strong> ${appointment.time}</li>
                        <li><strong>Service:</strong> ${appointment.service.name}</li>
                        <li><strong>Customer:</strong> ${appointment.user.name}</li>
                    </ul>
                    <p>Please check your dashboard for more details.</p>
    `
            })


            socket.emit("transaction-updated");
        } else {
            socket.emit("transaction-update-failed", { message: "Payment was not successful" });
        }

    } catch (err) {
        console.error("Error updating transaction:", err);
        socket.emit("transaction-update-failed", { message: "Something went wrong" });
    }
};



module.exports = {
    madePayment,
    checkPaymentStatus
};
