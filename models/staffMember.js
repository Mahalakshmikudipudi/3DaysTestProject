const Sequelize = require('sequelize');
const sequelize = require('../util/database');
const Service = require('../models/services');

const Staff = sequelize.define('Staff', {
    staffname: {
      type: Sequelize.STRING,
      allowNull: false
    },
    staffemail: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    staffpassword: {
      type: Sequelize.STRING,
      allowNull: false
    },
    staffphone: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    },
    specializationId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: Service, // Refers to table name
        key: 'id'
      }
    }
  });

  module.exports = Staff;