// This file is responsible for sending emails using nodemailer.
// It uses environment variables for sensitive information like email and password.
require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    }
});

const sendEmail = async ({ to, subject, html }) => {
    await transporter.sendMail({
        from: `"Salon Appointment" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html
    });
};

module.exports = sendEmail;
