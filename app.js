
const appointmentReminderJob = require('./cron/appointmentRemainder');
appointmentReminderJob.start(); // Start the cron

const updateAppointmentStatus = require('./cron/updateAppointmentStatus');
updateAppointmentStatus.start(); //  Start the cron


const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const sequelize = require('./config/database');


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

const registerRoutes = require('./routes/socketRoutes');

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
    server.listen(process.env.PORT, () => { // Use `server.listen` instead of `app.listen`
      console.log(`Server running on localhost 3000`);
    });
  })
  .catch(err => {
    console.log(err);
  });


io.on("connection", (socket) => {
  console.log(" User connected:", socket.id);
  registerRoutes(io, socket);
  
  socket.on("disconnect", () => {
    console.log(" User disconnected:", socket.id);
  });
});
