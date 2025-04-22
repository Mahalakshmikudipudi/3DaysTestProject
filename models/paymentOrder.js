const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

//id, name , password, phone number, role

const Order = sequelize.define('order', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    orderId: {
        type: DataTypes.STRING,
        primaryKey: true
    },
    paymentSessionId : {
        type: DataTypes.STRING,
        
    },
    orderAmount: {
        type: DataTypes.FLOAT,
        
    },
    orderCurrency: {
        type: DataTypes.STRING,
        
    },
    paymentStatus: {
        type: DataTypes.STRING,
        
    }
})

module.exports = Order;