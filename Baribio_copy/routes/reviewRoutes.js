const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/reviewController");
const { isLoggedIn, isReviewAuthor } = require("../middleware.js");

//review system 
router.post("/shops/:id/reviews", isLoggedIn, reviewController.create);


router.delete("/shops/:id/reviews/:reviewId", isLoggedIn, isReviewAuthor, reviewController.destroy);

module.exports = router;
