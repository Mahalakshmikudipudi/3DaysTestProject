
const appointmentReminderJob = require('./cron/appointmentRemainder');
appointmentReminderJob.start(); // Start the cron

const updateAppointmentStatus = require('./cron/updateAppointmentStatus');
updateAppointmentStatus.start(); //  Start the cron


const dotenv = require('dotenv');
dotenv.config();
const path = require('path');

const express = require('express');
var cors = require('cors')
//const Cashfree = require('cashfree-pg');
const sequelize = require('./util/database');
const User = require('./models/user');
const Service = require('./models/services');
const Staff = require('./models/staffMember');
const WorkingHours = require('./models/workingHours');
const StaffSlots = require('./models/staffSlots');
const Appointment = require('./models/bookingAppointment');
const Order = require('./models/paymentOrder');
const Review = require('./models/review');

const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/adminRoutes');
const customerRoutes = require('./routes/customerRoutes');
const staffRoutes = require('./routes/staffRoutes');

//const { AWS } = require('aws-sdk');

const app = express();

app.get('/customers/:page', (req, res, next) => {
    const filePath = path.join(__dirname, 'views', 'html', 'customers', `${req.params.page}.html`);
    res.sendFile(filePath, err => {
        if (err) {
            console.error('Customer page not found:', filePath);
            next(); // forward to error handler
        }
    });
});

//  Clean URLs like /customers/updateProfile → public/html/customers/updateProfile.html
app.get('/customers/:page', (req, res, next) => {
    const filePath = path.join(__dirname, 'views', 'html', 'customers', `${req.params.page}.html`);
    res.sendFile(filePath, err => {
        if (err) {
            console.error('Customer page not found:', filePath);
            next(); // forward to error handler
        }
    });
});

app.get('/admin/:page', (req, res, next) => {
    const filePath = path.join(__dirname, 'views', 'html', 'admin', `${req.params.page}.html`);
    res.sendFile(filePath, err => {
        if (err) {
            console.error('Customer page not found:', filePath);
            next(); // forward to error handler
        }
    });
});

app.get('/staff/:page', (req, res, next) => {
    const filePath = path.join(__dirname, 'views', 'html', 'staff', `${req.params.page}.html`);
    res.sendFile(filePath, err => {
        if (err) {
            console.error('Customer page not found:', filePath);
            next(); // forward to error handler
        }
    });
});

// Optional: root-level clean URLs like /select → public/html/select.html
app.get('/:page', (req, res, next) => {
    const filePath = path.join(__dirname, 'views', 'html', `${req.params.page}.html`);
    res.sendFile(filePath, err => {
        if (err) {
            next();
        }
    });
});


app.use(express.static(path.join(__dirname, "views", 'html')));

// get config vars

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "views/html/home.html"));
});


app.use(cors());

// app.use(bodyParser.urlencoded());  ////this is for handling forms
app.use(express.json());  //this is for handling jsons


app.use('/user', userRoutes);
app.use('/admin', adminRoutes);
app.use('/customer', customerRoutes);
app.use('/staff', staffRoutes);

User.hasMany(Service);
Service.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(WorkingHours, { foreignKey: 'userId' });

WorkingHours.belongsTo(User, { foreignKey: 'userId' });

Staff.belongsTo(User, { foreignKey: 'userId' });

// Many staff can belong to one service (specialization)
Staff.belongsTo(Service, { as: 'specialization', foreignKey: 'specializationId' });

// One service can be the specialization for many staff
Service.hasMany(Staff, { foreignKey: 'specializationId' });

Staff.hasMany(StaffSlots, { foreignKey: 'staffId' });

StaffSlots.belongsTo(Staff, { foreignKey: 'staffId' });

Appointment.belongsTo(Service, { foreignKey: 'serviceId' });

Appointment.belongsTo(Staff, { foreignKey: 'staffId' });

User.hasMany(Appointment, { foreignKey: 'userId' });

Appointment.belongsTo(User, { foreignKey: 'userId' });

StaffSlots.belongsTo(Service, { foreignKey: 'serviceId' });

StaffSlots.belongsTo(Appointment, { foreignKey: 'appointmentId' });

Appointment.belongsTo(StaffSlots, { foreignKey: 'slotId' });

Service.hasMany(StaffSlots, { foreignKey: 'serviceId' });

User.hasMany(Order, { foreignKey: 'userId' });

Order.belongsTo(Appointment, { foreignKey: 'appointmentId' });

Review.belongsTo(Appointment, { foreignKey: 'appointmentId' });

Review.belongsTo(Staff, { foreignKey: 'staffId' });

Review.belongsTo(Service, { foreignKey: 'serviceId' });

Review.belongsTo(User, { foreignKey: 'userId' });

Appointment.hasOne(Review, { foreignKey: 'appointmentId' });






sequelize.sync()
    .then(() => {
        app.listen(process.env.PORT, () => {
            console.log(`Server running on localhost ${process.env.PORT}`)
        });
    })
    .catch(err => {
        console.log(err);
    })