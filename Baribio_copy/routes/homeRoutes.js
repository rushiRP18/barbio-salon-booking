const express = require("express");
const router = express.Router();
const homeController = require("../controllers/homeController");

//root
router.get("/", homeController.renderHome);

module.exports = router;
