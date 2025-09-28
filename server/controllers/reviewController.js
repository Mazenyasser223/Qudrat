const Review = require('../models/Review');
const path = require('path');
const fs = require('fs');

// Get all active and approved reviews
const getReviews = async (req, res) => {
  try {
    console.log('🔍 Fetching approved reviews...');
    const reviews = await Review.find({ 
      isActive: true, 
      isApproved: true,
      comment: { $exists: true, $ne: null } // Only text-based reviews
    })
      .sort({ order: 1, createdAt: -1 });
    
    console.log('📊 Found approved reviews:', reviews.length);
    console.log('📋 Reviews data:', reviews);
    
    res.json({
      success: true,
      data: reviews
    });
  } catch (error) {
    console.error('❌ Error fetching reviews:', error);
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

// Create new text-based review
const createReview = async (req, res) => {
  try {
    console.log('📝 Creating new text review...');
    console.log('📋 Request body:', req.body);
    
    const { studentName, rating, comment } = req.body;
    
    // Validate required fields
    if (!studentName || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: 'جميع الحقول مطلوبة (الاسم، التقييم، التعليق)'
      });
    }

    // Validate rating
    const ratingNum = parseInt(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({
        success: false,
        message: 'التقييم يجب أن يكون بين 1 و 5'
      });
    }

    // Validate comment length
    if (comment.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'التعليق يجب أن يكون أقل من 500 حرف'
      });
    }

    const review = new Review({
      studentName: studentName.trim(),
      rating: ratingNum,
      comment: comment.trim(),
      isApproved: false, // New reviews need approval
      isActive: true
    });

    console.log('💾 Saving review to database:', review);
    await review.save();
    console.log('✅ Review saved successfully to database');

    res.status(201).json({
      success: true,
      message: 'تم إرسال تقييمك بنجاح! سيتم مراجعته من قبل الإدارة قبل النشر.',
      data: review
    });
  } catch (error) {
    console.error('❌ Error creating review:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إرسال التقييم'
    });
  }
};

// Update review (admin)
const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentName, rating, comment, order, isActive, isApproved } = req.body;
    
    const updateData = {
      studentName,
      rating: rating ? parseInt(rating) : undefined,
      comment,
      order: order ? parseInt(order) : undefined,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      isApproved: isApproved !== undefined ? isApproved === 'true' : undefined
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    );

    // If new image is uploaded (legacy support)
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

// Approve review
const approveReview = async (req, res) => {
  try {
    const { id } = req.params;
    
    const review = await Review.findByIdAndUpdate(
      id,
      { isApproved: true },
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
      message: 'تم الموافقة على التقييم بنجاح',
      data: review
    });
  } catch (error) {
    console.error('Error approving review:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء الموافقة على التقييم'
    });
  }
};

// Reject review
const rejectReview = async (req, res) => {
  try {
    const { id } = req.params;
    
    const review = await Review.findByIdAndUpdate(
      id,
      { isApproved: false, isActive: false },
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
      message: 'تم رفض التقييم بنجاح',
      data: review
    });
  } catch (error) {
    console.error('Error rejecting review:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء رفض التقييم'
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
  deleteReview,
  approveReview,
  rejectReview
};
