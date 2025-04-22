const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const User = require('../models/user'); // Assuming you have a User model


const WorkingHours = sequelize.define('WorkingHours', {
    day: Sequelize.STRING, // e.g., 'Monday'
    startTime: Sequelize.STRING, // e.g., '09:00'
    endTime: Sequelize.STRING,   // e.g., '18:00'
});

module.exports = WorkingHours;