import { eq } from "drizzle-orm";
import { quizAnswers, quizAttempts, quizzes } from "~/db/schema";
import type { Db } from "./db";
import { getOptions, getQuestions } from "./quiz.server";

export type QuestionResult = {
  questionId: number;
  correct: boolean;
  selectedOptionId: number | null;
  correctOptionId: number | null;
};

export type QuizResult = {
  attemptId: number;
  score: number;
  passed: boolean;
  grade: string;
  totalCorrect: number;
  totalQuestions: number;
  questionResults: QuestionResult[];
};

export function calculateGrade(score: number): string {
  if (score >= 0.9) return "A";
  if (score >= 0.8) return "B";
  if (score >= 0.7) return "C";
  if (score >= 0.6) return "D";
  return "F";
}

type Submission = {
  userId: number;
  lessonId: number;
  quizId: number;
  answers: Record<number, number>;
};

function markAnswers(
  db: Db,
  quizId: number,
  answers: Record<number, number>
): QuestionResult[] {
  const questions = getQuestions(db, quizId);
  const options = getOptions(
    db,
    questions.map((q) => q.id)
  );

  return questions.map((question) => {
    const selected = answers[question.id];
    if (!selected) {
      return {
        questionId: question.id,
        correct: false,
        selectedOptionId: null,
        correctOptionId: null,
      };
    }
    const correctOptionId =
      options.find((o) => o.questionId === question.id && o.isCorrect)?.id ??
      null;
    return {
      questionId: question.id,
      correct: selected === correctOptionId,
      selectedOptionId: selected,
      correctOptionId,
    };
  });
}

function recordAttempt(
  db: Db,
  attempt: { userId: number; quizId: number; score: number; passed: boolean },
  questionResults: QuestionResult[]
): number {
  return db.transaction((tx) => {
    const { id } = tx
      .insert(quizAttempts)
      .values(attempt)
      .returning({ id: quizAttempts.id })
      .get();
    for (const result of questionResults) {
      if (result.selectedOptionId === null) continue;
      tx.insert(quizAnswers)
        .values({
          attemptId: id,
          questionId: result.questionId,
          selectedOptionId: result.selectedOptionId,
        })
        .run();
    }
    return id;
  });
}

export function scoreQuiz(db: Db, submission: Submission): QuizResult | null {
  const { userId, quizId } = submission;
  const quiz = db.select().from(quizzes).where(eq(quizzes.id, quizId)).get();
  if (!quiz || quiz.lessonId !== submission.lessonId) return null;

  const questionResults = markAnswers(db, quizId, submission.answers);
  const totalCorrect = questionResults.filter((r) => r.correct).length;
  const totalQuestions = questionResults.length;
  const score = totalQuestions > 0 ? totalCorrect / totalQuestions : 0;
  // The pass mark is a fixed 70%, not the quiz's own passingScore. That is how
  // it worked before this moved here; changing it is its own decision.
  const passed = score > 0.7;

  return {
    attemptId: recordAttempt(
      db,
      { userId, quizId, score, passed },
      questionResults
    ),
    score,
    passed,
    grade: calculateGrade(score),
    totalCorrect,
    totalQuestions,
    questionResults,
  };
}
