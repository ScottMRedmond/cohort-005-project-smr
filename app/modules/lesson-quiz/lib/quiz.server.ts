import { and, desc, eq, inArray } from "drizzle-orm";
import { quizAttempts, quizOptions, quizQuestions, quizzes } from "~/db/schema";
import type { Db } from "./db";

export function getQuizByLessonId(db: Db, lessonId: number) {
  return db.select().from(quizzes).where(eq(quizzes.lessonId, lessonId)).get();
}

export function getQuestions(db: Db, quizId: number) {
  return db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quizId))
    .orderBy(quizQuestions.position)
    .all();
}

export function getOptions(db: Db, questionIds: number[]) {
  return db
    .select()
    .from(quizOptions)
    .where(inArray(quizOptions.questionId, questionIds))
    .orderBy(quizOptions.id)
    .all();
}

export function getBestAttempt(db: Db, userId: number, quizId: number) {
  return db
    .select({ score: quizAttempts.score, passed: quizAttempts.passed })
    .from(quizAttempts)
    .where(
      and(eq(quizAttempts.userId, userId), eq(quizAttempts.quizId, quizId))
    )
    .orderBy(desc(quizAttempts.score))
    .limit(1)
    .get();
}
