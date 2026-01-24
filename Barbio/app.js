if (process.env.NODE_ENV != "production") {
  require("dotenv").config()
}



const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const Shop = require("./models/shop")
const User = require("./models/user")
const Review = require("./models/review")
const Appointment = require("./models/appointment")
const methodOverride = require("method-override")
const ejsMate = require("ejs-mate");
const passport = require("passport");
const LocalStratergy = require("passport-local");
const session = require("express-session");
const flash = require("connect-flash");
const { isLoggedIn, isOwner, isUser, isShopkeeper, isReviewAuthor } = require("./middleware.js");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const { initializeSlots, calRequiredeSlots, bookFromSlotStart, selectedServices, totalTimeFortheAppointment, getOrCreateDailySlots, normalizeDate, checkSlotAvailability } = require("./public/js/appointement.js");
const { calAvg } = require("./public/js/rating.js");
const appointments = require("./models/appointment.js");
const cron = require("node-cron");
const { summarizeReviews } = require("./utils/summary.js");
const webPush = require("web-push");


const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;

if (!publicVapidKey || !privateVapidKey) {
  console.error("VAPID keys are not set in .env file");
  process.exit(1);
}
webPush.setVapidDetails('mailto:patilrushikesh@gmail.com', publicVapidKey, privateVapidKey);


const MONGO_URL = "mongodb://127.0.0.1:27017/Barbio"
main().then(() => {
  console.log("connectede to DB")
})
  .catch((err) => {
    console.log(err)
  })

async function main() {
  await mongoose.connect(MONGO_URL)
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }))
app.use(methodOverride("_method"));
app.engine('ejs', ejsMate)
app.use(express.static(path.join(__dirname, "/public")))

const sessionOptions = {
  secret: "mysuperkey",
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  }
}

//to reintialize slots daily
// cron.schedule("0 0 * * *", async () => {
//     console.log(" Running daily slot refresh...");

//     const today = new Date().toISOString().split("T")[0]; // "2025-08-20"
//     const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

//     const shops = await Shop.find();

//     for (let shop of shops) {
//         // 1. Remove yesterday’s slots
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
    // 1. Remove yesterday’s slots
    shop.dailySlots = shop.dailySlots.filter(ds => ds.date !== yesterday);

    // 2. If today's slots not created, create them
    let todayExists = shop.dailySlots.some(ds => ds.date === today);
    if (!todayExists) {
      const slots = initializeSlots(shop.timing.opensAt, shop.timing.closesAt, shop.chairs);
      shop.dailySlots.push({ date: today, slots });
    }

    // 3. If any appointment exists for tomorrow, create tomorrow’s slots
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


//root
app.get("/", (req, res) => {
  res.render("users/home.ejs")
})

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


// Route to serve VAPID public key
app.get('/vapidPublicKey', (req, res) => {
  res.send(publicVapidKey);
});

