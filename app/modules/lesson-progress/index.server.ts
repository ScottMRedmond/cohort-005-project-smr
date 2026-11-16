import type { Db } from "./lib/db";
import {
  getLessonProgress,
  getProgressMapForCourse,
  markLessonComplete,
  markLessonInProgress,
} from "./lib/progress.server";
import { getLastWatchPosition, getWatchPercent } from "./lib/watch.server";

export type { Db };

export type LessonVisit = {
  lessonStatus: string | null;
  /** Status of every lesson in the course the learner has started. */
  lessonProgressMap: Record<number, string>;
  /** Seconds into the video to resume from. */
  lastWatchPosition: number;
  /** Furthest point reached, 0–100. */
  watchProgress: number;
};

/**
 * A learner opened a lesson: mark it in progress (a completed lesson stays
 * completed) and return what the page needs to show their progress.
 */
export function recordLessonVisit(
  db: Db,
  visit: {
    userId: number;
    courseId: number;
    lessonId: number;
    hasVideo: boolean;
    durationMinutes: number | null;
  }
): LessonVisit {
  const { userId, courseId, lessonId } = visit;

  const videoDurationSeconds = (visit.durationMinutes ?? 0) * 60;

  return {
    lessonStatus: markLessonInProgress(db, userId, lessonId),
    lessonProgressMap: getProgressMapForCourse(db, userId, courseId),
    lastWatchPosition: visit.hasVideo
      ? getLastWatchPosition(db, userId, lessonId)
      : 0,
    watchProgress:
      visit.hasVideo && videoDurationSeconds > 0
        ? getWatchPercent(db, { userId, lessonId }, videoDurationSeconds)
        : 0,
  };
}

/** Mark the lesson completed for the learner at `now`. */
export function completeLesson(
  db: Db,
  learner: { userId: number; lessonId: number },
  now: Date
): void {
  markLessonComplete(db, learner, now);
}

/** The learner's progress row for the lesson, if they have one. */
export function lessonStatus(
  db: Db,
  userId: number,
  lessonId: number
): { status: string; completedAt: string | null } | null {
  const progress = getLessonProgress(db, userId, lessonId);
  return progress
    ? { status: progress.status, completedAt: progress.completedAt }
    : null;
}
