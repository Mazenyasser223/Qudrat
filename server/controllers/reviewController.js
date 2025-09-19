const Review = require('../models/Review');
const path = require('path');
const fs = require('fs');

// Get all active reviews
const getReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ isActive: true })
      .sort({ order: 1, createdAt: -1 });
    
    res.json({
      success: true,
      data: reviews
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحميل التقييمات'
    });
  }
};

// Get all reviews (admin)
const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .sort({ order: 1, createdAt: -1 });
    
    res.json({
      success: true,
      data: reviews
    });
  } catch (error) {
    console.error('Error fetching all reviews:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحميل التقييمات'
    });
  }
};

// Create new review
const createReview = async (req, res) => {
  try {
    const { studentName, rating, order } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'يجب رفع صورة التقييم'
      });
    }

    const review = new Review({
      studentName,
      rating: parseInt(rating),
      imageUrl: `/uploads/reviews/${req.file.filename}`,
      imagePath: req.file.path,
      order: order ? parseInt(order) : 0
    });

    await review.save();

    res.status(201).json({
      success: true,
      message: 'تم إضافة التقييم بنجاح',
      data: review
    });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إضافة التقييم'
    });
  }
};

// Update review
const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentName, rating, order, isActive } = req.body;
    
    const updateData = {
      studentName,
      rating: rating ? parseInt(rating) : undefined,
      order: order ? parseInt(order) : undefined,
      isActive: isActive !== undefined ? isActive === 'true' : undefined
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    );

    // If new image is uploaded
    if (req.file) {
      // Delete old image
      const oldReview = await Review.findById(id);
      if (oldReview && oldReview.imagePath) {
        try {
          fs.unlinkSync(oldReview.imagePath);
        } catch (err) {
          console.error('Error deleting old image:', err);
        }
      }
      
      updateData.imageUrl = `/uploads/reviews/${req.file.filename}`;
      updateData.imagePath = req.file.path;
    }

    const review = await Review.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'التقييم غير موجود'
      });
    }

    res.json({
      success: true,
      message: 'تم تحديث التقييم بنجاح',
      data: review
    });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحديث التقييم'
    });
  }
};

// Delete review
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    
    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'التقييم غير موجود'
      });
    }

    // Delete image file
    if (review.imagePath) {
      try {
        fs.unlinkSync(review.imagePath);
      } catch (err) {
        console.error('Error deleting image:', err);
      }
    }

    await Review.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'تم حذف التقييم بنجاح'
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء حذف التقييم'
    });
  }
};

module.exports = {
  getReviews,
  getAllReviews,
  createReview,
  updateReview,
  deleteReview
};