// Route to save push subscription
app.post('/subscribe', isLoggedIn, async (req, res) => {
  try {
    console.log('Received subscription data:', req.body);
    if (!req.body || !req.body.endpoint) {
      console.error('Invalid subscription data received');
      return res.status(400).json({ error: 'Invalid subscription data' });
    }
    const subscription = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      console.error('User not found:', req.user._id);
      return res.status(404).json({ error: 'User not found' });
    }
    user.pushSubscription = subscription;
    await user.save();
    console.log('Subscription saved for user:', user._id, subscription);
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Error saving subscription:', err);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

//add new shop
app.get("/admin/new", isLoggedIn, (req, res) => {
  res.render("shops/new.ejs")
})

//add the shop
app.post("/admin/shops", isLoggedIn, wrapAsync(async (req, res) => {
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
    res.send("Failed to add shop. Check console for error.");
  }
}));



//show all shops
app.get("/shops", wrapAsync(async (req, res) => {
  const allShops = await Shop.find({})
  res.render("shops/index.ejs", { allShops })
}))



//show all shops to the admin
app.get("/admin/shops", isShopkeeper, wrapAsync(async (req, res) => {
  const allShops = await Shop.find({ owner: req.user._id });
  res.render("shops/index.ejs", { allShops })
}))

//show particular shop
app.get("/shops/:id", wrapAsync(async (req, res) => {
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
}))

//render edit form
app.get("/admin/:id/edit", isLoggedIn, isOwner, wrapAsync(async (req, res) => {
  let { id } = req.params;
  const shop = await Shop.findById(id);
  res.render("shops/edit.ejs", { shop });
}))

//Update listing
app.put("/admin/shops/:id", isLoggedIn, isOwner, wrapAsync(async (req, res) => {
  const { id } = req.params;
  let shop = await Shop.findByIdAndUpdate(id, { ...req.body.shop });
  await shop.save();
  req.flash("success", "shop Updated!!")
  res.redirect(`/shops/${id}`)
}))

//delete route
app.delete("/admin/shops/:id", isLoggedIn, isOwner, wrapAsync(async (req, res) => {
  const { id } = req.params;
  await Shop.findByIdAndDelete(id);
  req.flash("error", "shop Deleted!!")
  res.redirect("/shops")
}))

//serve the form to book the appointment
app.get("/shops/:id/book", isLoggedIn, async (req, res) => {
  let { id } = req.params;
  const shop = await Shop.findById(id);
  res.render("shops/book.ejs", { shop })
})

// async function initTodaySlots(shop, slotDuration = 15) {
//   if (!shop) {
//     console.log(" Shop not found");
//     return;
//   }

//   // Today's date (yyyy-mm-dd)
//   const today = new Date();
//   const normDate = today.toISOString().split("T")[0];

//   // Prevent duplicate slots
//   const exists = shop.dailySlots.some(ds => ds.date === normDate);
//   if (exists) {
//     console.log(`⚠️ Slots already initialized for ${normDate}`);
//     return;
//   }

//   const numChairs = shop.chairs;
//   if (!numChairs) {
//     console.log("numChairs not set for this shop");
//     return;
//   }

//   // Convert to minutes
//   const openMinutes = shop.timing.opensAt * 60;   // e.g., 9 → 540
//   const closeMinutes = shop.timing.closesAt * 60; // e.g., 21 → 1260
//   const totalMinutes = closeMinutes - openMinutes;

//   if (totalMinutes <= 0) {
//     console.log("Invalid shop timing configuration");
//     return;
//   }

//   const numSlotsPerDay = Math.floor(totalMinutes / slotDuration);

//   // Initialize slots: chairs × slots per chair
//   const slots = Array.from({ length: numChairs }, () =>
//     Array(numSlotsPerDay).fill(0)
//   );

//   shop.dailySlots.push({
//     date: normDate,
//     slots
//   });

//   await shop.save();
//   console.log(
//     ` Slots for ${normDate} initialized (${numChairs} chairs × ${numSlotsPerDay} slots each)`
//   );
// }


// GET: Show service selection
app.get(
  "/shops/:id/book/services",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    const shop = await Shop.findById(id);
    res.render("appointment/selectServices.ejs", { shop });
  })
);

app.get(
  "/shops/:id/book/availability",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    const shop = await Shop.findById(id);
    const bookingData = req.session.bookingData;
    console.log("Session bookingData in availability:", bookingData); // Debug
    if (!bookingData || !bookingData.services) {
      req.flash("error", "Please select services first.");
      return res.redirect(`/shops/${id}/book/services`);
    }
    res.render("appointment/checkAvailability.ejs", { shop, selectedServices: bookingData.services });
  })
);

app.post(
  "/shops/:id/book/services",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    const shop = await Shop.findById(id);
    const appointmentData = req.body.appointment;

    const services = selectedServices(appointmentData, shop);
    if (!services.length) {
      req.flash("error", "Please select at least one service.");
      return res.redirect(`/shops/${id}/book/services`);
    }

    req.session.bookingData = { services };
    console.log("Session bookingData set:", req.session.bookingData); // Debug
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        req.flash("error", "Something went wrong.");
        return res.redirect(`/shops/${id}/book/services`);
      }
      res.redirect(`/shops/${id}/book/availability`);
    });
  })
);

// app.post(
//   "/shops/:id/book/availability",
//   isLoggedIn,
//   wrapAsync(async (req, res) => {
//     try {
//       const { id } = req.params;
//       const shop = await Shop.findById(id);
//       const { date, slot } = req.body.appointment;
//       const normDate = normalizeDate(date);
//       const slotArray = slot.split(",").map(Number);

//       const totalTime = totalTimeFortheAppointment(req.session.bookingData.services);
//       const { startIdxOfSlot, requiredSlots } = calRequiredeSlots(slotArray, shop.timing.opensAt, totalTime);

