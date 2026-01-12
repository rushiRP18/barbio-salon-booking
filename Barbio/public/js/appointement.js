function normalizeDate(date) {
  return new Date(date).toISOString().split("T")[0]; // "2025-08-20"
}


function selectedServices(appointmentData, shop) {
  const rawServices = appointmentData.services;
  const selectedNames = Array.isArray(rawServices)
    ? rawServices
    : rawServices ? [rawServices] : [];

  // Map names -> full objects from shop.services
  const selectedServices = shop.services.filter(svc =>
    selectedNames.includes(svc.name)
  );

  return selectedServices;
}


function initializeSlots(opensAt, closesAt, chairs) {
  //intialize the slots for the shop
  let rows = Number(chairs);
  let cols = Math.floor(((Number(closesAt) - Number(opensAt)) * 60) / 15);

  if (isNaN(rows) || isNaN(cols) || rows <= 0 || cols <= 0) {
    throw new Error(`Invalid rows (${rows}) or cols (${cols}) in initializeSlots`);
  }

  return new Array(rows).fill(null).map(() => new Array(cols).fill(0));
}

async function getOrCreateDailySlots(shop, date) {
  let daily = shop.dailySlots.find(ds => ds.date === date);
  if (!daily) {
    const slots = initializeSlots(shop.timing.opensAt, shop.timing.closesAt, shop.chairs);
    shop.dailySlots.push({ date, slots });
    await shop.save();
    daily = shop.dailySlots.find(ds => ds.date === date);
  }
  return daily;
}



function totalTimeFortheAppointment(services){
  //totalTimeforAppointment in minutes
  let totalTimeFortheAppointment = 0;
  for(let service of services){
    totalTimeFortheAppointment += service.duration;
  }
  return totalTimeFortheAppointment;
}

// function calRequiredeSlots(slot, startTimeofShop, totalTimeFortheAppointment) {
//   //slot is array which we have stored in the appointment 
//   //ex slot[11,12] customer has selected slot from 11-12
//   let startTimeofSlot = slot[0];
//   let startIdxOfSlot = ((startTimeofSlot - startTimeofShop) * 4) - 1; //startSlot for the function bookFromSlotStart
//   let requiredSlots = Math.ceil(totalTimeFortheAppointment / 15);
//   //returns the index of the slot from where we would start to search
//   return { startIdxOfSlot, requiredSlots };
// }

function calRequiredeSlots(slot, startTimeofShop, totalTimeFortheAppointment) {
  if (!slot || !slot.length) {
    throw new Error("Slot array is empty or undefined");
  }

  let startTimeofSlot = Number(slot[0]);        // ensure it's a number
  let startTimeofShopNum = Number(startTimeofShop); // ensure shop opening is number

  let startIdxOfSlot = (startTimeofSlot - startTimeofShopNum) * 4; // zero-based indexing
  let requiredSlots = Math.ceil(totalTimeFortheAppointment / 15);

  return { startIdxOfSlot, requiredSlots };
}


// function bookFromSlotStart(chairs, requiredSlots, startSlot) {
//   for (let c = 0; c < chairs.length; c++) {
//     let allFree = true;
//     for (let s = startSlot; s < startSlot + requiredSlots; s++) {
//       if (s >= chairs[c].length || chairs[c][s] === 1) {
//         allFree = false;
//         break;
//       }
//     }
//     if (allFree) {
//       // mark booked
//       for (let s = startSlot; s < startSlot + requiredSlots; s++) {
//         chairs[c][s] = 1;
//       }
//       console.log(chairs)
//       return { chair: c, startSlot, endSlot: startSlot + requiredSlots - 1 };
//     }
//   }
//   return null; // no chair available starting at that slot
// }

// function bookFromSlotStart(chairs, requiredSlots, startSlot) {
//   for (let c = 0; c < chairs.length; c++) {
//     let allFree = true;
//     for (let s = startSlot; s < startSlot + requiredSlots; s++) {
//       if (s >= chairs[c].length || chairs[c][s] === 1) {
//         allFree = false;
//         break;
//       }
//     }
//     if (allFree) {
//       // mark booked
//       for (let s = startSlot; s < startSlot + requiredSlots; s++) {
//         chairs[c][s] = 1;
//       }
//       console.log({
//         chairs,
//         startSlot: startSlot,
//         endSlot: startSlot + requiredSlots - 1
//       });
//       return { chair: c, startSlot, endSlot: startSlot + requiredSlots - 1 };
//     }
//   }
//   return null; // no chair available starting at that slot
// }


