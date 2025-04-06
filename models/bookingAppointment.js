const Sequelize = require('sequelize');
const sequelize = require('../util/database');
const User = require('../models/user');
const Service = require('../models/services');
const Staff = require('../models/staffMember');

const Appointment = sequelize.define('Appointment', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id'
      }
    },
    serviceId: {
      type: Sequelize.INTEGER,
      allowNull: false,
        references: {
            model: Service,
            key: 'id'
        }
    },
    assignedStaffId: {
      type: Sequelize.INTEGER,
      allowNull: true, // Initially null; admin assigns later
        references: {
            model: Staff,
            key: 'id'
        }
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
    }
});

module.exports = Appointment;