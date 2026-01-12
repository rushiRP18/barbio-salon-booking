const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const shopSchema = new Schema({
  name: { type: String, required: true },
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  chairs: { type: Number, default: 1 },
  // slots: [[Number]],
  dailySlots: [{
    date: String,           // e.g. "2025-08-20"
    slots: [[Number]],      // 2D array for that day
  }],
  reviews: [
    {
      type: Schema.Types.ObjectId,
      ref: "Review",
    }
  ],
  avgRating: {
    type: Number,
    default: 0
  },
  location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true } // [longitude, latitude]
  },
  address: String,
  pincode: Number,
  services: [{
    name: String,
    description: String,
    price: Number,
    duration: Number // in minutes
  }],
  timing: {
    opensAt: Number, // "09:00"
    closesAt: Number // "20:00"
  },
  
  appointments: [{ type: Schema.Types.ObjectId, ref: "Appointment" }]

});

shopSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Shop', shopSchema);
