const cron = require('node-cron');
const { Op } = require('sequelize');
const Appointment = require('../models/bookingAppointment');
const User = require('../models/user'); 
const Staff = require('../models/staffMember');
const Service = require('../models/services');
const sendEmail = require('../service/sendEmail'); // Assuming you have a service to send emails

const appointmentReminderJob = cron.schedule('*/1 * * * *', async () => {
    try {
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  
      const reminderDate = oneHourLater.toISOString().split('T')[0];
      const reminderTime = oneHourLater.toTimeString().slice(0, 5); // "HH:MM"
  
      const upcomingAppointments = await Appointment.findAll({
        where: {
          status: 'pending',
          date: reminderDate,
          time: reminderTime,
        },
        include: [
          { model: User },
          { model: Staff },
          { model: Service, as: 'service' },
        ],
      });
  
      for (const appt of upcomingAppointments) {
        await sendEmail({
          to: appt.user.email,
          subject: `Reminder: Your ${appt.service.name} appointment is in 1 hour`,
          html: `
            <p>Hi ${appt.user.name},</p>
            <p>This is a reminder for your appointment:</p>
            <ul>
              <li>Service: ${appt.service.name}</li>
              <li>Date: ${appt.date}</li>
              <li>Time: ${appt.time}</li>
              <li>Staff: ${appt.Staff.staffname}</li>
            </ul>
            <p>See you soon!</p>
          `
        });
      }
  
      if (upcomingAppointments.length) {
        console.log(` Sent ${upcomingAppointments.length} reminder emails.`);
      }
  
    } catch (err) {
      console.error(' Error sending appointment reminders:', err);
    }
  });
  
  module.exports = appointmentReminderJob;
  