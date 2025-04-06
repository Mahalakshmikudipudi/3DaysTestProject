const Service = require('../models/services');
const User = require('../models/user');
const Staff = require('../models/staffMember');
const Appointment = require('../models/bookingAppointment');
const WorkingHours = require('../models/workingHours'); // Assuming you have a model for working hours
const { getWeekday } = require('../service/helper'); // Utility function to get the weekday from a date
const { generateSlots } = require('../service/slotGenerator'); // Function to generate time slots based on working hours and service duration

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
        const { staffname, staffemail, staffphone, specializationId } = data;

        // Create new staff member
        const newStaff = await Staff.create({
            staffname,
            staffemail,
            staffphone,
            specializationId
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

const rescheduleAppointment = async (io, socket, { appointmentId, newDate, newTime, newServiceId }) => {
    try {
        const updated = await Appointment.update(
            { date: newDate, time: newTime, serviceId: newServiceId },
            { where: { id: appointmentId } }
        );

        // const refreshed = await Appointment.findByPk(appointmentId, {
        //     include: [User, Service]
        // });

        socket.emit('appointment-rescheduled', updated);
    } catch (err) {
        console.error("Error rescheduling:", err);
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
    getAvailableSlots,
    bookAppointment,
    getAppointments,
    rescheduleAppointment
};