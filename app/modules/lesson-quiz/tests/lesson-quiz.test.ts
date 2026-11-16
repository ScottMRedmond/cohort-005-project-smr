import { beforeEach, describe, expect, it } from "vitest";
import {
  getQuizForLearner,
  readQuizAnswers,
  submitQuiz,
} from "../index.server";
import * as schema from "~/db/schema";
import { addQuiz, setUp } from "./fixtures";

let seeded: ReturnType<typeof setUp>;

beforeEach(() => {
  seeded = setUp();
});

/** Answer question i with option `choice[i]`; undefined leaves it blank. */
function answer(choices: Array<number | undefined>, userId = seeded.userId) {
  const answers: Record<number, number> = {};
  choices.forEach((choice, i) => {
    if (choice !== undefined) {
      const q = seeded.questions[i];
      answers[q.id] = q.optionIds[choice];
    }
  });
  return submitQuiz(seeded.db, {
    userId,
    lessonId: seeded.lessonId,
    quizId: seeded.quiz.id,
    answers,
  });
}

describe("getQuizForLearner", () => {
  it("has no quiz for a lesson without one", () => {
    expect(
      getQuizForLearner(seeded.db, seeded.bareLessonId, seeded.userId)
    ).toEqual({
      quiz: null,
      bestAttempt: null,
    });
  });

  it("returns questions in position order, without the answers", () => {
    const { quiz } = getQuizForLearner(
      seeded.db,
      seeded.lessonId,
      seeded.userId
    );
    const [q1] = seeded.questions;
    expect(quiz).toMatchObject({
      id: seeded.quiz.id,
      title: "Check-in",
      passingScore: 0.8,
    });
    expect(quiz?.questions.map((q) => q.id)).toEqual(
      seeded.questions.map((q) => q.id)
    );
    expect(quiz?.questions[0]).toEqual({
      id: q1.id,
      questionText: "Q1",
      questionType: "multiple_choice",
      position: 1,
      options: [
        { id: q1.optionIds[0], optionText: "A" },
        { id: q1.optionIds[1], optionText: "B" },
        { id: q1.optionIds[2], optionText: "C" },
      ],
    });
  });

  it("has no best attempt for a learner who has not tried, or a visitor", () => {
    expect(
      getQuizForLearner(seeded.db, seeded.lessonId, seeded.userId).bestAttempt
    ).toBeNull();
    answer([0, 0, 0, 0], seeded.otherUserId);
    expect(
      getQuizForLearner(seeded.db, seeded.lessonId, null).bestAttempt
    ).toBeNull();
    expect(
      getQuizForLearner(seeded.db, seeded.lessonId, seeded.userId).bestAttempt
    ).toBeNull();
  });

  it("reports the learner's highest-scoring attempt", () => {
    answer([0, 1, 1, 1]);
    answer([0, 0, 0, 0]);
    answer([1, 1, 1, 1]);
    expect(
      getQuizForLearner(seeded.db, seeded.lessonId, seeded.userId).bestAttempt
    ).toEqual({
      score: 1,
      passed: true,
    });
  });
});