//       const daily = await getOrCreateDailySlots(shop, normDate);
//       const result = bookFromSlotStart(shop.dailySlots, normDate, requiredSlots, startIdxOfSlot);

//       if (!result) {
//         req.flash("error", "Slot not available, try another.");
//         return res.redirect(`/shops/${id}/book/availability`);
//       }

//       // Update the shop's dailySlots in the database
//       const dayIndex = shop.dailySlots.findIndex((ds) => ds.date === normDate);
//       shop.dailySlots[dayIndex].slots = result.slots;
//       await shop.save();
//       console.log("Updated shop slots in DB:", shop.dailySlots[dayIndex].slots); // Debug

//       req.session.bookingData = { date: normDate, slot: slotArray, services: req.session.bookingData.services };
//       res.redirect(`/shops/${id}/book/confirm`);
//     } catch (err) {
//       console.error("Availability error:", err);
//       req.flash("error", "Something went wrong.");
//       res.redirect(`/shops/${id}/book/availability`);
//     }
//   })
// );

app.post(
  "/shops/:id/book/availability",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    try {
      const { id } = req.params;
      const shop = await Shop.findById(id);
      const { date, slot } = req.body.appointment;
      const normDate = normalizeDate(date);
      const slotArray = slot.split(",").map(Number);

      // Validate date and time are not in the past
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      if (normDate < today) {
        req.flash("error", "Cannot book appointments for past dates.");
        return res.redirect(`/shops/${id}/book/availability`);
      }

      const startTime = new Date(normDate);
      startTime.setHours(slotArray[0], 0, 0, 0);
      if (startTime < now) {
        req.flash("error", "Cannot book appointments for past times.");
        return res.redirect(`/shops/${id}/book/availability`);
      }

      const totalTime = totalTimeFortheAppointment(req.session.bookingData.services);
      const { startIdxOfSlot, requiredSlots } = calRequiredeSlots(slotArray, shop.timing.opensAt, totalTime);

      const daily = await getOrCreateDailySlots(shop, normDate);
      const result = bookFromSlotStart(shop.dailySlots, normDate, requiredSlots, startIdxOfSlot);

      if (!result) {
        req.flash("error", "Slot not available, try another.");
        return res.redirect(`/shops/${id}/book/availability`);
      }

      // Update the shop's dailySlots in the database
      const dayIndex = shop.dailySlots.findIndex((ds) => ds.date === normDate);
      shop.dailySlots[dayIndex].slots = result.slots;
      await shop.save();
      console.log("Updated shop slots in DB:", shop.dailySlots[dayIndex].slots); // Debug

      req.session.bookingData = { date: normDate, slot: slotArray, services: req.session.bookingData.services };
      res.redirect(`/shops/${id}/book/confirm`);
    } catch (err) {
      console.error("Availability error:", err);
      req.flash("error", "Something went wrong.");
      res.redirect(`/shops/${id}/book/availability`);
    }
  })
);

