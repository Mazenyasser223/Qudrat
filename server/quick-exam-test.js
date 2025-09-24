const mongoose = require('mongoose');
const Exam = require('./models/Exam');

async function quickTest() {
  try {
    await mongoose.connect('mongodb+srv://mazenyasser223:Qudrat2024@cluster0.8qjqj.mongodb.net/qudrat?retryWrites=true&w=majority');
    console.log('Connected to MongoDB');

    const exams = await Exam.find({});
    console.log('Total exams:', exams.length);
    
    const active = await Exam.find({isActive: true});
    console.log('Active exams:', active.length);
    
    const recent = await Exam.find({}).sort({createdAt: -1}).limit(5);
    console.log('Recent exams:');
    recent.forEach((e,i) => console.log(`${i+1}. ${e.title} - Active: ${e.isActive} - Questions: ${e.questions?.length || 0}`));

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

quickTest();
