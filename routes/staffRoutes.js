const express = require('express');

const staffController = require('../controllers/staff');

const authenticatemiddleware = require('../middleware/auth');

const router = express.Router();

router.post('/logout', authenticatemiddleware.authenticate, staffController.logoutStaff);

router.post('/staff-login', staffController.staffLogin);

router.get('/get-slots', authenticatemiddleware.authenticate, staffController.getAllSlots);

router.post('/save-slots', authenticatemiddleware.authenticate, staffController.saveSelectedSlots);

router.get('/get-reviews/:id', authenticatemiddleware.authenticate, staffController.getReviews);

router.post('/respond-to-review', authenticatemiddleware.authenticate, staffController.respondToReviewByStaff);

router.get('/appointments', authenticatemiddleware.authenticate, staffController.getAppointments);

router.put('/availability/:appointmentId', authenticatemiddleware.authenticate, staffController.updateAvailability);

module.exports = router;