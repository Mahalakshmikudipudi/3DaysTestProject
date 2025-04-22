const Service = require('../models/services');
const User = require('../models/user');
const Staff = require('../models/staffMember');
const Appointment = require('../models/bookingAppointment');
const Review = require('../models/review');
const WorkingHours = require('../models/workingHours'); // Assuming you have a model for working hours
const bcrypt = require("bcrypt");
const sendEmail = require('../service/sendEmail'); // Assuming you have a function to send emails
const { Op } = require('sequelize');

function convertTo12HourFormat(time24) {
    const [hour, minute] = time24.split(':').map(Number);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
}


const addService = async (io, socket, data) => {
    try {
        const newService = await Service.create(data);
        io.emit('service-added', newService); // Broadcast to all
    } catch (err) {
        console.error('Failed to add service:', err);
    }
};

const getAllServices = async (io, socket) => {
    try {
        const services = await Service.findAll();
        socket.emit('service-list', services);
    } catch (err) {
        console.error('Failed to fetch services:', err);
        socket.emit('error', 'Unable to fetch services');
    }
};

const updateService = async (io, socket, data) => {
    try {
        const { id, name, description, duration, price, availability } = data;

        // Update the service in DB
        await Service.update(
            { name, description, duration, price, availability },
            { where: { id } }
        );

        // Fetch the updated service
        const updatedService = await Service.findByPk(id);

        // Emit updated service to all clients
        io.emit('service-updated', updatedService);
    } catch (error) {
        console.error('Error updating service:', error);
        socket.emit('error-service-update', { message: 'Failed to update service.' });
    }
};

const addStaff = async (io, socket, data) => {
    try {
        console.log("Data is", data);
        const {
            staffname,
            staffemail,
            staffphone,
            staffpassword,
            specializationId,
            isAvailable,
            startTime,
            endTime
        } = data;

        const userId = socket.user.id; // Assuming user ID is stored in socket.user

        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(staffpassword, 10);

        // Create staff
        const newStaff = await Staff.create({
            staffname,
            staffemail,
            staffphone,
            staffpassword: hashedPassword,
            specializationId,
            isAvailable,
            startTime,
            endTime,
            userId
        });

        // Fetch with specialization for emitting
        const fullStaff = await Staff.findByPk(newStaff.id, {
            include: [{ model: Service, as: 'specialization', attributes: ['name'] }]
        });

        console.log("Fullstaff", fullStaff);

        // Emit the newly created staff member to all clients
        io.emit('staff-added', fullStaff);
    } catch (error) {
        console.error('Error adding staff:', error);
        socket.emit('error', 'Failed to add staff.');
    }
};

const getAllStaff = async (io, socket, data) => {
    try {
        //console.log("Data", data);
        let { page, limit } = data;
        const offset = (page - 1) * limit;

        const { count, rows } = await Staff.findAndCountAll({
            include: [{ model: Service, as: 'specialization', attributes: ['name'] }],
            offset,
            limit,
            order: [['createdAt', 'DESC']]
        });

        //console.log("Rows is", rows);

        socket.emit('staff-list', {
            staffMembers: rows,
            total: count,
            page,
            totalPages: Math.ceil(count / limit)
        });
    } catch (error) {
        console.error('Error fetching staff:', error);
        socket.emit('error', 'Failed to fetch staff.');
    }
};


const editStaff = async (io, socket, updatedData) => {
    try {
        const {
            id,
            staffname,
            staffemail,
            staffphone,
            specializationId,
            isAvailable,
            startTime,
            endTime
        } = updatedData;

        const staff = await Staff.findByPk(id);
        if (!staff) return socket.emit('error', 'Staff not found.');

        await staff.update({
            staffname,
            staffemail,
            staffphone,
            specializationId,
            isAvailable,
            startTime,
            endTime
        });

        const updatedStaff = await Staff.findByPk(id, {
            include: [{ model: Service, as: 'specialization', attributes: ['name'] }]
        });

        io.emit('staff-updated', updatedStaff);
    } catch (error) {
        console.error('Error updating staff:', error);
        socket.emit('error', 'Failed to update staff.');
    }
};

const deleteStaff = async (io, socket, id) => {
    try {
        const staff = await Staff.findByPk(id);
        if (!staff) return socket.emit('error', 'Staff not found.');

        await staff.destroy();
        io.emit('staff-deleted', id);
    } catch (error) {
        console.error('Error deleting staff:', error);
        socket.emit('error', 'Failed to delete staff.');
    }
};

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

const updateWorkingHours = async (io, socket, data) => {
    try {
        const { day, startTime, endTime } = data;

        // Find working hours by day (assuming day is unique in DB)
        const workingHour = await WorkingHours.findOne({ where: { day } });

        if (!workingHour) {
            return socket.emit('error', `No working hours found for ${day}.`);
        }

        // Update fields
        workingHour.startTime = startTime;
        workingHour.endTime = endTime;
        await workingHour.save();

        // Emit updated info to all clients
        io.emit('working-hours-updated', workingHour);
    } catch (error) {
        console.error('Error updating working hours:', error);
        socket.emit('error', 'Failed to update working hours.');
    }
};


const getAllAppointments = async (io, socket) => {
    try {
        const appointments = await Appointment.findAll({
            include: [
                { model: User, attributes: ['name', 'email'] },
                { model: Staff, attributes: ['staffname'] },
                { model: Service, as: 'service', attributes: ['id', 'name'] }
            ]
        });
        socket.emit('appointments-data', appointments);
    } catch (error) {
        console.error('Error fetching appointments:', error);
        socket.emit('error', 'Failed to fetch appointments.');
    }
}

