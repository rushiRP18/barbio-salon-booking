function generateSlots(shop, appointments, date) {
    const slotDuration = 15;
    const totalMinutes = (shop.timing.closesAt - shop.timing.opensAt) * 60;
    const totalSlots = totalMinutes / slotDuration;

    // Initialize slots: chairs × time slots
    const slots = [];
    for (let chair = 0; chair < shop.chairs; chair++) {
        slots.push(new Array(totalSlots).fill(true)); // true = available
    }

    // Mark existing bookings
    appointments.forEach(appt => {
        if (new Date(appt.date).toDateString() === new Date(date).toDateString()) {
            const [hour, minute] = appt.appointmentTime.split(":").map(Number);
            let startIndex = ((hour - shop.timing.opensAt) * 60 + minute) / slotDuration;
            let numSlots = appt.services.reduce((acc, s) => acc + Math.ceil(s.duration / slotDuration), 0);

            // Mark slots for the assigned chair
            if (appt.chairId !== undefined) {
                for (let i = 0; i < numSlots; i++) {
                    slots[appt.chairId][startIndex + i] = false;
                }
            }
        }
    });

    return slots;
}
