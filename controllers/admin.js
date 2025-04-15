const Service = require('../models/services');
const User = require('../models/user');
const Staff = require('../models/staffMember');
const Appointment = require('../models/bookingAppointment');
const WorkingHours = require('../models/workingHours'); // Assuming you have a model for working hours
const bcrypt = require("bcrypt");
const sendEmail = require('../service/sendEmail'); // Assuming you have a function to send emails

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
        const { staffname, staffemail, staffphone, staffpassword, specializationId } = data;
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
            userId
        });


        // Emit the newly created staff member to all clients
        io.emit('staff-added', newStaff);
    } catch (error) {
        console.error('Error adding staff:', error);
        socket.emit('error', 'Failed to add staff.');
    }
}

const getAllStaff = async (io, socket) => {
    try {
        const staffMembers = await Staff.findAll({
            include: [{ model: Service, as: 'specialization', attributes: ['name'] }] // Assuming you have a relation set up
        });
        socket.emit('staff-list', staffMembers);
    } catch (error) {
        console.error('Error fetching staff:', error);
        socket.emit('error', 'Failed to fetch staff.');
    }
}

const editStaff = async (io, socket, updatedData) => {
    try {
        const { id, staffname, staffemail, staffphone, specializationId } = updatedData;

        const staff = await Staff.findByPk(id);
        if (!staff) return socket.emit('error', 'Staff not found.');

        await staff.update({ staffname, staffemail, staffphone, specializationId });

        // Fetch with specialization name for frontend
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

const getAllAppointments = async (io, socket) => {
    try {
        const appointments = await Appointment.findAll({
            include: [
                { model: User, attributes: ['name', 'email'] },
                { model: Staff, attributes: ['staffname'] },
                { model: Service, as: 'service', attributes: ['name'] }
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

const getStaffById = async(io, socket, data) => {
    try {
        const { serviceId } = data;
        //console.log("Service ID:", serviceId);
        const service = await Service.findByPk(serviceId);
        if (!service) return socket.emit('error', 'Invalid service');

        //console.log("Service:", service);
    
        const specializationId = service.id;
    
        const staffList = await Staff.findAll({
          where: { specializationId }
        });
    
        socket.emit('staff-list-id', staffList);
      } catch (err) {
        console.error('Error fetching staff:', err);
        socket.emit('error', 'Could not fetch staff');
      }
}

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
  
        // Update staff assignment
        appointment.assignedStaffId = staffId;
        await appointment.save();

        const staff = await Staff.findByPk(staffId);

  
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
                    <li><strong>Time:</strong> ${appointment.time}</li>
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
}




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
    getAllAppointments,
    getAppointmentById,
    getStaffById,
    updateAppointment
    
};