const express = require("express");
const router = express.Router();
const shopController = require("../controllers/shopController");
const { isLoggedIn, isOwner, isShopkeeper } = require("../middleware.js");
const wrapAsync = require("../utils/wrapAsync.js");

//add new shop
router.get("/admin/new", isLoggedIn, shopController.renderNewForm);

//add the shop
router.post("/admin/shops", isLoggedIn, wrapAsync(shopController.create));

//show all shops
router.get("/shops", wrapAsync(shopController.index));

//show all shops to the admin
router.get("/admin/shops", isShopkeeper, wrapAsync(shopController.adminIndex));

//show particular shop
router.get("/shops/:id", wrapAsync(shopController.show));

//render edit form
router.get("/admin/:id/edit", isLoggedIn, isOwner, wrapAsync(shopController.renderEditForm));

//Update listing
router.put("/admin/shops/:id", isLoggedIn, isOwner, wrapAsync(shopController.update));

//delete route
router.delete("/admin/shops/:id", isLoggedIn, isOwner, wrapAsync(shopController.destroy));

module.exports = router;
