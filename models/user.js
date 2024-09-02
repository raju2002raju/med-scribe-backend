const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: {
    type: String,
    required: true,
    unique: true, // Ensure email is unique
  },
  phone: String,
  profileImage: String,
  password: {
    type: String,
    required: true, // Ensure password is required
  },
  // Add other fields as necessary
});

const User = mongoose.model('User', userSchema);

module.exports = User;
