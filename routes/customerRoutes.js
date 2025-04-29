const express = require('express');

const customerController = require('../controllers/customers');

const authenticatemiddleware = require('../middleware/auth');

const router = express.Router();


router.post('/logout', authenticatemiddleware.authenticate, customerController.logoutUser);

router.get('/get-profile', authenticatemiddleware.authenticate, customerController.getProfile);

router.put('/update-profile', authenticatemiddleware.authenticate, customerController.updateProfile);

router.get('/get-available-slots', authenticatemiddleware.authenticate, customerController.getAvailableSlots);

router.get('/search-slots', authenticatemiddleware.authenticate, customerController.searchSlots);

router.post('/book-and-pay', authenticatemiddleware.authenticate, customerController.bookAndPay);

router.post('/update-transaction', authenticatemiddleware.authenticate, customerController.updatePaymentStatus);

router.get('/get-appointment-by-id', authenticatemiddleware.authenticate, customerController.getAppointmentById);

router.put('/reschedule-appointment/:id', authenticatemiddleware.authenticate, customerController.rescheduleAppointment);

router.delete('/delete-appointment/:id', authenticatemiddleware.authenticate, customerController.deleteAppointment);

router.get('/get-eligible-appointments', authenticatemiddleware.authenticate, customerController.getEligibleAppointments);

router.post('/submit-review', authenticatemiddleware.authenticate, customerController.submitReview);

router.get('/get-my-reviews', authenticatemiddleware.authenticate, customerController.getMyReviews);

module.exports = router;