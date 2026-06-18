const Shop = require("../models/shop");
const User = require("../models/user");
const Appointment = require("../models/appointment");
const { initializeSlots, calRequiredeSlots, bookFromSlotStart, selectedServices, totalTimeFortheAppointment, getOrCreateDailySlots, normalizeDate, checkSlotAvailability } = require("../public/js/appointement.js");
const webPush = require("web-push");

//serve the form to book the appointment
module.exports.renderBookForm = async (req, res) => {
  let { id } = req.params;
  const shop = await Shop.findById(id);
  res.render("shops/book.ejs", { shop })
}

// GET: Show service selection
module.exports.renderServiceSelection = async (req, res) => {
  const { id } = req.params;
  const shop = await Shop.findById(id);
  res.render("appointment/selectServices.ejs", { shop });
}

module.exports.postServiceSelection = async (req, res) => {
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
}

module.exports.renderAvailability = async (req, res) => {
  const { id } = req.params;
  const shop = await Shop.findById(id);
  const bookingData = req.session.bookingData;
  console.log("Session bookingData in availability:", bookingData); // Debug
  if (!bookingData || !bookingData.services) {
    req.flash("error", "Please select services first.");
    return res.redirect(`/shops/${id}/book/services`);
  }
  res.render("appointment/checkAvailability.ejs", { shop, selectedServices: bookingData.services });
}

module.exports.postAvailability = async (req, res) => {
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
}

module.exports.renderConfirm = async (req, res) => {
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
}

// POST: Confirm and save booking
module.exports.postConfirm = async (req, res) => {
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
}

module.exports.userAppointments = async (req, res) => {
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
}

//dashboard shopkeeper
module.exports.adminOrders = async (req, res) => {
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
}

// Update appointment status
module.exports.updateOrderStatus = async (req, res) => {
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
}
