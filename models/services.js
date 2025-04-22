const Sequelize = require('sequelize');
const sequelize = require('../config/database');

// Define Service Model
const Service = sequelize.define("Service", {
    name: { type: Sequelize.STRING, allowNull: false, unique: true },
    description: { type: Sequelize.TEXT, allowNull: false },
    duration: { type: Sequelize.INTEGER, allowNull: false }, // in minutes
    price: { type: Sequelize.FLOAT, allowNull: false },
    availability: { type: Sequelize.BOOLEAN, defaultValue: true }, // true = available
});

module.exports = Service;