describe("submitQuiz", () => {
  it("refuses a quiz that is not on this lesson", () => {
    expect(
      submitQuiz(seeded.db, {
        userId: seeded.userId,
        lessonId: seeded.bareLessonId,
        quizId: seeded.quiz.id,
        answers: {},
      })
    ).toBeNull();
    expect(
      submitQuiz(seeded.db, {
        userId: seeded.userId,
        lessonId: seeded.lessonId,
        quizId: seeded.quiz.id + 100,
        answers: {},
      })
    ).toBeNull();
  });

  it("marks each answer against the correct option, for both question types", () => {
    const [q1, q2, q3, q4] = seeded.questions;
    const result = answer([0, 1, undefined, 0]);
    expect(result?.questionResults).toEqual([
      {
        questionId: q1.id,
        correct: true,
        selectedOptionId: q1.optionIds[0],
        correctOptionId: q1.optionIds[0],
      },
      {
        questionId: q2.id,
        correct: false,
        selectedOptionId: q2.optionIds[1],
        correctOptionId: q2.optionIds[0],
      },
      {
        questionId: q3.id,
        correct: false,
        selectedOptionId: null,
        correctOptionId: null,
      },
      {
        questionId: q4.id,
        correct: true,
        selectedOptionId: q4.optionIds[0],
        correctOptionId: q4.optionIds[0],
      },
    ]);
    expect(result).toMatchObject({
      totalCorrect: 2,
      totalQuestions: 4,
      score: 0.5,
    });
  });

  it("records each answered question against the attempt", () => {
    const [q1, , , q4] = seeded.questions;
    const result = answer([0, undefined, undefined, 1]);
    const recorded = seeded.db
      .select()
      .from(schema.quizAnswers)
      .orderBy(schema.quizAnswers.id)
      .all();
    expect(recorded).toEqual([
      expect.objectContaining({
        attemptId: result?.attemptId,
        questionId: q1.id,
        selectedOptionId: q1.optionIds[0],
      }),
      expect.objectContaining({
        attemptId: result?.attemptId,
        questionId: q4.id,
        selectedOptionId: q4.optionIds[1],
      }),
    ]);
  });

  it("marks an answer wrong when the question has no correct option", () => {
    const { quizId, questions } = addQuiz(seeded.db, seeded.bareLessonId, {
      count: 1,
      withCorrectOption: false,
    });
    const [question] = questions;
    const result = submitQuiz(seeded.db, {
      userId: seeded.userId,
      lessonId: seeded.bareLessonId,
      quizId,
      answers: { [question.id]: question.optionIds[0] },
    });
    expect(result?.questionResults).toEqual([
      {
        questionId: question.id,
        correct: false,
        selectedOptionId: question.optionIds[0],
        correctOptionId: null,
      },
    ]);
  });

  it("records the attempt so it counts as the best one", () => {
    const result = answer([0, 0, 0, 1]);
    expect(result?.attemptId).toEqual(expect.any(Number));
    expect(
      getQuizForLearner(seeded.db, seeded.lessonId, seeded.userId).bestAttempt
    ).toEqual({
      score: 0.75,
      passed: true,
    });
  });

  it.each([
    { choices: [0, 0, 0, 0], score: 1, grade: "A", passed: true },
    { choices: [0, 0, 0, 1], score: 0.75, grade: "C", passed: true },
    { choices: [0, 0, 1, 1], score: 0.5, grade: "F", passed: false },
    { choices: [1, 1, 1, 1], score: 0, grade: "F", passed: false },
  ])("grades $choices as $grade", ({ choices, ...expected }) => {
    expect(answer(choices)).toMatchObject(expected);
  });

  it("scores a quiz with no questions as zero", () => {
    const { quizId } = addQuiz(seeded.db, seeded.bareLessonId, { count: 0 });
    expect(
      submitQuiz(seeded.db, {
        userId: seeded.userId,
        lessonId: seeded.bareLessonId,
        quizId,
        answers: {},
      })
    ).toMatchObject({ score: 0, totalQuestions: 0, passed: false, grade: "F" });
  });

  it.each([
    [10, "A", true],
    [9, "A", true],
    [8, "B", true],
    [7, "C", false],
    [6, "D", false],
    [5, "F", false],
  ] as const)("grades %i of 10 right as %s", (right, grade, passed) => {
    const { quizId, questions } = addQuiz(seeded.db, seeded.bareLessonId, {
      count: 10,
    });
    const answers = Object.fromEntries(
      questions.map((q, i) => [q.id, q.optionIds[i < right ? 0 : 1]])
    );
    expect(
      submitQuiz(seeded.db, {
        userId: seeded.userId,
        lessonId: seeded.bareLessonId,
        quizId,
        answers,
      })
    ).toMatchObject({ score: right / 10, grade, passed });
  });
});

describe("readQuizAnswers", () => {
  it("keeps question fields with numeric ids and values", () => {
    expect(
      readQuizAnswers([
        ["intent", "submit-quiz"],
        ["quizId", "3"],
        ["question-7", "21"],
        ["question-8", "x"],
        ["question-y", "4"],
        ["question-9", "22"],
        ["5", "6"],
      ])
    ).toEqual({ 7: 21, 9: 22 });
  });
});
