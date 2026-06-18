const User = require("../models/user");

// Route to serve VAPID public key
module.exports.getVapidPublicKey = (req, res) => {
  res.send(process.env.VAPID_PUBLIC_KEY);
};

// Route to save push subscription
module.exports.postSubscribe = async (req, res) => {
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
};
