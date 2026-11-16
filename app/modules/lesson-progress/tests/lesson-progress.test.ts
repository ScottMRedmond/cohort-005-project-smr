import { beforeEach, describe, expect, it } from "vitest";
import { LessonProgressStatus } from "~/db/schema";
import {
  completeLesson,
  lessonStatus,
  recordLessonVisit,
} from "../index.server";
import { notStarted, setUp, watched } from "./fixtures";

const NOW = new Date("2026-10-06T12:00:00.000Z");

let seeded: ReturnType<typeof setUp>;
let userId: number;
let courseId: number;

beforeEach(() => {
  seeded = setUp();
  userId = seeded.base.user.id;
  courseId = seeded.base.course.id;
});

function visit(lessonId: number, video?: { durationMinutes: number | null }) {
  return recordLessonVisit(seeded.db, {
    userId,
    courseId,
    lessonId,
    hasVideo: video !== undefined,
    durationMinutes: video?.durationMinutes ?? null,
  });
}

describe("recordLessonVisit", () => {
  it("marks a first visit in progress", () => {
    const result = visit(seeded.lessonIds[0]);
    expect(result.lessonStatus).toBe(LessonProgressStatus.InProgress);
    expect(lessonStatus(seeded.db, userId, seeded.lessonIds[0])).toEqual({
      status: LessonProgressStatus.InProgress,
      completedAt: null,
    });
  });

  it("keeps a completed lesson completed", () => {
    completeLesson(seeded.db, { userId, lessonId: seeded.lessonIds[0] }, NOW);
    const result = visit(seeded.lessonIds[0]);
    expect(result.lessonStatus).toBe(LessonProgressStatus.Completed);
    expect(result.lessonProgressMap).toEqual({
      [seeded.lessonIds[0]]: LessonProgressStatus.Completed,
    });
  });

  it("moves a not-started lesson to in progress, without a second row", () => {
    notStarted(seeded.db, { userId, lessonId: seeded.lessonIds[0] });
    const result = visit(seeded.lessonIds[0]);
    expect(result.lessonStatus).toBe(LessonProgressStatus.InProgress);
    expect(lessonStatus(seeded.db, userId, seeded.lessonIds[0])).toEqual({
      status: LessonProgressStatus.InProgress,
      completedAt: null,
    });
    expect(result.lessonProgressMap).toEqual({
      [seeded.lessonIds[0]]: LessonProgressStatus.InProgress,
    });
  });

  it("maps progress for this course's lessons only", () => {
    completeLesson(seeded.db, { userId, lessonId: seeded.lessonIds[0] }, NOW);
    completeLesson(
      seeded.db,
      { userId, lessonId: seeded.otherLessonIds[0] },
      NOW
    );
    completeLesson(
      seeded.db,
      { userId: seeded.base.instructor.id, lessonId: seeded.lessonIds[1] },
      NOW
    );

    expect(visit(seeded.lessonIds[1]).lessonProgressMap).toEqual({
      [seeded.lessonIds[0]]: LessonProgressStatus.Completed,
      [seeded.lessonIds[1]]: LessonProgressStatus.InProgress,
    });
  });

  it("reports no video position or progress for a lesson without video", () => {
    watched(seeded.db, {
      userId,
      lessonId: seeded.lessonIds[0],
      positionSeconds: 30,
      createdAt: "2026-10-06T10:00:00Z",
    });
    const result = visit(seeded.lessonIds[0]);
    expect(result.lastWatchPosition).toBe(0);
    expect(result.watchProgress).toBe(0);
  });

  it("resumes from the latest position, not the furthest", () => {
    watched(seeded.db, {
      userId,
      lessonId: seeded.lessonIds[0],
      positionSeconds: 90,
      createdAt: "2026-10-06T10:00:00Z",
    });
    watched(seeded.db, {
      userId,
      lessonId: seeded.lessonIds[0],
      positionSeconds: 40,
      createdAt: "2026-10-06T11:00:00Z",
    });
    watched(seeded.db, {
      userId,
      lessonId: seeded.lessonIds[1],
      positionSeconds: 10,
      createdAt: "2026-10-06T11:30:00Z",
    });
    watched(seeded.db, {
      userId: seeded.base.instructor.id,
      lessonId: seeded.lessonIds[0],
      positionSeconds: 5,
      createdAt: "2026-10-06T11:45:00Z",
    });

    expect(
      visit(seeded.lessonIds[0], { durationMinutes: 2 }).lastWatchPosition
    ).toBe(40);
  });

  it("starts at zero with no watch events", () => {
    const result = visit(seeded.lessonIds[0], { durationMinutes: 2 });
    expect(result.lastWatchPosition).toBe(0);
    expect(result.watchProgress).toBe(0);
  });

  it("rounds the furthest position to a percentage of the video", () => {
    watched(seeded.db, {
      userId,
      lessonId: seeded.lessonIds[0],
      positionSeconds: 61,
      createdAt: "2026-10-06T10:00:00Z",
    });
    watched(seeded.db, {
      userId,
      lessonId: seeded.lessonIds[0],
      positionSeconds: 20,
      createdAt: "2026-10-06T11:00:00Z",
    });
    watched(seeded.db, {
      userId: seeded.base.instructor.id,
      lessonId: seeded.lessonIds[0],
      positionSeconds: 119,
      createdAt: "2026-10-06T11:00:00Z",
    });
    watched(seeded.db, {
      userId,
      lessonId: seeded.lessonIds[1],
      positionSeconds: 119,
      createdAt: "2026-10-06T11:00:00Z",
    });

    // 61 of 120 seconds is 50.8%
    expect(
      visit(seeded.lessonIds[0], { durationMinutes: 2 }).watchProgress
    ).toBe(51);
  });

  it("caps progress at 100", () => {
    watched(seeded.db, {
      userId,
      lessonId: seeded.lessonIds[0],
      positionSeconds: 500,
      createdAt: "2026-10-06T10:00:00Z",
    });
    expect(
      visit(seeded.lessonIds[0], { durationMinutes: 2 }).watchProgress
    ).toBe(100);
  });

  it("reports no progress when the video has no duration", () => {
    watched(seeded.db, {
      userId,
      lessonId: seeded.lessonIds[0],
      positionSeconds: 60,
      createdAt: "2026-10-06T10:00:00Z",
    });
    for (const durationMinutes of [null, 0]) {
      const result = visit(seeded.lessonIds[0], { durationMinutes });
      expect(result.watchProgress).toBe(0);
      expect(result.lastWatchPosition).toBe(60);
    }
  });
});

