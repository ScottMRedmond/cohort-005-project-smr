import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb, type TestDb } from "~/test/setup";
import * as schema from "~/db/schema";
import { CourseStatus, UserRole } from "~/db/schema";
import { markdown } from "~/lib/text";
import { createLanding } from "../index.server";

let db: TestDb;
let instructorId: number;
let categoryId: number;

// ─── Fixtures ───
// No module writes courses, modules or lessons yet, so rows go in directly.
// Kept in one place so a schema change touches only this block.

let day = 0;

function addCategory(name: string) {
  return db
    .insert(schema.categories)
    .values({ name, slug: name.toLowerCase() })
    .returning()
    .get().id;
}

function addCourse(title: string, status = CourseStatus.Published) {
  day += 1;
  return db
    .insert(schema.courses)
    .values({
      title,
      slug: title.toLowerCase().replaceAll(" ", "-"),
      description: `About ${title}`,
      salesCopy: markdown(`## ${title}`),
      instructorId,
      categoryId,
      status,
      createdAt: `2026-01-${String(day).padStart(2, "0")}T00:00:00.000Z`,
    })
    .returning()
    .get();
}

function addLessons(courseId: number, perModule: number[]) {
  perModule.forEach((lessonCount, position) => {
    const moduleId = db
      .insert(schema.modules)
      .values({ courseId, title: `Module ${position}`, position })
      .returning()
      .get().id;
    for (let i = 0; i < lessonCount; i++) {
      db.insert(schema.lessons)
        .values({ moduleId, title: `Lesson ${i}`, position: i })
        .run();
    }
  });
}

beforeEach(() => {
  db = createTestDb();
  day = 0;
  instructorId = db
    .insert(schema.users)
    .values({
      name: "Ada Instructor",
      email: "ada@example.com",
      role: UserRole.Instructor,
    })
    .returning()
    .get().id;
  categoryId = addCategory("Programming");
});

describe("landing.get", () => {
  it("is empty, with zero counts, for an empty catalogue", () => {
    const page = createLanding(db).get();

    expect(page).toEqual({
      spotlight: null,
      featured: [],
      stats: { courses: 0, categories: 1, lessons: 0 },
    });
  });

  it("puts the newest published course in the spotlight and the next three in featured", () => {
    const titles = ["One", "Two", "Three", "Four", "Five"];
    for (const title of titles) addCourse(title);

    const page = createLanding(db).get();

    expect(page.spotlight?.title).toBe("Five");
    expect(page.featured.map((course) => course.title)).toEqual([
      "Four",
      "Three",
      "Two",
    ]);
  });

  it("features only the courses there are after the spotlight", () => {
    addCourse("Old");
    addCourse("New");

    const page = createLanding(db).get();

    expect(page.spotlight?.title).toBe("New");
    expect(page.featured.map((course) => course.title)).toEqual(["Old"]);
  });

  it("describes each course with its instructor, category and lesson count", () => {
    const course = addCourse("Rust");
    addLessons(course.id, [2, 3]);

    const { spotlight } = createLanding(db).get();

    expect(spotlight).toEqual({
      id: course.id,
      title: "Rust",
      slug: "rust",
      description: "About Rust",
      coverImageUrl: null,
      instructorName: "Ada Instructor",
      categoryName: "Programming",
      lessonCount: 5,
    });
  });

  it("counts each course's lessons separately", () => {
    const older = addCourse("Older");
    const newer = addCourse("Newer");
    addCourse("Empty");
    addLessons(older.id, [1]);
    addLessons(newer.id, [4, 2]);

    const page = createLanding(db).get();

    expect(page.spotlight).toMatchObject({ title: "Empty", lessonCount: 0 });
    expect(
      page.featured.map(({ title, lessonCount }) => ({ title, lessonCount }))
    ).toEqual([
      { title: "Newer", lessonCount: 6 },
      { title: "Older", lessonCount: 1 },
    ]);
  });

  it("leaves drafts and archived courses out of the courses and the counts", () => {
    const published = addCourse("Published");
    const draft = addCourse("Draft", CourseStatus.Draft);
    const archived = addCourse("Archived", CourseStatus.Archived);
    addLessons(published.id, [3]);
    addLessons(draft.id, [5]);
    addLessons(archived.id, [7]);

    const page = createLanding(db).get();

    expect(page.spotlight?.title).toBe("Published");
    expect(page.featured).toEqual([]);
    expect(page.stats).toEqual({ courses: 1, categories: 1, lessons: 3 });
  });

  it("counts every published course and every category, past the four it shows", () => {
    addCategory("Design");
    for (let i = 0; i < 6; i++) addCourse(`Course ${i}`);

    const { stats } = createLanding(db).get();

    expect(stats.courses).toBe(6);
    expect(stats.categories).toBe(2);
  });

  it("breaks a tie on creation time by the later id", () => {
    const first = addCourse("First");
    day -= 1;
    addCourse("Second");

    const page = createLanding(db).get();

    expect(page.spotlight?.title).toBe("Second");
    expect(page.featured[0]?.id).toBe(first.id);
  });
});
