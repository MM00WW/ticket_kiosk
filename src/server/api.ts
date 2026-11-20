import { ZodError } from "zod";
import { AppError } from "./errors";
export async function api(work: () => Promise<unknown>, status = 200) {
  try {
    return Response.json({ data: await work() }, { status });
  } catch (error) {
    if (error instanceof ZodError)
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: error.issues.map((i) => i.message).join("; "),
          },
        },
        { status: 400 },
      );
    if (error instanceof AppError)
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    console.error(error);
    return Response.json(
      {
        error: { code: "INTERNAL_ERROR", message: "Unexpected server error." },
      },
      { status: 500 },
    );
  }
}
