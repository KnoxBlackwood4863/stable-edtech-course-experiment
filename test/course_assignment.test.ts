import { describe, expect, it } from "vitest";
import { assignCourse, stableBucket } from "../src/course_assignment.js";

describe("course experiment assignment", () => {
  it("keeps a learner in one variant and applies that variant's deadline", () => {
    const input = {
      learnerId: "learner-17",
      courseId: "algebra-1",
      enrolledAt: "2026-01-01T00:00:00.000Z"
    };
    const percentage = stableBucket(input.learnerId, input.courseId) + 1;

    const first = assignCourse(input, percentage, new Date("2026-01-20T00:00:00.000Z"));
    const second = assignCourse(input, percentage, new Date("2026-01-20T00:00:00.000Z"));

    expect(first.variant).toBe("guided");
    expect(second.variant).toBe(first.variant);
    expect(first.deadline).toBe("2026-01-15T00:00:00.000Z");
    expect(first.overdue).toBe(true);
  });
});
