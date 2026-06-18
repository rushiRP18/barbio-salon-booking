const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const passport = require("passport");

//signup
router.get("/signup", authController.renderSignup);
router.post("/signup", authController.handleSignup);

//login
router.get("/login", authController.renderLogin);
router.post("/login",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true
  })
  , authController.postLoginRedirect);

//logout
router.get("/logout", authController.handleLogout);

module.exports = router;
