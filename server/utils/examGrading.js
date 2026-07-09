const findQuestionForAnswer = (questions, answer, index) => {
  if (answer?.questionId) {
    const byId = questions.find((q) => q._id.toString() === answer.questionId.toString());
    if (byId) return byId;
  }
  return questions[index] || null;
};

const gradeAnswersByQuestionId = (questions, answers) => {
  const answersByQuestionId = new Map();

  for (let i = 0; i < (answers || []).length; i += 1) {
    const answer = answers[i];
    const question = findQuestionForAnswer(questions, answer, i);
    if (question) {
      answersByQuestionId.set(question._id.toString(), answer);
    }
  }

  let correctAnswers = 0;
  const detailedAnswers = [];
  const wrongQuestions = [];

  for (const question of questions) {
    const answer = answersByQuestionId.get(question._id.toString());
    const selectedAnswer = answer?.selectedAnswer ?? null;
    const isCorrect =
      selectedAnswer != null && selectedAnswer === question.correctAnswer;

    if (isCorrect) {
      correctAnswers += 1;
    } else {
      wrongQuestions.push(question._id);
    }

    detailedAnswers.push({
      questionId: question._id,
      selectedAnswer,
      isCorrect
    });
  }

  return { correctAnswers, detailedAnswers, wrongQuestions };
};

const stripQuestionsForStudent = (questions) =>
  (questions || []).map((q) => {
    const plain = q.toObject ? q.toObject() : { ...q };
    const { correctAnswer, explanation, ...rest } = plain;
    return rest;
  });

const stripExamForStudent = (exam) => {
  const examObj = exam.toObject ? exam.toObject() : { ...exam };
  if (examObj.questions) {
    examObj.questions = stripQuestionsForStudent(examObj.questions);
  }
  return examObj;
};

module.exports = {
  findQuestionForAnswer,
  gradeAnswersByQuestionId,
  stripQuestionsForStudent,
  stripExamForStudent
};