// Function to check availability WITHOUT booking
function checkSlotAvailability(dailySlots, date, requiredSlots, startSlot) {
  const normDate = new Date(date).toISOString().split("T")[0];
  const day = dailySlots.find(ds => ds.date === normDate);

  if (!day) {
    throw new Error(`No slots found for date ${normDate}`);
  }
  let chairs = day.slots;
  let startIdxtoSearch = -1;

  // Search for a free start only within the selected slot (4 subslots of 15 min)
  for (let c = 0; c < chairs.length; c++) {
    for (let s = startSlot; s < startSlot + 4; s++) {
      if (chairs[c][s] === 0) {
        startIdxtoSearch = s;
        break;  // found free subslot in this chair
      }
    }
    if (startIdxtoSearch !== -1) {
      // Check continuous requiredSlots availability from that start
      let allFree = true;
      for (let s = startIdxtoSearch; s < startIdxtoSearch + requiredSlots; s++) {
        if (s >= chairs[c].length || chairs[c][s] === 1) {
          allFree = false;
          break;
        }
      }

      if (allFree) {
        // DON'T book here, just return the availability info
        return {
          chair: c,
          startSlot: startIdxtoSearch,
          endSlot: startIdxtoSearch + requiredSlots - 1,
          available: true
        };
      }
    }
    // Reset for next chair
    startIdxtoSearch = -1;
  }

  return null; // No availability found
}

// Keep the original bookFromSlotStart for actual booking
function bookFromSlotStart(dailySlots, date, requiredSlots, startSlot) {
  const normDate = new Date(date).toISOString().split("T")[0];
  const dayIndex = dailySlots.findIndex(ds => ds.date === normDate);

  if (dayIndex === -1) {
    throw new Error(`No slots found for date ${normDate}`);
  }

  let chairs = dailySlots[dayIndex].slots;
  let startIdxtoSearch = -1;

  for (let c = 0; c < chairs.length; c++) {
    startIdxtoSearch = -1;
    
    for (let s = startSlot; s < startSlot + 4; s++) {
      if (s < chairs[c].length && chairs[c][s] === 0) {
        startIdxtoSearch = s;
        break;
      }
    }
    
    if (startIdxtoSearch !== -1) {
      let allFree = true;
      for (let s = startIdxtoSearch; s < startIdxtoSearch + requiredSlots; s++) {
        if (s >= chairs[c].length || chairs[c][s] === 1) {
          allFree = false;
          break;
        }
      }

      if (allFree) {
        // NOW actually book the slots
        for (let s = startIdxtoSearch; s < startIdxtoSearch + requiredSlots; s++) {
          chairs[c][s] = 1;
        }

        return {
          date: normDate,
          chair: c,
          startSlot: startIdxtoSearch,
          endSlot: startIdxtoSearch + requiredSlots - 1,
          slots: chairs
        };
      }
    }
  }

  return null;
}
function bookFromSlotStart(dailySlots, date, requiredSlots, startSlot) {
  const normDate = new Date(date).toISOString().split("T")[0];
  const day = dailySlots.find(ds => ds.date === normDate);

  if (!day) {
    throw new Error(`No slots found for date ${normDate}`);
  }

  let chairs = day.slots;
  let startIdxtoSearch = -1;   // will hold the first free index inside selected hour

  // 🔹 Step 1: search for a free start only within the selected slot (4 subslots of 15 min)
  for (let c = 0; c < chairs.length; c++) {
    for (let s = startSlot; s < startSlot + 4; s++) {
      if (chairs[c][s] === 0) {
        startIdxtoSearch = s;
        break;  // found free subslot in this chair
      }
    }
    if (startIdxtoSearch !== -1) {
      // 🔹 Step 2: check continuous requiredSlots availability from that start
      let allFree = true;
      for (let s = startIdxtoSearch; s < startIdxtoSearch + requiredSlots; s++) {
        if (s >= chairs[c].length || chairs[c][s] === 1) {
          allFree = false;
          break;
        }
      }

      if (allFree) {
        // mark booked
        for (let s = startIdxtoSearch; s < startIdxtoSearch + requiredSlots; s++) {
          chairs[c][s] = 1;
        }

        return {
          date: normDate,
          chair: c,
          startSlot: startIdxtoSearch,
          endSlot: startIdxtoSearch + requiredSlots - 1,
          slots: chairs
        };
      }
    }
    // if not found in this chair, continue to next chair
  }

  return null;
}





module.exports = {
  initializeSlots,
  calRequiredeSlots,
  bookFromSlotStart,
  selectedServices,
  totalTimeFortheAppointment,
  getOrCreateDailySlots,
  normalizeDate,
  checkSlotAvailability
};

//calculate the total time for the appointement