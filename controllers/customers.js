require('dotenv').config();
const Service = require('../models/services');
const User = require('../models/user');
const Staff = require('../models/staffMember');
const Appointment = require('../models/bookingAppointment');
const WorkingHours = require('../models/workingHours'); // Assuming you have a model for working hours
const { getWeekday } = require('../helper/helper'); // Utility function to get the weekday from a date
const { generateSlots } = require('../helper/slotGenerator'); // Function to generate time slots based on working hours and service duration
const Review = require('../models/review');
const sendEmail = require('../service/sendEmail');

function convertTo12HourFormat(time24) {
  const [hour, minute] = time24.split(':');
  const hourInt = parseInt(hour);
  const period = hourInt >= 12 ? 'PM' : 'AM';
  const hour12 = hourInt % 12 === 0 ? 12 : hourInt % 12;
  return `${hour12}:${minute} ${period}`;
}

const getStaffByService = async (io, socket, data) => {
  try {
    const { serviceId } = data;

    const staffList = await Staff.findAll({
      where: { specializationId: serviceId }, // filter on foreign key
      include: {
        model: Service,
        as: 'specialization',
        attributes: ['id', 'name'], // optional: select specific service fields
      },
      attributes: ['id', 'staffname']
    });

    //console.log('Found Staff:', staffList);


    socket.emit('staff-list-by-service', staffList);
  } catch (error) {
    console.error('Error fetching staff for service:', error);
    socket.emit('staff-list-by-service', []); // fallback empty list
  }
};


const getAvailableSlots = async (io, socket, { serviceId, staffId, date, fromTime, toTime }) => {
    try {
      console.log("Totime is", toTime);
      // Fetch service duration
      const service = await Service.findByPk(serviceId);
      if (!service) {
        console.log("No service found");
        return socket.emit("availableSlotsResult", []);
      }
  
      // Fetch staff working hours
      const staff = await Staff.findByPk(staffId);
      if (!staff || !staff.startTime || !staff.endTime) {
        console.log("No staff or working hours found");
        return socket.emit("availableSlotsResult", []);
      }
  
      // Generate slots
      const slots = generateSlots(
        fromTime,
        toTime,
        service.duration,
        staff.startTime,
        staff.endTime
      );
  
      console.log("Generated slots:", slots);
  
      // Filter out booked appointments
      const appointments = await Appointment.findAll({
        where: { assignedStaffId: staffId, date },
      });
  
      const bookedTimes = appointments.map((a) => a.time);
      const availableSlots = slots.filter(slot => !bookedTimes.includes(slot));
  
      console.log("Available slots:", availableSlots);
  
      socket.emit("availableSlotsResult", availableSlots);
    } catch (err) {
      console.error("Slot fetch error:", err);
      socket.emit("availableSlotsResult", []);
    }
}

