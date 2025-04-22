const Sequelize = require('sequelize');
const sequelize = require('../config/database');

// id, name, password, phone number, role

const User = sequelize.define('user', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    name: Sequelize.STRING,
    email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
    },
    phonenumber: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
    },
    password: Sequelize.STRING,
    role: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'Customer' // Default role can be 'user'
    }
});

module.exports = User;