import { createTestDb, seedBaseData, type TestDb } from "~/test/setup";
import * as schema from "~/db/schema";
import { markdown } from "~/lib/text";

export function seedCourseWithLessons(db: TestDb, courseId: number) {
  const module = db
    .insert(schema.modules)
    .values({ courseId, title: "Basics", position: 1 })
    .returning()
    .get();

  return [1, 2].map(
    (position) =>
      db
        .insert(schema.lessons)
        .values({ moduleId: module.id, title: `Lesson ${position}`, position })
        .returning()
        .get().id
  );
}

export function setUp() {
  const db = createTestDb();
  const base = seedBaseData(db);
  const lessonIds = seedCourseWithLessons(db, base.course.id);

  const otherCourse = db
    .insert(schema.courses)
    .values({
      title: "Other",
      slug: "other",
      description: "Another course",
      salesCopy: markdown("Other"),
      status: schema.CourseStatus.Published,
      instructorId: base.instructor.id,
      categoryId: base.category.id,
    })
    .returning()
    .get();
  const otherLessonIds = seedCourseWithLessons(db, otherCourse.id);

  return { db, base, lessonIds, otherLessonIds, otherCourse };
}

export function watched(
  db: TestDb,
  event: {
    userId: number;
    lessonId: number;
    positionSeconds: number;
    createdAt: string;
  }
) {
  db.insert(schema.videoWatchEvents)
    .values({ ...event, eventType: "pause" })
    .run();
}

/** A progress row left at not started, as older data can have. */
export function notStarted(
  db: TestDb,
  learner: { userId: number; lessonId: number }
) {
  db.insert(schema.lessonProgress)
    .values({ ...learner, status: schema.LessonProgressStatus.NotStarted })
    .run();
}
