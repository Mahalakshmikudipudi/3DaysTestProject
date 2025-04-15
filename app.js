
// const appointmentReminderJob = require('./cron/appointmentRemainder');
// appointmentReminderJob.start(); // Start the cron

// const updateAppointmentStatus = require('./cron/updateAppointmentStatus');
// updateAppointmentStatus.start(); //  Start the cron


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
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

// get config vars

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public/html/home.html"));
});


const User = require('./models/user');
const Service = require('./models/services');
const Staff = require('./models/staffMember');
const Appointment = require('./models/bookingAppointment');
const WorkingHours = require('./models/workingHours');
const Order = require('./models/paymentOrder');
const Review = require('./models/review');


const { signup } = require("./controllers/user");
const { login } = require("./controllers/user");
const { staffLogin, getMyReviewsById, respondToReview } = require("./controllers/staff");
const { addService, getAllServices, updateService, addWorkingHours, getWorkingHours,
  addStaff, getAllStaff, editStaff, deleteStaff, getAllAppointments,
  getAppointmentById, updateAppointment, getStaffById } = require("./controllers/admin");
const { getAvailableSlots, bookAppointment,
  getAppointments, rescheduleAppointment, cancelAppointment, checkAppointmentStatus,
  getProfile, updateProfile, addReview, getMyReviews,
  getEligibleAppointments } = require("./controllers/customers");
const { madePayment, checkPaymentStatus } = require("./controllers/paymentForAppointment")



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

// Staff is created by User (if needed)
Staff.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Staff, { foreignKey: 'userId' });

// Appointment belongs to a User (who booked the appointment)
Appointment.belongsTo(User, {
  foreignKey: 'userId'
});
User.hasMany(Appointment, { foreignKey: 'userId' });
// Appointment belongs to a Service (what service is booked)
Appointment.belongsTo(Service, {
  foreignKey: 'serviceId',
  as: 'service'
});
Service.hasMany(Appointment, { foreignKey: 'serviceId' });

// Appointment optionally belongs to a Staff (assigned by admin)
Appointment.belongsTo(Staff, {
  foreignKey: 'assignedStaffId'
});
Staff.hasMany(Appointment, { foreignKey: 'assignedStaffId' });


Order.belongsTo(Service);
Service.hasMany(Order);

// Associations
Review.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Review, { foreignKey: 'userId' });

Review.belongsTo(Staff, { foreignKey: 'staffId' });
Staff.hasMany(Review, { foreignKey: 'staffId' });

Review.belongsTo(Appointment, { foreignKey: 'appointmentId' });
Appointment.hasOne(Review, { foreignKey: 'appointmentId' });

Review.belongsTo(Service, { foreignKey: 'serviceId', as: 'service' });

Order.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Order, { foreignKey: 'userId' });

Order.belongsTo(Appointment, { foreignKey: 'appointmentId' });
Appointment.hasMany(Order, { foreignKey: 'appointmentId' });


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

  socket.on("staff-login", async (data) => {
    await staffLogin(io, socket, data);
  });

  socket.on("logout", async (data) => {
    const { token } = data;
    if (token) {
      socket.user = null; // Clear user data from socket
      socket.staff = null; // Clear staff data from socket
      socket.emit("logoutSuccess", "Logged out successfully via socket!");
    } else {
      socket.emit("logoutError", "Logout failed: No token provided");
    }
  }
  );

  // Apply authentication ONLY for protected routes
  socket.use(async ([event, ...args], next) => {
    if (event === "signup" || event === "login" || event === "staff-login") {
      return next(); // Skip authentication for signup & login
    }

    require("./middleware/auth").authenticateSocket(socket, async (err) => {
      if (err) {
        console.log("Authentication failed:", err.message);
        socket.emit("auth-error", { message: "Authentication required" });
        return next(new Error("Authentication failed"));
      }

      if (!socket.user && !socket.staff) {
        console.log(" Authentication failed: No user or staff attached to socket");
        return next(new Error("No user or staff attached to socket"));
      }

      const identity = socket.user?.name || socket.staff?.staffname || "Unknown";
      console.log("Authentication successful:", identity);
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
  socket.on('check-appointment-payment', (data) => checkAppointmentStatus(io, socket, data));
  socket.on('initiate-payment', (data) => madePayment(io, socket, data));
  socket.on('update-transaction', (data) => checkPaymentStatus(io, socket, data));
  socket.on('getProfile', (data) => getProfile(io, socket, data));
  socket.on('updateProfile', (data) => updateProfile(io, socket, data));
  socket.on('get-eligible-appointments', () => getEligibleAppointments(io, socket));
  socket.on('submit-review', (data) => addReview(io, socket, data));
  socket.on('get-my-reviews', () => {
    getMyReviews(io, socket);
  });
  socket.on('respond-review', (data) => {
    respondToReview(io, socket, data);
  });
  socket.on('get-appointments', () => {
    getAllAppointments(io, socket);
  });
  socket.on('get-appointment-by-id', (id) => {
    getAppointmentById(io, socket, id);
  });
  socket.on('update-appointment', (data) => {
    updateAppointment(io, socket, data);
  });
  socket.on('get-staff-by-id', (id) => {
    getStaffById(io, socket, id);
  });
  socket.on('get-my-reviews-by-id', (data) => {
    getMyReviewsById(io, socket, data);
  });



  socket.on("disconnect", () => {
    console.log(" User disconnected:", socket.id);
  });
});
