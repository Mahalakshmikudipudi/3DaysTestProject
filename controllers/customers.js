require('dotenv').config();
const Service = require('../models/services');
const User = require('../models/user');
const Staff = require('../models/staffMember');
const Appointment = require('../models/bookingAppointment');
const WorkingHours = require('../models/workingHours'); // Assuming you have a model for working hours
const { getWeekday } = require('../service/helper'); // Utility function to get the weekday from a date
const { generateSlots } = require('../service/slotGenerator'); // Function to generate time slots based on working hours and service duration
const Review = require('../models/review');



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

const checkAppointmentStatus = async(io, socket, { appointmentId }) => {
  try{
    //console.log(appointmentId);
    const appointment = await Appointment.findByPk(appointmentId);
    //console.log("Appointment:", appointment.isPaid);
    socket.emit("appointment-payment-status", {
      isPaid: appointment.isPaid
    });

  } catch (error) {
    console.error("Error checking appointment payment status:", error);
    socket.emit("appointment-payment-status", {
      isPaid: false,
      error: "Internal server error"
    });
  }
}

const bookAppointment = async (io, socket, { serviceId, date, time, status }) => {
  try {
    const userId = socket.user.id;

    // 1. Find available staff with the specialization
    const staff = await Staff.findOne({
      where: { specializationId: serviceId },
    });

    if (!staff) {
      return socket.emit('appointment-error', { message: 'No staff available for this service.' });
    }

    // 2. Create appointment with staff assigned
    const appointment = await Appointment.create({
      userId,
      assignedStaffId: staff.id, // ✅ Fixed
      serviceId,
      date,
      time,
      status: 'pending',
      ispaid: false // Default to false if not provided
    });

    socket.emit("appointment-added", { appointmentId: appointment.id, staffId: staff.id }); // Notify all clients about the new appointment



  } catch (err) {
    console.error('Error booking appointment:', err);
    socket.emit('appointment-error', { message: 'Booking failed.' });
  }
}
const getAppointments = async (io, socket) => {
  try {
    const appointments = await Appointment.findAll({
      where: { userId: socket.user.id },
      include: [User, { model: Service, as: 'service', attributes: ['id', 'name'] }],
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


const getProfile = async (io, socket, data) => {
  try {
    const userId = socket.user.id; // Assuming user ID is stored in socket.user
    if (!userId) return socket.emit('profileError', { message: 'User not found.' });
    const user = await User.findByPk(userId);
    io.emit('profileData', user);
  } catch (err) {
    console.error('Error fetching profile:', err);
    io.emit('profileData', { message: 'Failed to fetch profile.' });
  }
};

const updateProfile = async (io, socket, data) => {
  try {
    const { name, email, phonenumber } = data;
    const userId = socket.user.id; // Assuming user ID is stored in socket.user

    const user = await User.findByPk(userId);
    if (!user) return socket.emit('profileError', { message: 'User not found.' });

    user.name = name;
    user.email = email;
    user.phonenumber = phonenumber;
    await user.save();

    io.emit('profileUpdated', { message: 'Profile updated successfully.', customer: user });
  } catch (error) {
    console.error('Error updating profile:', error);
    socket.emit('profileError', { message: 'Failed to update profile.' });
  }
}

const getEligibleAppointments = async (io, socket, data) => {
  try {
    const appointments = await Appointment.findAll({
      where: { userId: socket.user.id, status: 'completed' },
      include: [
        { model: Service, as: 'service' },
        { model: Staff },
        {
          model: Review,
          required: false
        }
      ]
    });

    const notReviewed = appointments.filter(appt => !appt.Review);
    socket.emit('eligible-appointments', notReviewed);
  } catch (error) {
    console.error('Error:', error);
    socket.emit('error', 'Failed to fetch appointments');
  }
};

const addReview = async (io, socket, data) => {
  try {
    const { appointmentId, rating, comment } = data;
    const appointment = await Appointment.findOne({ where: { id: appointmentId, userId: socket.user.id } });

    if (!appointment || appointment.status !== 'completed') {
      return socket.emit('error', 'Appointment not eligible');
    }

    const exists = await Review.findOne({ where: { appointmentId } });
    if (exists) return socket.emit('error', 'Review already submitted');

    const review = await Review.create({
      userId: socket.user.id,
      staffId: appointment.assignedStaffId,
      serviceId: appointment.serviceId,
      appointmentId,
      rating,
      comment
    });

    // Notify customer
    socket.emit('review-submitted', review);

    // Notify staff (if online)
    io.to(`staff_${appointment.assignedStaffId}`).emit('new-review', review);
  } catch (error) {
    console.error(error);
    socket.emit('error', 'Failed to submit review');
  }
};

const getMyReviews = async (io, socket) => {
  try {
    const reviews = await Review.findAll({
      where: { userId: socket.user.id },
      include: [
        {
          model: Appointment,
          include: [
            { model: Service, as: 'service' },
            { model: Staff }
          ]
        }
      ]
    });

    const formatted = reviews.map(r => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      staffResponse: r.staffResponse,
      service: r.Appointment?.service,
      Staff: r.Appointment?.Staff
    }));
    
    socket.emit('my-reviews', formatted);
    

    // Format the reviews to flatten the structure a bit if needed (optional)
    socket.emit('my-reviews', formatted);
  } catch (err) {
    console.error('Error fetching reviews:', err);
    socket.emit('error', 'Failed to fetch reviews');
  }
};



module.exports = {
  getAvailableSlots,
  bookAppointment,
  checkAppointmentStatus,
  getAppointments,
  rescheduleAppointment,
  cancelAppointment,
  getProfile,
  updateProfile,
  getEligibleAppointments,
  addReview,
  getMyReviews
};