const getAppointmentById = async(io, socket, id) => {
    try {
        const appointment = await Appointment.findByPk(id, {
            include: [
                { model: User, attributes: ['name', 'email'] },
                { model: Staff, attributes: ['staffname'] },
                { model: Service, as: 'service', attributes: ['name'] }
            ]
        });

        if (!appointment) {
            socket.emit('error', 'Appointment not found.');
            return;
        }

        if (appointment.status === 'completed') {
            return socket.emit('edit-not-allowed', 'This appointment is already completed and cannot be edited.');
          }

        socket.emit('appointment-data', appointment);
    } catch (error) {
        console.error('Error fetching appointment:', error);
        socket.emit('error', 'Failed to fetch appointment.');
    }
};

const getStaffById = async (io, socket, data) => {
    try {
        const { serviceId, appointmentId } = data; // Include appointmentId
        //console.log("Fetching staff for serviceId:", serviceId, "appointmentId:", appointmentId);

        // Validate service existence
        const service = await Service.findByPk(serviceId);
        if (!service) {
            return socket.emit('error', 'Service not found');
        }

        // Find all staff members related to the service
        const staffList = await Staff.findAll({
            where: { specializationId: serviceId },
            include: [
                {
                    model: Service,
                    as: 'specialization',
                    attributes: ['id', 'name']
                }
            ]
        });

        //console.log("staffList", staffList);

        // Emit list of staff along with appointmentId
        socket.emit('staff-list-id', { staffList, appointmentId });

    } catch (err) {
        console.error('Error fetching staff:', err);
        socket.emit('error', 'Could not fetch staff');
    }
};




const updateAppointment = async(io, socket, data) => {
    try {
        // Step 1: Update DB
        const { appointmentId, staffId } = data;
        console.log("Appointment ID:", appointmentId);
        const appointment = await Appointment.findByPk(appointmentId, {
              include: [
                { model: User, attributes: ['name', 'email'] },
                { model: Staff, attributes: ['staffname'] },
                { model: Service, as: 'service', attributes: ['name'] }
              ]
        });
  
        if (!appointment) {
          return socket.emit('error', 'Appointment not found');
        }

        if(appointment.status === 'completed') {
            return socket.emit('error', 'Appointment completed not able to update the staff');
        }
  
        // Update staff assignment
        appointment.assignedStaffId = staffId;
        await appointment.save();

        const staff = await Staff.findByPk(staffId);

        const timeFormatted = convertTo12HourFormat(appointment.time);
  
        await sendEmail({
              to: appointment.user.email,
              subject: 'Appointment Updated',
              html: `
                <h2>Hello ${appointment.user.name},</h2>
                <h1>Appointment Updated.</h1>
                <h3>Details:</h3>
                <ul>
                    <li><strong>Service:</strong> ${appointment.service.name}</li>
                    <li><strong>Date:</strong> ${appointment.date}</li>
                    <li><strong>Time:</strong> ${timeFormatted}</li>
                    <li><strong>Staff:</strong> ${staff.staffname}</li>
                </ul>
                <p>Thank you!</p>
              `
            });
  
        // Step 3: Emit confirmation to the requester
        socket.emit('appointment-updated-success', appointment);
  
        // Step 4: Broadcast to others (admin/customer side updates)
        socket.broadcast.emit('appointment-updated', appointment);
    } catch (err) {
        console.error("Error updating appointment:", err);
        socket.emit('error', 'Error updating appointment');
    }
};

const getAllReviewsForAdmin = async (io, socket) => {
  try {
    const reviews = await Review.findAll({
      include: [
        {
          model: Appointment,
          include: [
            { model: Service, as: 'service' },
            { model: Staff},
            { model: User, as: 'user' }
          ]
        },
        { model: Service, as: 'service' },
        { model: Staff},
        { model: User, as: 'user' }
      ],
      order: [['createdAt', 'DESC']]
    });

    const formatted = reviews.map(r => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      staffResponse: r.Response,
      adminResponse: r.Response,
      service: r.service || r.Appointment?.service,
      Staff: r.Staff || r.Appointment?.Staff,
      user: r.user || r.Appointment?.user
    }));

    socket.emit('all-reviews', {
      reviews: formatted,
      total: formatted.length,
      page: 1,
      totalPages: 1 // pagination handled client-side
    });

  } catch (err) {
    console.error("Error fetching admin reviews:", err);
    socket.emit('error', 'Failed to fetch reviews');
  }
};

const respondToReviewByAdmin = async (io, socket, data) => {
    try {
      const { reviewId, adminResponse } = data;
      console.log("ReviewId", reviewId, adminResponse);
  
      const review = await Review.findByPk(reviewId);
      if (!review) {
        return socket.emit('error', 'Review not found.');
      }
  
      // Allow admin to respond only if staff hasn't responded yet
      if (review.Response) {
        return socket.emit('error', 'Staff already responded. Admin response not allowed.');
      }
  
      review.Response = adminResponse;
      await review.save();
  
      // Notify admin's own UI
      socket.emit('review-response-saved-by-admin', review);
  
      // Optionally, notify staff or customer if needed
      // io.to(`staff_${review.staffId}`).emit('admin-review-response', review);
  
    } catch (error) {
      console.error("Error in respond-review-by-admin:", error);
      socket.emit('error', 'Failed to respond to review');
    }
  };
  





module.exports = {
    addService,
    getAllServices,
    updateService,
    addStaff,
    getAllStaff,
    editStaff,
    deleteStaff,
    addWorkingHours,
    getWorkingHours,
    updateWorkingHours,
    getAllAppointments,
    getAppointmentById,
    getStaffById,
    updateAppointment,
    getAllReviewsForAdmin,
    respondToReviewByAdmin
    
};