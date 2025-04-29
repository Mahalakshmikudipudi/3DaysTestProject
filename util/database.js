const Sequelize = require('sequelize')


const sequelize = new Sequelize('test-project-salon', 'root', 'Kiyansh@020508' ,{
    dialect: 'mysql',
    host: 'localhost'
})

module.exports = sequelize;