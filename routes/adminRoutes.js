const express = require('express');

const adminController = require('../controllers/admin');

const authenticatemiddleware = require('../middleware/auth');

const router = express.Router();


router.post('/logout', authenticatemiddleware.authenticate, adminController.logoutUser);

router.post('/add-service', authenticatemiddleware.authenticate, adminController.addService);

router.get('/get-all-services', authenticatemiddleware.authenticate, adminController.getAllServices);

router.put('/edit-service/:id', authenticatemiddleware.authenticate, adminController.editService);

router.delete('/delete-service/:id', authenticatemiddleware.authenticate, adminController.deleteService);

router.post('/add-working-hours', authenticatemiddleware.authenticate, adminController.addWorkingHours);

router.get('/get-working-hours', authenticatemiddleware.authenticate, adminController.getWorkingHours);

router.put('/update-working-hours/:id', authenticatemiddleware.authenticate, adminController.updateWorkingHours);

router.post('/add-staff', authenticatemiddleware.authenticate, adminController.addStaff);

router.get('/get-all-staff', authenticatemiddleware.authenticate, adminController.getAllStaff);

router.put('/edit-staff/:id', authenticatemiddleware.authenticate, adminController.editStaff);

router.delete('/delete-staff/:id', authenticatemiddleware.authenticate, adminController.deleteStaff);

router.get('/get-all-reviews', authenticatemiddleware.authenticate, adminController.getAllReviews);

router.post('/respond-to-review', authenticatemiddleware.authenticate, adminController.respondToReviewByAdmin);

router.get('/get-appointments', authenticatemiddleware.authenticate, adminController.getAllAppointments);

router.delete('/delete-appointment/:appointmentId', authenticatemiddleware.authenticate, adminController.deleteAppointment);

module.exports = router;