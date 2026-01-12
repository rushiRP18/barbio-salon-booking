const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const paymentSchema = new Schema({
  appointment: { type: Schema.Types.ObjectId, ref: 'Appointment', required: true },
  orderId: String, // Razorpay order_id
  paymentId: String, // Razorpay pay_xxx
  amount: Number, // Total (T) in paise
  serviceAmt: Number, // Service amount (S) in paise
  commission: Number, // 3% of S in paise
  razorpayFee: Number, // Approx 0.0236 * T in paise
  status: { type: String, enum: ['created', 'captured', 'refunded', 'failed'], default: 'created' },
  refundId: String, // Razorpay rfnd_xxx
  refundAmount: Number, // Refunded amount in paise
  penalty: Number, // 2% of S for shopkeeper cancels, in paise
  transferId: String, // Razorpay trf_xxx for shopkeeper transfer
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date }
});

module.exports = mongoose.model('Payment', paymentSchema);