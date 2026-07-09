const PREFIX = 'qudrat-exam-session';

const getKey = (examId) => `${PREFIX}-${examId}`;

export const loadExamSession = (examId) => {
  try {
    const raw = localStorage.getItem(getKey(examId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveExamSession = (examId, session) => {
  try {
    localStorage.setItem(getKey(examId), JSON.stringify(session));
  } catch {
    // ignore quota errors
  }
};

export const clearExamSession = (examId) => {
  try {
    localStorage.removeItem(getKey(examId));
  } catch {
    // ignore
  }
};

export const restoreShuffledQuestions = (questions, shuffledQuestionIds) => {
  if (!Array.isArray(shuffledQuestionIds) || shuffledQuestionIds.length === 0) {
    return null;
  }
  const byId = new Map(questions.map((q) => [q._id.toString(), q]));
  const restored = shuffledQuestionIds
    .map((id) => byId.get(id.toString()))
    .filter(Boolean);
  return restored.length === questions.length ? restored : null;
};

export const buildQuestionOrder = (originalQuestions, shuffledQuestions) =>
  originalQuestions.map((originalQuestion) =>
    shuffledQuestions.findIndex((q) => q._id === originalQuestion._id)
  );
