const { date } = require("joi");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const appointmentSchema = new Schema({
    customer: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    shop: {
        type: Schema.Types.ObjectId,
        ref: "Shop",
        required: true
    },
    services: [{
        name: { type: String, required: true },
        price: { type: Number, required: true },
        duration: { type: Number, required: true } // in minutes
    }],
    slot :[Number],
    date: { type: Date, required: true },
    reqdTime: Number,
    startTime : Date,
    endTime : Date,
    status: { type: String, enum: ["pending", "confirmed","completed" ,"cancelled"], default: "pending" }
},
    { timestamps: true });

module.exports = mongoose.model("Appointment", appointmentSchema);
