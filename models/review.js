// models/Review.js
const { DataTypes } = require('sequelize');
const sequelize = require('../util/database');
const User = require('../models/user');
const Staff = require('../models/staffMember');
const Appointment = require('../models/bookingAppointment');

const Review = sequelize.define('Review', {
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 5 }
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  staffResponse: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});


module.exports = Review;
