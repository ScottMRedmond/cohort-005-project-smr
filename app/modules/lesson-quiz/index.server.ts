import type { Db } from "./lib/db";
import {
  getBestAttempt,
  getOptions,
  getQuestions,
  getQuizByLessonId,
} from "./lib/quiz.server";
import { scoreQuiz, type QuizResult } from "./lib/score.server";

export type { Db, QuizResult };

export type LearnerQuiz = {
  id: number;
  title: string;
  passingScore: number;
  questions: Array<{
    id: number;
    questionText: string;
    questionType: string;
    position: number;
    options: Array<{ id: number; optionText: string }>;
  }>;
};

/**
 * The lesson's quiz as a learner may see it — options without which one is
 * correct — and the learner's best attempt so far.
 */
export function getQuizForLearner(
  db: Db,
  lessonId: number,
  userId: number | null
): {
  quiz: LearnerQuiz | null;
  bestAttempt: { score: number; passed: boolean } | null;
} {
  const quiz = getQuizByLessonId(db, lessonId);
  if (!quiz) return { quiz: null, bestAttempt: null };

  const questions = getQuestions(db, quiz.id);
  const options = getOptions(
    db,
    questions.map((q) => q.id)
  );

  return {
    quiz: {
      id: quiz.id,
      title: quiz.title,
      passingScore: quiz.passingScore,
      questions: questions.map((q) => ({
        id: q.id,
        questionText: q.questionText,
        questionType: q.questionType,
        position: q.position,
        options: options
          .filter((o) => o.questionId === q.id)
          .map((o) => ({ id: o.id, optionText: o.optionText })),
      })),
    },
    bestAttempt:
      userId === null ? null : (getBestAttempt(db, userId, quiz.id) ?? null),
  };
}

/**
 * Score a learner's answers, keyed by question id, and record the attempt.
 * Null when the quiz is not on this lesson, so an id from elsewhere can't be
 * reached through this lesson.
 */
export function submitQuiz(
  db: Db,
  submission: {
    userId: number;
    lessonId: number;
    quizId: number;
    answers: Record<number, number>;
  }
): QuizResult | null {
  return scoreQuiz(db, submission);
}

/** Answers from form fields named `question-{questionId}` = optionId. */
export function readQuizAnswers(
  entries: Iterable<[string, unknown]>
): Record<number, number> {
  const answers: Record<number, number> = {};
  for (const [key, value] of entries) {
    if (!key.startsWith("question-")) continue;
    const questionId = Number(key.replace("question-", ""));
    const optionId = Number(value);
    if (!isNaN(questionId) && !isNaN(optionId)) {
      answers[questionId] = optionId;
    }
  }
  return answers;
}
