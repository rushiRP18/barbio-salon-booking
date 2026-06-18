const Shop = require("../models/shop");
const Review = require("../models/review");
const { calAvg } = require("../public/js/rating.js");

//review system 
module.exports.create = async (req, res) => {
  let shop = await Shop.findById(req.params.id).populate("reviews");

  // Create new review object
  let newReview = new Review(req.body.review);
  newReview.author = req.user._id;

  // Save review first
  await newReview.save();

  // Push review to shop
  shop.reviews.push(newReview);

  // Now recalc average with the new review included
  shop.avgRating = calAvg(shop);

  await shop.save();

  req.flash("success", "New Review Created!!");
  res.redirect(`/shops/${shop._id}`);
}


module.exports.destroy = async (req, res) => {
  const { id, reviewId } = req.params;

  // Remove review reference from shop
  await Shop.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });

  // Delete the review itself
  await Review.findByIdAndDelete(reviewId);

  // Fetch updated shop with reviews populated
  let shop = await Shop.findById(id).populate("reviews");

  // Recalculate avg
  shop.avgRating = calAvg(shop);
  await shop.save();

  req.flash("success", "Review Deleted!!");
  res.redirect(`/shops/${id}`);
}
