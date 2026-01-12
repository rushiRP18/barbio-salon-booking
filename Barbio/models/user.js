const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new Schema({
    name: String,
    email: String,
    contactNo: Number,
    role: {
        type: String,
        enum: ['user', 'shopkeeper'],
        required: true,
    },
    
    pushSubscription: { type: Object }, // Store push notification subscription
    appointments: [{ type: Schema.Types.ObjectId, ref: "Appointment" }]

})
userSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model('User', userSchema);