app.get(
  "/shops/:id/book/confirm",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    const shop = await Shop.findById(req.params.id);
    const bookingData = req.session.bookingData;
    if (!bookingData) {
      req.flash("error", "No booking data found.");
      return res.redirect(`/shops/${req.params.id}/book/services`);
    }

    // Start = first hour in slot
    const startTime = new Date(bookingData.date);
    startTime.setHours(bookingData.slot[0], 0, 0, 0);

    // End = start + total duration (NOT last slot hour)
    const totalDuration = bookingData.services.reduce((sum, s) => sum + s.duration, 0);
    const endTime = new Date(startTime.getTime() + totalDuration * 60000);

    const formattedTime = `${startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${endTime.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;

    const totalPrice = bookingData.services.reduce((sum, s) => sum + s.price, 0);
    const hours = Math.floor(totalDuration / 60);
    const minutes = totalDuration % 60;
    const formattedDuration = hours > 0 ? `${hours} hr ${minutes} min` : `${minutes} min`;

    res.render("appointment/confirmBooking", {
      shop,
      bookingData,
      formattedTime,
      totalPrice,
      formattedDuration,
    });
  })
);

// app.post(
//   "/shops/:id/book/confirm",
//   isLoggedIn,
//   wrapAsync(async (req, res) => {
//     try {
//       const { bookingData } = req.session;
//       if (!bookingData) {
//         req.flash("error", "Session expired. Please book again.");
//         return res.redirect(`/shops/${req.params.id}/book/services`);
//       }

//       const shop = await Shop.findById(req.params.id).populate("owner");
//       const customer = req.user;
//       const startTime = new Date(bookingData.date);
//       startTime.setHours(bookingData.slot[0], 0, 0, 0);

//       const totalDuration = bookingData.services.reduce((sum, s) => sum + s.duration, 0);
//       const endTime = new Date(startTime.getTime() + totalDuration * 60000);

//       const appointment = new Appointment({
//         shop: shop._id,
//         customer: customer._id,
//         services: bookingData.services,
//         date: bookingData.date,
//         slot: bookingData.slot,
//         startTime,
//         endTime,
//       });

//       await appointment.save();
//       customer.appointments.push(appointment._id);
//       shop.appointments.push(appointment._id);

//       await shop.save();
//       await customer.save();

//       const owner = shop.owner;
//       if (owner.pushSubscription) {
//         console.log('Sending booking notification to owner:', owner._id);
//         const servicesList = bookingData.services.map(s => s.name).join(", ");
//         const payload = JSON.stringify({
//           title: `New Appointment Booked - ${shop.name}`,
//           body: `Customer ${customer.username} booked an appointment for ${servicesList} on ${new Date(bookingData.date).toLocaleDateString()} at ${startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`,
//           icon: '/images/icon.png',
//           data: { url: `/admin/orders` }
//         });
//         await webPush.sendNotification(owner.pushSubscription, payload)
//           .then(() => console.log('Booking notification sent to owner successfully'))
//           .catch(err => console.error('Error sending booking notification to owner:', err));
//       } else {
//         console.log('No push subscription for owner:', owner._id);
//       }

//       delete req.session.bookingData;
//       req.flash("success", `Appointment booked successfully @ ${shop.name}`);
//       res.redirect("/shops");
//     } catch (err) {
//       console.error("Booking error:", err);
//       req.flash("error", "Could not confirm booking.");
//       res.redirect(`/shops/${req.params.id}/book/services`);
//     }
//   })
// );
// POST: Confirm and save booking
app.post(
  "/shops/:id/book/confirm",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    try {
      const { bookingData } = req.session;
      if (!bookingData) {
        req.flash("error", "Session expired. Please book again.");
        return res.redirect(`/shops/${req.params.id}/book/services`);
      }

      // Re-validate date and time are not in the past (in case session lingered)
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      if (bookingData.date < today) {
        req.flash("error", "Cannot confirm appointments for past dates.");
        return res.redirect(`/shops/${req.params.id}/book/services`);
      }

      const startTime = new Date(bookingData.date);
      startTime.setHours(bookingData.slot[0], 0, 0, 0);
      if (startTime < now) {
        req.flash("error", "Cannot confirm appointments for past times.");
        return res.redirect(`/shops/${req.params.id}/book/services`);
      }

      const shop = await Shop.findById(req.params.id).populate("owner");
      const customer = req.user;
      const totalDuration = bookingData.services.reduce((sum, s) => sum + s.duration, 0);
      const endTime = new Date(startTime.getTime() + totalDuration * 60000);

      const appointment = new Appointment({
        shop: shop._id,
        customer: customer._id,
        services: bookingData.services,
        date: bookingData.date,
        slot: bookingData.slot,
        startTime,
        endTime,
      });

      await appointment.save();
      customer.appointments.push(appointment._id);
      shop.appointments.push(appointment._id);

      await shop.save();
      await customer.save();

      const owner = shop.owner;
      if (owner.pushSubscription) {
        console.log('Sending booking notification to owner:', owner._id);
        const servicesList = bookingData.services.map(s => s.name).join(", ");
        const payload = JSON.stringify({
          title: `New Appointment Booked - ${shop.name}`,
          body: `Customer ${customer.username} booked an appointment for ${servicesList} on ${new Date(bookingData.date).toLocaleDateString()} at ${startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`,
          icon: '/images/icon.png',
          data: { url: `/admin/orders` }
        });
        await webPush.sendNotification(owner.pushSubscription, payload)
          .then(() => console.log('Booking notification sent to owner successfully'))
          .catch(err => console.error('Error sending booking notification to owner:', err));
      } else {
        console.log('No push subscription for owner:', owner._id);
      }

      delete req.session.bookingData;
      req.flash("success", `Appointment booked successfully @ ${shop.name}`);
      res.redirect("/shops");
    } catch (err) {
      console.error("Booking error:", err);
      req.flash("error", "Could not confirm booking.");
      res.redirect(`/shops/${req.params.id}/book/services`);
    }
  })
);
app.get("/user/appointments", isLoggedIn, isUser, async (req, res) => {
  try {
    const appointments = await Appointment.find({ customer: req.user._id })
      .populate("shop")
      .populate("services");

    const formattedAppointments = appointments.map(app => {
      const startTime = new Date(app.startTime);
      const endTime = new Date(app.endTime);
      const coords = app.shop?.location?.coordinates || [null, null];

      return {
        id: app._id,
        shopName: app.shop?.name,
        date: app.date,
        shopLat: coords[1], // latitude
        shopLng: coords[0],
        services: app.services.map(s => s.name).join(", "),
        totalPrice: app.services.reduce((sum, s) => sum + s.price, 0),
        time: `${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        status: app.status
      };
    });

    res.render("users/userDashboard", { appointments: formattedAppointments });
  } catch (err) {
    console.error(" Error fetching appointments:", err);
    res.status(500).send("Server Error");
  }
});

