const express = require("express");
const router = express.Router();
const appointmentController = require("../controllers/appointmentController");
const { isLoggedIn, isUser } = require("../middleware.js");
const wrapAsync = require("../utils/wrapAsync.js");

//serve the form to book the appointment
router.get("/shops/:id/book", isLoggedIn, appointmentController.renderBookForm);

// GET: Show service selection
router.get("/shops/:id/book/services", isLoggedIn, wrapAsync(appointmentController.renderServiceSelection));

router.get("/shops/:id/book/availability", isLoggedIn, wrapAsync(appointmentController.renderAvailability));

router.post("/shops/:id/book/services", isLoggedIn, wrapAsync(appointmentController.postServiceSelection));

router.post("/shops/:id/book/availability", isLoggedIn, wrapAsync(appointmentController.postAvailability));

router.get("/shops/:id/book/confirm", isLoggedIn, wrapAsync(appointmentController.renderConfirm));

// POST: Confirm and save booking
router.post("/shops/:id/book/confirm", isLoggedIn, wrapAsync(appointmentController.postConfirm));

router.get("/user/appointments", isLoggedIn, isUser, appointmentController.userAppointments);

//dashboard shopkeeper
router.get("/admin/orders", isLoggedIn, appointmentController.adminOrders);

// Update appointment status
router.post("/admin/orders/:id/status", isLoggedIn, wrapAsync(appointmentController.updateOrderStatus));

module.exports = router;
