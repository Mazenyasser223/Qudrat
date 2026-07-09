const User = require('../models/User');
const Exam = require('../models/Exam');
const ReviewExam = require('../models/ReviewExam');

const findQuestionForAnswer = (questions, answer, index) => {
  if (answer?.questionId) {
    const byId = questions.find((q) => q._id.toString() === answer.questionId.toString());
    if (byId) return byId;
  }
  return questions[index] || null;
};

const regradeProgress = (examProgress, examQuestions) => {
  let correctAnswers = 0;
  const detailedAnswers = [];
  const wrongQuestions = [];

  const answers = examProgress.answers || [];
  const answersByQuestionId = new Map();

  for (let i = 0; i < answers.length; i += 1) {
    const answer = answers[i];
    const question = findQuestionForAnswer(examQuestions, answer, i);
    if (!question) continue;
    answersByQuestionId.set(question._id.toString(), answer);
  }

  for (const question of examQuestions) {
    const answer = answersByQuestionId.get(question._id.toString());
    if (!answer) continue;

    const isCorrect = answer.selectedAnswer === question.correctAnswer;
    if (isCorrect) {
      correctAnswers += 1;
    } else {
      wrongQuestions.push(question._id);
    }

    detailedAnswers.push({
      questionId: question._id,
      selectedAnswer: answer.selectedAnswer,
      isCorrect
    });
  }

  const totalQuestions = examQuestions.length;
  examProgress.score = correctAnswers;
  examProgress.totalQuestions = totalQuestions;
  examProgress.percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
  examProgress.correctAnswers = correctAnswers;
  examProgress.wrongAnswers = totalQuestions - correctAnswers;
  examProgress.answers = detailedAnswers;
  examProgress.wrongQuestions = wrongQuestions;

  return wrongQuestions;
};

const createReviewExamForStudent = async (studentId, exam, wrongQuestions) => {
  const reviewQuestions = wrongQuestions
    .map((questionId) => ({
      questionId,
      originalQuestionIndex: exam.questions.findIndex(
        (q) => q._id.toString() === questionId.toString()
      )
    }))
    .filter((q) => q.originalQuestionIndex >= 0);

  for (let i = reviewQuestions.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [reviewQuestions[i], reviewQuestions[j]] = [reviewQuestions[j], reviewQuestions[i]];
  }

  const reviewExam = await ReviewExam.create({
    studentId,
    originalExamId: exam._id,
    title: `امتحان مراجعة - ${exam.title}`,
    description: `امتحان مراجعة للأسئلة الخاطئة من ${exam.title}`,
    questions: reviewQuestions,
    timeLimit: reviewQuestions.length
  });

  return reviewExam._id;
};

const syncReviewExam = async (studentId, exam, wrongQuestions, existingReviewExamId) => {
  if (existingReviewExamId) {
    await ReviewExam.deleteOne({ _id: existingReviewExamId });
  } else {
    await ReviewExam.deleteOne({ studentId, originalExamId: exam._id });
  }

  if (wrongQuestions.length === 0) {
    return null;
  }

  return createReviewExamForStudent(studentId, exam, wrongQuestions);
};

const recomputeStudentTotals = (student) => {
  const completedExams = student.examProgress.filter((p) => p.status === 'completed');
  const totalScore = completedExams.reduce((sum, p) => sum + (p.score || 0), 0);
  const totalQuestions = completedExams.reduce((sum, p) => sum + (p.totalQuestions || 0), 0);
  student.totalScore = totalScore;
  student.overallPercentage = totalQuestions > 0 ? (totalScore / totalQuestions) * 100 : 0;
};

const recomputeExamStatistics = async (examId) => {
  const students = await User.find({
    role: 'student',
    examProgress: { $elemMatch: { examId, status: 'completed' } }
  })
    .select('examProgress')
    .lean();

  const percentages = students
    .map((student) => student.examProgress.find((p) => p.examId.toString() === examId.toString()))
    .filter((p) => p && p.status === 'completed')
    .map((p) => p.percentage || 0);

  const totalAttempts = percentages.length;
  const averageScore =
    totalAttempts > 0 ? percentages.reduce((a, b) => a + b, 0) / totalAttempts : 0;
  const passRate = percentages.filter((p) => p >= 50).length;

  await Exam.findByIdAndUpdate(examId, {
    statistics: {
      totalAttempts,
      averageScore,
      passRate
    }
  });
};

const scoringRelevantChanges = (oldQuestions, newQuestions) => {
  if (!oldQuestions?.length && !newQuestions?.length) return false;
  if (oldQuestions.length !== newQuestions.length) return true;

  for (let i = 0; i < newQuestions.length; i += 1) {
    const newQ = newQuestions[i];
    const oldQ = newQ._id
      ? oldQuestions.find((q) => q._id?.toString() === newQ._id.toString())
      : oldQuestions[i];

    if (!oldQ || oldQ.correctAnswer !== newQ.correctAnswer) {
      return true;
    }
  }

  return false;
};

const recalculateExamScores = async (examId) => {
  const exam = await Exam.findById(examId);
  if (!exam) {
    return { updated: 0 };
  }

  const students = await User.find({
    role: 'student',
    examProgress: { $elemMatch: { examId, status: 'completed' } }
  });

  let updated = 0;

  for (const student of students) {
    const progress = student.examProgress.find((p) => p.examId.toString() === examId.toString());
    if (!progress || progress.status !== 'completed') continue;

    const wrongQuestions = regradeProgress(progress, exam.questions);
    progress.reviewExamId = await syncReviewExam(
      student._id,
      exam,
      wrongQuestions,
      progress.reviewExamId
    );

    recomputeStudentTotals(student);
    await student.save();
    updated += 1;
  }

  await recomputeExamStatistics(examId);

  console.log(`✅ Recalculated scores for ${updated} student(s) on exam ${examId}`);
  return { updated };
};

module.exports = {
  recalculateExamScores,
  scoringRelevantChanges
};
