const express = require('express');
const User = require('../models/User');
const router = express.Router();

// @desc    Create admin user
// @route   POST /api/admin/create
// @access  Public (for initial setup)
router.post('/create', async (req, res) => {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@qudrat.com' });
    
    if (existingAdmin) {
      return res.json({
        success: true,
        message: 'Admin user already exists',
        user: {
          email: existingAdmin.email,
          role: existingAdmin.role,
          isActive: existingAdmin.isActive
        }
      });
    }

    // Create admin user
    const admin = await User.create({
      name: 'Admin',
      email: 'admin@qudrat.com',
      password: 'admin123',
      role: 'admin',
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      user: {
        email: admin.email,
        role: admin.role,
        isActive: admin.isActive
      }
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during admin creation'
    });
  }
});

// @desc    List all users
// @route   GET /api/admin/users
// @access  Public (for debugging)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, 'name email role isActive');
    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during user listing'
    });
  }
});

module.exports = router;
