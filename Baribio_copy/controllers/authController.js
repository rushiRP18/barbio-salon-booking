const User = require("../models/user");
const passport = require("passport");

//signup
module.exports.renderSignup = (req, res) => {
  res.render("users/signup.ejs")
}
module.exports.handleSignup = async (req, res) => {
  try {
    let { username, email, contactNo, password, role } = req.body;
    const newUser = new User({ email, username, contactNo, role });
    const registeredUser = await User.register(newUser, password)
    req.flash("success", "welcome to barbio")
    req.login(registeredUser, (err) => {
      if (err) {
        return next(err);
      }
      if (req.user.role == 'user') {
        res.redirect("/shops")
      }
      else {
        res.redirect("/admin/shops")
      }
    })
  }
  catch (e) {
    console.log(e)
    res.redirect("/signup")
  }
}

//login
module.exports.renderLogin = (req, res) => {
  res.render("users/login.ejs")
}

module.exports.postLoginRedirect = (req, res) => {
  req.flash("success", "welcome again!!")
  if (req.user.role == 'user') {
    res.redirect("/shops")
  }
  else {
    res.redirect("/admin/shops")
  }
}

//logout
module.exports.handleLogout = (req, res) => {
  req.logout((err) => {
    if (err) {
      return next(err)
    }
    req.flash("error", "logged out")
    res.redirect("/")
  })
}
