const Sequelize = require('sequelize');
const sequelize = require('../util/database');
const Service = require('../models/services');

const Staff = sequelize.define('Staff', {
    id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            allowNull: false,
            primaryKey: true
        },
    staffname: {
      type: Sequelize.STRING,
      allowNull: false
    },
    staffemail: {
      type: Sequelize.STRING,
      allowNull: false,
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
    },
    specializationId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: Service, // Refers to table name
        key: 'id'
      }
    },
    isAvailable: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: true,
    },
  });

  module.exports = Staff;