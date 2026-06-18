const Shop = require("./models/shop");
const Review = require("./models/review")
module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.flash("error", "You must be logged in!");
        return res.redirect("/login");
    }
    next();
};

module.exports.isShopkeeper = (req, res, next) => {
    if (!req.isAuthenticated() || req.user.role !== "shopkeeper") {
        req.flash("error", "You are not authorized to access this page!");
        return res.redirect("/shops");
    }
    next();
};

module.exports.isOwner = async(req,res,next)=>{
    let {id} = req.params;
    let shop = await Shop.findById(id);
    if(!shop.owner.equals(res.locals.currUser._id)){
        req.flash("error","Oops!You are not the owner of this listing")
        return res.redirect(`/shops/${id}`)
    }
    next();
}

module.exports.isUser = (req, res, next) => {
    if (!req.isAuthenticated() || req.user.role !== "user") {
        req.flash("error", "You are not authorized to access this page!");
        return res.redirect("/shops");
    }
    next();
};

module.exports.isReviewAuthor = async(req,res,next)=>{
    let {id,reviewId} = req.params;
    let review = await Review.findById(reviewId);
    if(!review.author.equals(res.locals.currUser._id)){
        req.flash("error","Oops!You are not the author of this review")
        return res.redirect(`/listings/${id}`)
    }
    next();
}
