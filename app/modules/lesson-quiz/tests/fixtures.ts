import { createTestDb, seedBaseData, type TestDb } from "~/test/setup";
import * as schema from "~/db/schema";
import { QuestionType } from "~/db/schema";

function addLesson(db: TestDb, moduleId: number, position: number) {
  return db
    .insert(schema.lessons)
    .values({ moduleId, title: `Lesson ${position}`, position })
    .returning()
    .get().id;
}

function addQuestion(
  db: TestDb,
  quizId: number,
  {
    position,
    questionType,
    options,
  }: {
    position: number;
    questionType: QuestionType;
    options: Array<[string, boolean]>;
  }
) {
  const question = db
    .insert(schema.quizQuestions)
    .values({ quizId, questionText: `Q${position}`, questionType, position })
    .returning()
    .get();
  const optionIds = options.map(
    ([optionText, isCorrect]) =>
      db
        .insert(schema.quizOptions)
        .values({ questionId: question.id, optionText, isCorrect })
        .returning()
        .get().id
  );
  return { id: question.id, optionIds };
}

/** Four questions inserted out of position order; option 0 is right. */
function addCheckInQuestions(db: TestDb, quizId: number) {
  const mc = QuestionType.MultipleChoice;
  const tf = QuestionType.TrueFalse;
  const q2 = addQuestion(db, quizId, {
    position: 2,
    questionType: tf,
    options: [
      ["True", true],
      ["False", false],
    ],
  });
  const q1 = addQuestion(db, quizId, {
    position: 1,
    questionType: mc,
    options: [
      ["A", true],
      ["B", false],
      ["C", false],
    ],
  });
  const q3 = addQuestion(db, quizId, {
    position: 3,
    questionType: mc,
    options: [
      ["X", true],
      ["Y", false],
    ],
  });
  const q4 = addQuestion(db, quizId, {
    position: 4,
    questionType: tf,
    options: [
      ["True", true],
      ["False", false],
    ],
  });

  return [q1, q2, q3, q4];
}

/**
 * A lesson with a quiz of four questions, inserted out of position order, plus
 * a second lesson with no quiz. Option 0 of every question is the right one.
 */
export function setUp() {
  const db = createTestDb();
  const base = seedBaseData(db);
  const module = db
    .insert(schema.modules)
    .values({ courseId: base.course.id, title: "Basics", position: 1 })
    .returning()
    .get();
  const lessonId = addLesson(db, module.id, 1);
  const bareLessonId = addLesson(db, module.id, 2);

  const quiz = db
    .insert(schema.quizzes)
    .values({ lessonId, title: "Check-in", passingScore: 0.8 })
    .returning()
    .get();

  const questions = addCheckInQuestions(db, quiz.id);

  return {
    db,
    userId: base.user.id,
    otherUserId: base.instructor.id,
    lessonId,
    bareLessonId,
    quiz,
    questions,
  };
}

/**
 * A quiz of `count` true/false questions on the lesson. Option 0 is right,
 * unless `withCorrectOption` is false, when neither option is.
 */
export function addQuiz(
  db: TestDb,
  lessonId: number,
  {
    count,
    withCorrectOption = true,
  }: { count: number; withCorrectOption?: boolean }
) {
  const quiz = db
    .insert(schema.quizzes)
    .values({ lessonId, title: `Quiz of ${count}`, passingScore: 0.5 })
    .returning()
    .get();
  const questions = Array.from({ length: count }, (_, i) =>
    addQuestion(db, quiz.id, {
      position: i + 1,
      questionType: QuestionType.TrueFalse,
      options: [
        ["True", withCorrectOption],
        ["False", false],
      ],
    })
  );
  return { quizId: quiz.id, questions };
}
