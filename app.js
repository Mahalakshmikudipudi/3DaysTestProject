const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const sequelize = require('./util/database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

app.use(cors());
app.use(express.json());

const User = require('./models/user');
const Service = require('./models/services');
const Staff = require('./models/staffMember');
const Appointment = require('./models/bookingAppointment');
const WorkingHours = require('./models/workingHours');

const { signup } = require("./controllers/user");
const { login } = require("./controllers/user");
const { addService, getAllServices, updateService,
   addStaff, getAllStaff, editStaff, deleteStaff } = require("./controllers/admin");
const { addWorkingHours, getWorkingHours, getAvailableSlots, bookAppointment,
    getAppointments, rescheduleAppointment, cancelAppointment, paymentOrder,
    checkPaymentStatus} = require("./controllers/customers");

// In Staff.js
Staff.belongsTo(Service, {
  foreignKey: 'specializationId',
  as: 'specialization'
});

// In Service.js
Service.hasMany(Staff, {
  foreignKey: 'specializationId',
  as: 'specialization'
});

// // Service belongs to User
// Service.belongsTo(User, { foreignKey: 'userId' });
// User.hasMany(Service, { foreignKey: 'userId' });

// Staff is created by User (if needed)
Staff.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Staff, { foreignKey: 'userId' });

// Appointment belongs to a User (who booked the appointment)
Appointment.belongsTo(User, {
  foreignKey: 'userId'
});

// Appointment belongs to a Service (what service is booked)
Appointment.belongsTo(Service, {
  foreignKey: 'serviceId',
  as: 'service'
});

// Appointment optionally belongs to a Staff (assigned by admin)
Appointment.belongsTo(Staff, {
  foreignKey: 'assignedStaffId'
});

User.hasMany(Appointment, {
  foreignKey: 'userId'
});

Service.hasMany(Appointment);
Appointment.belongsTo(Service);





// Sync database and start the server
sequelize.sync()
  .then(() => {
    server.listen(3000, () => { // Use `server.listen` instead of `app.listen`
      console.log(`Server running on localhost 3000`);
    });
  })
  .catch(err => {
    console.log(err);
  });


io.on("connection", (socket) => {
  console.log(" User connected:", socket.id);

  //  Signup & Login do NOT require authentication
  socket.on("signup", async (data) => {
    await signup(io, socket, data);
  });

  socket.on("login", async (data) => {
    await login(io, socket, data);
  });

  // Apply authentication ONLY for protected routes
  socket.use(async ([event, ...args], next) => {
    if (event === "signup" || event === "login") {
      return next(); // Skip authentication for signup & login
    }

    require("./middleware/auth").authenticateSocket(socket, async (err) => {
      if (err) {
        console.log("Authentication failed:", err.message);
        socket.emit("auth-error", { message: "Authentication required" });
        return next(new Error("Authentication failed"));
      }

      if (!socket.user) {
        console.log(" Authentication failed: No user attached to socket");
        return next(new Error("No user attached to socket"));
      }

      console.log(" Authentication successful:", socket.user.name);
      next(); // Proceed with the request
    });
  });

  socket.on('add-service', (data) => addService(io, socket, data));
  socket.on('get-services', () => getAllServices(io, socket));
  socket.on('update-service', (data) => updateService(io, socket, data));
  socket.on('add-staff', (data) => addStaff(io, socket, data));
  socket.on('get-staff', () => getAllStaff(io, socket));
  socket.on('edit-staff', (data) => editStaff(io, socket, data));
  socket.on('delete-staff', (id) => deleteStaff(io, socket, id));
  socket.on('set-working-hours', (data) => addWorkingHours(io, socket, data));
  socket.on('get-working-hours', () => getWorkingHours(io, socket));
  socket.on('get-available-slots', (data) => getAvailableSlots(io, socket, data));
  socket.on('book-appointment', (data) => bookAppointment(io, socket, data));
  socket.on('get-user-appointments', () => getAppointments(io, socket));
  socket.on('reschedule-appointment', (data) => rescheduleAppointment(io, socket, data));
  socket.on('cancel-appointment', (data) => cancelAppointment(io, socket, data));
  socket.on('verify-payment', (data) => paymentOrder(io, socket, data));
  socket.on('payment-checked', (data) => checkPaymentStatus(io, socket, data));

  


  socket.on("disconnect", () => {
    console.log(" User disconnected:", socket.id);
  });
});