describe("completeLesson", () => {
  it("records completion time for a lesson never visited", () => {
    completeLesson(seeded.db, { userId, lessonId: seeded.lessonIds[0] }, NOW);
    expect(lessonStatus(seeded.db, userId, seeded.lessonIds[0])).toEqual({
      status: LessonProgressStatus.Completed,
      completedAt: NOW.toISOString(),
    });
  });

  it("completes a lesson already in progress, without a second row", () => {
    visit(seeded.lessonIds[0]);
    completeLesson(seeded.db, { userId, lessonId: seeded.lessonIds[0] }, NOW);
    expect(lessonStatus(seeded.db, userId, seeded.lessonIds[0])).toEqual({
      status: LessonProgressStatus.Completed,
      completedAt: NOW.toISOString(),
    });
    expect(visit(seeded.lessonIds[1]).lessonProgressMap).toEqual({
      [seeded.lessonIds[0]]: LessonProgressStatus.Completed,
      [seeded.lessonIds[1]]: LessonProgressStatus.InProgress,
    });
  });

  it("only touches the given learner and lesson", () => {
    completeLesson(seeded.db, { userId, lessonId: seeded.lessonIds[0] }, NOW);
    expect(lessonStatus(seeded.db, userId, seeded.lessonIds[1])).toBeNull();
    expect(
      lessonStatus(seeded.db, seeded.base.instructor.id, seeded.lessonIds[0])
    ).toBeNull();
  });
});
