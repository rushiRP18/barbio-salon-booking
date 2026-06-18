const Shop = require("../models/shop");
const { initializeSlots } = require("../public/js/appointement.js");
const { summarizeReviews } = require("../utils/summary.js");

//add new shop
module.exports.renderNewForm = (req, res) => {
  res.render("shops/new.ejs")
}

//add the shop
module.exports.create = async (req, res) => {
  try {
    const newShop = new Shop(req.body.shop);
    newShop.owner = req.user._id;

    const today = new Date().toISOString().split("T")[0];
    const slotsToday = initializeSlots(newShop.timing.opensAt, newShop.timing.closesAt, newShop.chairs);
    newShop.dailySlots.push({ date: today, slots: slotsToday });
    await newShop.save();

    req.flash("success", "shop added succesfully")
    res.redirect("/shops")
  } catch (err) {
    console.error("Error saving shop:", err);
    req.flash("error", "Failed to add shop. Please try again.");
    res.redirect("/admin/shops")
  }
}



//show all shops
module.exports.index = async (req, res) => {
  const allShops = await Shop.find({})
  res.render("shops/index.ejs", { allShops })
}



//show all shops to the admin
module.exports.adminIndex = async (req, res) => {
  const allShops = await Shop.find({ owner: req.user._id });
  res.render("shops/index.ejs", { allShops })
}

//show particular shop
module.exports.show = async (req, res) => {
  let { id } = req.params;
  const shop = await Shop.findById(id).populate({
    path: "reviews",
    populate: { path: "author" },
  })
    .populate("owner");

  const reviewTexts = shop.reviews.map(r => r.comment);

  // Use existing avgRating
  const avgRating = shop.avgRating || "No rating yet";

  // Get summary from Gemini API
  const summary = await summarizeReviews(avgRating, reviewTexts);
  res.render("shops/show.ejs", { shop, summary });
}

//render edit form
module.exports.renderEditForm = async (req, res) => {
  let { id } = req.params;
  const shop = await Shop.findById(id);
  res.render("shops/edit.ejs", { shop });
}

//Update listing
module.exports.update = async (req, res) => {
  const { id } = req.params;
  let shop = await Shop.findByIdAndUpdate(id, { ...req.body.shop });
  await shop.save();
  req.flash("success", "shop Updated!!")
  res.redirect(`/shops/${id}`)
}

//delete route
module.exports.destroy = async (req, res) => {
  const { id } = req.params;
  await Shop.findByIdAndDelete(id);
  req.flash("error", "shop Deleted!!")
  res.redirect("/shops")
}