const checkAppointmentStatus = async (io, socket, { appointmentId }) => {
  try {
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

const bookAppointment = async (io, socket, data) => {
  try {
    const userId = socket.user.id;
  
    // Get appointment details from the client
    const { serviceId, date, time, selectedStaffId, status } = data; // Make sure appointmentData is received from frontend
  
    let assignedStaff;
  
    if (selectedStaffId) {
      // ✅ 1. If a staff is selected, validate and assign them
      assignedStaff = await Staff.findOne({
        where: {
          id: selectedStaffId,
          specializationId: serviceId,
          isAvailable: true
        }
      });
  
      if (!assignedStaff) {
        return socket.emit('appointment-error', { message: 'Selected staff is not available.' });
      }
    } else {
      // ✅ 2. If no staff is selected, find all available staff with working hours that include the selected time
      const allAvailableStaff = await Staff.findAll({
        where: {
          specializationId: serviceId,
          isAvailable: true
        }
      });
  
      const staffAtWork = allAvailableStaff.filter(staff => {
        const [startHour, startMinute] = staff.startTime.split(':').map(Number);
        const [endHour, endMinute] = staff.endTime.split(':').map(Number);
        const [hour, minute] = time.split(':').map(Number);
  
        const slotMinutes = hour * 60 + minute;
        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;
  
        return slotMinutes >= startMinutes && slotMinutes + staff.duration <= endMinutes;
      });
  
      if (staffAtWork.length === 0) {
        return socket.emit('appointment-error', { message: 'No staff available at this time.' });
      }
  
      // Randomly assign
      assignedStaff = staffAtWork[Math.floor(Math.random() * staffAtWork.length)];
    }
  
    // ✅ 3. Create appointment
    const appointment = await Appointment.create({
      userId,
      assignedStaffId: assignedStaff.id,
      serviceId,
      date,
      time,
      status: status || 'pending',
      ispaid: false
    });
  
    // ✅ 4. Emit back to client
    socket.emit("appointment-added", {
      appointmentId: appointment.id,
      staffId: assignedStaff.id,
      serviceId
    });
  
  
  } catch (err) {
    console.error('Error booking appointment:', err);
    socket.emit('appointment-error', { message: 'Booking failed.' });
  }
};

const getAppointments = async (io, socket) => {
  try {
    const appointments = await Appointment.findAll({
      where: { userId: socket.user.id },
      include: [ 
        {
          model: User,

        },
        {
          model: Staff,
          attributes: ['id', 'staffname'], // only include necessary fields
        },
        {
          model: Service,
          as: 'service',
          attributes: ['name'],
        },
      ],
    });
    socket.emit('user-appointment-list', appointments);
  } catch (err) {
    console.error("Error fetching user appointments:", err);
    socket.emit('user-appointment-list', []);
  }
};

const rescheduleAppointment = async (io, socket, { appointmentId, date, time, serviceId, selectedStaffId }) => {
  try {
    const appointment = await Appointment.findByPk(appointmentId);

    if (!appointment) return;

    // Update appointment info
    appointment.serviceId = serviceId;
    appointment.date = date;
    appointment.time = time;

    // If no staff assigned yet, assign one randomly
    if (!appointment.assignedStaffId) {
      const availableStaff = await Staff.findAll({
        where: {
          specializationId: serviceId,
          isAvailable: true,
          startTime: { [Op.lte]: time },
          endTime: { [Op.gte]: time }
        }
      });

      if (availableStaff.length === 0) {
        return socket.emit('appointment-error', {
          message: 'No available staff to reschedule this appointment.'
        });
      }

      const randomStaff = availableStaff[Math.floor(Math.random() * availableStaff.length)];
      appointment.assignedStaffId = randomStaff.id;

      // Send staff email
      await sendEmail(
        randomStaff.email,
        'New Appointment Assigned (Rescheduled)',
        `
          Hello ${randomStaff.name},

          A rescheduled appointment has been assigned to you:

          Date: ${date}
          Time: ${convertTo12HourFormat(time)}
          Service ID: ${serviceId}

          Please check your schedule.

          Thanks,
          Salon Team
        `
      );
    } else {
      appointment.assignedStaffId = selectedStaffId;
    }

    await appointment.save();

    // Get full details for response
    const updated = await Appointment.findByPk(appointmentId, {
      include: [User, { model: Service, as: 'service', attributes: ['name'] }]
    });

    // Notify user via email
    const userEmail = updated.user?.email;
    const userName = updated.user?.name || 'Customer';
    const serviceName = updated.service?.name || 'Selected Service';

    if (userEmail) {
      const subject = 'Your Appointment Has Been Rescheduled';
      const formattedTime = convertTo12HourFormat(updated.time);
      const message = `
        Hi ${userName},

        Your appointment has been successfully rescheduled.

        Date: ${updated.date}
        Time: ${formattedTime}
        Service: ${serviceName}

        If you have any questions, feel free to contact us.

        Thank you!
      `;

      await sendEmail(userEmail, subject, message);
    }

    io.emit('appointment-rescheduled', updated);
  } catch (err) {
    console.error('Error updating appointment:', err);
    socket.emit('appointment-error', { message: 'Failed to reschedule appointment.' });
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

    // ✅ Send email to staff
    if (appointment.Staff && appointment.Staff.email) {
      await sendEmail({
        to: appointment.Staff.email,
        subject: 'You received a new review from a customer!',
        html: `
          <p>Hi <strong>${appointment.Staff.staffname}</strong>,</p>
          <p>A customer has just left a review for a service you provided.</p>
          <ul>
            <li><strong>Service:</strong> ${appointment.serviceName || 'N/A'}</li>
            <li><strong>Rating:</strong> ${'⭐️'.repeat(rating)}</li>
            <li><strong>Comment:</strong> "${comment}"</li>
          </ul>
          <p>You can view and respond to this review from your staff dashboard.</p>
          <p>– Your Team</p>
        `
      });
    }

    // Notify customer
    socket.emit('review-submitted', review);

    // Notify staff (if online)
    io.to(`staff_${appointment.assignedStaffId}`).emit('new-review', review);
  } catch (error) {
    console.error(error);
    socket.emit('error', 'Failed to submit review');
  }
};

const getMyReviews = async (io, socket, data) => {
  try {
    //console.log("Data is:", data);
    let { page, limit } = data;
    //console.log("Page is:", page);
    // ✅ Convert to integers and fallback if invalid
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 5;
    const offset = (page - 1) * limit;
    const { rows: reviews, count: total } = await Review.findAndCountAll({
      where: { userId: socket.user.id },
      include: [
        {
          model: Appointment,
          include: [
            { model: Service, as: 'service' },
            { model: Staff }
          ]
        }
      ],
      offset,
      limit, // ✅ Add this to paginate in the DB itself
      order: [['createdAt', 'DESC']]
    });

    const formatted = reviews.map(r => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      staffResponse: r.staffResponse,
      service: r.Appointment?.service,
      Staff: r.Appointment?.Staff
    }));

    //console.log("Formatted", formatted);
    //console.log(total, page, limit);
    socket.emit("my-reviews", {
      reviews: formatted,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('Error fetching reviews:', err);
    socket.emit('error', 'Failed to fetch reviews');
  }
};



module.exports = {
  getStaffByService,
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