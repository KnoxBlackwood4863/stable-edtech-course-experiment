import { assignCourse, educatorReport } from "./course_assignment.js";

const now = new Date("2026-02-01T00:00:00.000Z");
const assignments = ["learner-17", "learner-42"].map((learnerId) =>
  assignCourse(
    { learnerId, courseId: "algebra-1", enrolledAt: "2026-01-01T00:00:00.000Z" },
    50,
    now
  )
);

console.log(JSON.stringify({ assignments, report: educatorReport(assignments) }, null, 2));
