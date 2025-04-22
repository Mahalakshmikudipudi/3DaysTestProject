const cron = require('node-cron');
const { Op } = require('sequelize');
const Appointment = require('../models/bookingAppointment');
const User = require('../models/user');
const Staff = require('../models/staffMember');
const Service = require('../models/services');
const sendEmail = require('../service/sendEmail'); // Assuming you have a service to send emails

const updateAppointmentStatus = cron.schedule('* * * * *', async () => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"

  try {
    //  Mark appointments as completed
    const pastAppointments = await Appointment.findAll({
      where: {
        status: 'confirmed',
        [Op.or]: [
          {
            date: { [Op.lt]: today }
          },
          {
            date: today,
            time: { [Op.lte]: currentTime }
          }
        ]
      },
      include: [User, Staff, { model: Service, as: 'service' }]
    });

    console.log('Found past appointments:', pastAppointments.length);


    for (const appt of pastAppointments) {
      const [hours, minutes] = appt.time.split(':').map(Number);
      const appointmentStart = new Date(`${appt.date}T${appt.time}:00`);

      const durationMinutes = appt.service?.duration || 30; // fallback to 30 min if not set
      const appointmentEnd = new Date(appointmentStart.getTime() + durationMinutes * 60000);
      
      // ✅ Only mark completed and send email once
      if (now > appointmentEnd) {
        appt.status = 'completed';
        await appt.save();

        await sendEmail({
          to: appt.user.email,
          subject: 'How was your appointment?',
          html: `
            <p>Hi ${appt.user.name},</p>
            <p>Your appointment for <strong>${appt.service.name}</strong> is now completed.</p>
            <p>Please leave your feedback for ${appt.Staff.staffname} in your account</p>
          `
        });

        console.log(`Marked appointment ${appt.id} as completed and sent email.`);
      }
    }
  } catch (error) {
    console.error("Cron Error:", error.message);
  }
});

module.exports = updateAppointmentStatus;
