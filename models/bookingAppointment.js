const Sequelize = require('sequelize');
const sequelize = require('../util/database');
const User = require('../models/user');
const Staff = require('../models/staffMember');

const Appointment = sequelize.define('Appointment', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    date: {
      type: Sequelize.DATEONLY,
      allowNull: false
    },
    time: {
      type: Sequelize.STRING,
      allowNull: false // Store as 'HH:MM'
    },
    status: {
      type: Sequelize.ENUM('pending', 'confirmed', 'completed', 'cancelled'),
      defaultValue: 'pending'
    },
    isPaid: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    isStaffAvailable: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
    }
    
});

module.exports = Appointment;