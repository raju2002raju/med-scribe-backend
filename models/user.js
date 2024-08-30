const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  profileImage: String,
  // Add other fields as necessary
});

const User = mongoose.model('User', userSchema);

module.exports = User;
