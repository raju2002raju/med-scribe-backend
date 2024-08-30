const express = require('express');
const router = express.Router();
const multer = require('multer');
const User = require('../models/user'); 

// Define storage for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Profile update route
router.post('/update', upload.single('profileImage'), async (req, res) => {
  const { name, email, phone } = req.body;
  const profileImage = req.file ? req.file.filename : null;

  try {
  
    const user = await User.findOneAndUpdate(
      { email: email }, 
      { name, phone, profileImage },
      { new: true }
    );

    if (!user) {
      return res.status(404).send('User not found');
    }

    res.status(200).send('Profile updated successfully');
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).send('Server error');
  }
});

module.exports = router;
