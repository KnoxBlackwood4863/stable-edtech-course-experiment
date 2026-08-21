import { createHash } from "node:crypto";
import { z } from "zod";

export const assignmentRequestSchema = z.object({
  learnerId: z.string().min(1),
  courseId: z.string().min(1),
  enrolledAt: z.string().datetime(),
  completedAt: z.string().datetime().optional()
});

export type AssignmentRequest = z.infer<typeof assignmentRequestSchema>;
export type ExperimentVariant = "control" | "guided";

export type CourseAssignment = AssignmentRequest & {
  variant: ExperimentVariant;
  deadline: string;
  overdue: boolean;
};

export function stableBucket(learnerId: string, courseId: string): number {
  const digest = createHash("sha256")
    .update(`${courseId}:${learnerId}`)
    .digest();
  return digest.readUInt32BE(0) % 100;
}

export function assignCourse(
  input: AssignmentRequest,
  guidedPercent: number,
  now = new Date()
): CourseAssignment {
  const parsed = assignmentRequestSchema.parse(input);
  const percentage = z.number().int().min(0).max(100).parse(guidedPercent);
  const variant: ExperimentVariant =
    stableBucket(parsed.learnerId, parsed.courseId) < percentage ? "guided" : "control";
  const daysToComplete = variant === "guided" ? 14 : 21;
  const deadlineDate = new Date(parsed.enrolledAt);
  deadlineDate.setUTCDate(deadlineDate.getUTCDate() + daysToComplete);
  const completionDate = parsed.completedAt ? new Date(parsed.completedAt) : now;

  return {
    ...parsed,
    variant,
    deadline: deadlineDate.toISOString(),
    overdue: completionDate > deadlineDate
  };
}

export function educatorReport(assignments: CourseAssignment[]) {
  return assignments.reduce(
    (report, assignment) => {
      report[assignment.variant].learners += 1;
      if (assignment.overdue) report[assignment.variant].overdue += 1;
      return report;
    },
    {
      control: { learners: 0, overdue: 0 },
      guided: { learners: 0, overdue: 0 }
    }
  );
}
