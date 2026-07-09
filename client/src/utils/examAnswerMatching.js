/**
 * Match stored student answers to exam questions.
 * Always prefer questionId — positional index breaks after exam edits/reorders.
 */

export const findAnswerForQuestion = (answers, question, index = null) => {
  if (!Array.isArray(answers) || answers.length === 0) return null;

  if (question?._id) {
    const questionId = question._id.toString();
    const byId = answers.find(
      (a) => a?.questionId && a.questionId.toString() === questionId
    );
    if (byId) return byId;
  }

  if (index != null && index >= 0 && index < answers.length) {
    return answers[index] || null;
  }

  return null;
};

export const getAnswerStatus = (answer, question) => {
  if (!answer?.selectedAnswer || answer.selectedAnswer.trim() === '') {
    return 'unanswered';
  }

  if (typeof answer.isCorrect === 'boolean') {
    return answer.isCorrect ? 'correct' : 'wrong';
  }

  if (question?.correctAnswer) {
    return answer.selectedAnswer === question.correctAnswer ? 'correct' : 'wrong';
  }

  return 'wrong';
};

export const alignAnswersToQuestions = (questions, answers) => {
  return (questions || []).map((question, index) => {
    const answer = findAnswerForQuestion(answers, question, index);
    const selectedAnswer = answer?.selectedAnswer ?? null;
    const isCorrect =
      answer != null
        ? typeof answer.isCorrect === 'boolean'
          ? answer.isCorrect
          : selectedAnswer === question?.correctAnswer
        : false;

    return { selectedAnswer, isCorrect };
  });
};
