const Sequelize = require('sequelize');
const sequelize = require('../util/database');
const Service = require('./services');

const StaffSlots = sequelize.define('StaffSlots', {
    id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
    date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
    },
    startTime: {
        type: Sequelize.TIME,
        allowNull: false,
    },
    endTime: {
        type: Sequelize.TIME,
        allowNull: false,
    },
    status: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
});
    

module.exports = StaffSlots;