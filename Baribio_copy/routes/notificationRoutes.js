const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const { isLoggedIn } = require("../middleware.js");

// Route to serve VAPID public key
router.get("/vapidPublicKey", notificationController.getVapidPublicKey);

// Route to save push subscription
router.post("/subscribe", isLoggedIn, notificationController.postSubscribe);

module.exports = router;
