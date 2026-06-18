// utils/initTodaySlots.js
import Shop from "../models/shop.js";
export async function initTodaySlots(shop, slotDuration = 15) {
  if (!shop) {
    console.log("Shop not found");
    return;
  }

  // Today's date (yyyy-mm-dd)
  const today = new Date();
  const normDate = today.toISOString().split("T")[0];

  // Prevent duplicate slots
  const exists = shop.dailySlots.some(ds => ds.date === normDate);
  if (exists) {
    console.log(`⚠️ Slots already initialized for ${normDate}`);
    return;
  }

  const numChairs = shop.chairs;
  if (!numChairs) {
    console.log(" numChairs not set for this shop");
    return;
  }

  // Convert to minutes
  const openMinutes = shop.timing.opensAt * 60;   // e.g., 9 → 540
  const closeMinutes = shop.timing.closesAt * 60; // e.g., 21 → 1260
  const totalMinutes = closeMinutes - openMinutes;

  if (totalMinutes <= 0) {
    console.log("Invalid shop timing configuration");
    return;
  }

  const numSlotsPerDay = Math.floor(totalMinutes / slotDuration);

  // Initialize slots: chairs × slots per chair
  const slots = Array.from({ length: numChairs }, () =>
    Array(numSlotsPerDay).fill(0)
  );

  shop.dailySlots.push({
    date: normDate,
    slots
  });

  await shop.save();
  console.log(
    ` Slots for ${normDate} initialized (${numChairs} chairs × ${numSlotsPerDay} slots each)`
  );
}
