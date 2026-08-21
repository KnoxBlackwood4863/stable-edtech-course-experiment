import express from "express";
import { z } from "zod";
import {
  assignCourse,
  assignmentRequestSchema,
  educatorReport,
  type CourseAssignment
} from "./course_assignment.js";
import { getExperimentDefault, InfraiError } from "./infrai_flags.js";

const app = express();
app.use(express.json());

const flagValueSchema = z.union([
  z.number().int().min(0).max(100),
  z.object({ default_value: z.number().int().min(0).max(100) })
]);

function guidedPercentage(value: unknown): number {
  const parsed = flagValueSchema.parse(value);
  return typeof parsed === "number" ? parsed : parsed.default_value;
}

app.post("/course-assignments", async (request, response) => {
  try {
    const input = assignmentRequestSchema.parse(request.body);
    const configuredValue = await getExperimentDefault("guided-course-percent");
    response.status(201).json(assignCourse(input, guidedPercentage(configuredValue)));
  } catch (error) {
    if (error instanceof z.ZodError) {
      response.status(400).json({ error: "Invalid assignment request", details: error.flatten() });
      return;
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      response.status(status).json({ error: error.message, code: error.code });
      return;
    }
    response.status(500).json({ error: "Could not create course assignment" });
  }
});

app.post("/educator-reports", (request, response) => {
  const bodySchema = z.object({ assignments: z.array(assignmentRequestSchema.extend({
    variant: z.enum(["control", "guided"]),
    deadline: z.string().datetime(),
    overdue: z.boolean()
  })) });
  const parsed = bodySchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "Invalid report request", details: parsed.error.flatten() });
    return;
  }
  // The schema above guarantees the fields required by CourseAssignment;
  // this compiler configuration widens Zod object properties to optional.
  response.json(educatorReport(parsed.data.assignments as CourseAssignment[]));
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`Course delivery service listening on http://localhost:${port}`));
