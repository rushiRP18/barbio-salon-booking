if (process.env.NODE_ENV != "production") {
  require("dotenv").config()
}

// ============================================
// Validate required environment variables
// ============================================
const requiredEnvVars = [
  'MONGO_URI',
  'VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error(`FATAL: Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('Please set them in your .env file (dev) or Render dashboard (prod).');
  process.exit(1);
}



const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const Shop = require("./models/shop")
const User = require("./models/user")
const methodOverride = require("method-override")
const ejsMate = require("ejs-mate");
const passport = require("passport");
const LocalStratergy = require("passport-local");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const { initializeSlots } = require("./public/js/appointement.js");
const cron = require("node-cron");
const webPush = require("web-push");



const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;

if (!publicVapidKey || !privateVapidKey) {
  console.error("VAPID keys are not set in .env file");
  process.exit(1);
}
webPush.setVapidDetails('mailto:patilrushikesh@gmail.com', publicVapidKey, privateVapidKey);


// const MONGO_URL = "mongodb://127.0.0.1:27017/Barbio"
// main().then(() => {
//   console.log("connectede to DB")
// })
//   .catch((err) => {
//     console.log(err)
//   })

// async function main() {
//   await mongoose.connect(MONGO_URL)
// }



mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log("MongoDB Atlas Connected");
})
.catch(err => {
    console.error("FATAL: MongoDB connection failed:", err.message);
    console.error("Check your MONGO_URI environment variable and network connectivity.");
    process.exit(1);
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }))
app.use(methodOverride("_method"));
app.engine('ejs', ejsMate)
app.use(express.static(path.join(__dirname, "/public")))

// Trust proxy for Render (reverse proxy) — required for secure cookies & correct IP detection
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

const store = MongoStore.create({
  mongoUrl: process.env.MONGO_URI,
  touchAfter: 24 * 3600, // lazy update session every 24 hours
});

store.on("error", function (e) {
  console.error("SESSION STORE ERROR:", e);
});

const sessionOptions = {
  store,
  secret: process.env.SESSION_SECRET || "mysuperkey",
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  }
}

//to reintialize slots daily
// cron.schedule("0 0 * * *", async () => {
//     console.log(" Running daily slot refresh...");

//     const today = new Date().toISOString().split("T")[0]; // "2025-08-20"
//     const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

//     const shops = await Shop.find();

//     for (let shop of shops) {
//         // 1. Remove yesterday's slots
//         shop.dailySlots = shop.dailySlots.filter(ds => ds.date !== yesterday);

//         // 2. If today's slots not created, create them
//         let exists = shop.dailySlots.some(ds => ds.date === today);
//         if (!exists) {
//             const slots = initializeSlots(shop.timing.opensAt, shop.timing.closesAt, shop.chairs);
//             // shop.dailySlots.push({ date: today, slots });
//             const dateStr = new Date(date).toISOString().split("T")[0];
//             shop.dailySlots.push({ date: dateStr, slots });

//         }

//         await shop.save();
//     }

//     console.log("Slot refresh done");
// });


// to reinitialize slots daily
cron.schedule("0 0 * * *", async () => {
  console.log(" Running daily slot refresh...");

  const today = new Date().toISOString().split("T")[0];       // e.g., 2025-08-22
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const shops = await Shop.find().populate("appointments"); // assuming appointments is populated

  for (let shop of shops) {
    // 1. Remove yesterday's slots
    shop.dailySlots = shop.dailySlots.filter(ds => ds.date !== yesterday);

    // 2. If today's slots not created, create them
    let todayExists = shop.dailySlots.some(ds => ds.date === today);
    if (!todayExists) {
      const slots = initializeSlots(shop.timing.opensAt, shop.timing.closesAt, shop.chairs);
      shop.dailySlots.push({ date: today, slots });
    }

    // 3. If any appointment exists for tomorrow, create tomorrow's slots
    let tomorrowAppointment = shop.appointments.some(appt => {
      const apptDate = new Date(appt.date).toISOString().split("T")[0];
      return apptDate === tomorrow;
    });

    let tomorrowExists = shop.dailySlots.some(ds => ds.date === tomorrow);

    if (tomorrowAppointment && !tomorrowExists) {
      const slots = initializeSlots(shop.timing.opensAt, shop.timing.closesAt, shop.chairs);
      shop.dailySlots.push({ date: tomorrow, slots });
    }

    console.log(`Shop: ${shop.name}`);
    console.log("Slots available:", shop.dailySlots.map(ds => ds.date));

    await shop.save();
  }

  console.log("Slot refresh done");
});



app.use(session(sessionOptions));
app.use(flash());


app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStratergy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {

  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user; // user of the curr section
  next();
})

// Route mounting
const homeRoutes = require("./routes/homeRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const shopRoutes = require("./routes/shopRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const authRoutes = require("./routes/authRoutes");

app.use("/", homeRoutes);
app.use("/", notificationRoutes);
app.use("/", shopRoutes);
app.use("/", appointmentRoutes);
app.use("/", reviewRoutes);
app.use("/", authRoutes);

app.use((req, res) => {
  res.status(404).render("shops/error.ejs", { message: "Page Not Found" });
});
app.use((err, req, res, next) => {
  const { statusCode = 500, message = "Something went wrong" } = err;
  // Avoid leaking stack traces in production
  if (process.env.NODE_ENV !== "production") {
    console.error("Error:", err);
  } else {
    console.error("Error:", message);
  }
  res.status(statusCode).render("shops/error.ejs", { message })
});

// ============================================
// Global error handlers — prevent silent crashes
// ============================================
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

// ============================================
// Start server
// ============================================
const PORT = process.env.PORT || 8080;
const server = app.listen(PORT, () => {
  console.log(`Server is listening to port ${PORT}`)
});

// ============================================
// Graceful shutdown for Render SIGTERM
// ============================================
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log("MongoDB connection closed.");
      process.exit(0);
    });
  });
});