//dashboard shopkeeper
app.get("/admin/orders", isLoggedIn, async (req, res) => {
  try {
    // Find shops owned by this user
    const shops = await Shop.find({ owner: req.user._id });
    const shopIds = shops.map(s => s._id);

    // Find appointments for those shops
    const appointments = await Appointment.find({ shop: { $in: shopIds } })
      .populate("customer")
      .populate("services")
      .populate("shop");

    // Format appointments
    const formattedAppointments = appointments.map(app => {
      const startTime = app.startTime ? new Date(app.startTime) : null;
      const endTime = app.endTime ? new Date(app.endTime) : null;

      return {
        id: app._id,
        customer: app.customer || null,
        customerName: app.customer?.username || "N/A",
        shopName: app.shop?.name || "N/A",
        services: app.services || [],
        totalPrice: (app.services || []).reduce((sum, s) => sum + (s.price || 0), 0),
        date: app.date ? new Date(app.date).toLocaleDateString() : "N/A",
        time: (startTime && endTime)
          ? `${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          : "N/A",
        status: app.status || "pending"
      };
    });

    res.render("shops/adminDashboard.ejs", { appointments: formattedAppointments });
  } catch (err) {
    console.error("Error fetching admin orders:", err);
    res.status(500).send("Something went wrong");
  }
});

// Update appointment status
app.post("/admin/orders/:id/status", isLoggedIn, wrapAsync(async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (["confirmed", "completed", "cancelled"].includes(status)) {
      const appointment = await Appointment.findByIdAndUpdate(id, { status }, { new: true }).populate('customer').populate('shop');
      const user = appointment.customer;

      if (user.pushSubscription) {
        const payload = JSON.stringify({
          title: `Order Status Update - ${appointment.shop.name}`,
          body: `Your appointment @${appointment.shop.name} has been "${status}".`,
          icon: '/images/icon.png', // Ensure you have an icon in your public folder
          data: {
            url: `/user/appointments`
          }
        });

        await webPush.sendNotification(user.pushSubscription, payload).catch(err => {
          console.error('Error sending push notification:', err);
        });
      }
    }

    res.redirect("/admin/orders");
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to update status");
  }
}));

//review system 
app.post("/shops/:id/reviews", isLoggedIn, async (req, res) => {
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
});


app.delete("/shops/:id/reviews/:reviewId", isLoggedIn, isReviewAuthor, async (req, res) => {
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
});


//signup
app.get("/signup", (req, res) => {
  res.render("users/signup.ejs")
})
app.post("/signup", async (req, res) => {
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
})

//login
app.get("/login", (req, res) => {
  res.render("users/login.ejs")
})
app.post("/login",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true
  })
  , (req, res) => {
    req.flash("success", "welcome again!!")
    if (req.user.role == 'user') {
      res.redirect("/shops")
    }
    else {
      res.redirect("/admin/shops")
    }
  })

//logout
app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return next(err)
    }
    req.flash("success", "logged out")
    res.redirect("/shops")
  })
})

app.use((req, res) => {
  res.status(404).render("shops/error.ejs", { message: "Page Not Found" });
});
app.use((err, req, res, next) => {
  const { statusCode = 500, message = "Something went wrong" } = err;
  res.status(statusCode).render("shops/error.ejs", { message })
});

app.listen(8080, () => {
  console.log("Server is listening to port 8080")
})