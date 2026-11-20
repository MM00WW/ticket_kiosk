import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { api, AppError } from "@/server/api";

afterEach(() => vi.restoreAllMocks());
describe("API response contract", () => {
  it("wraps created resources with HTTP 201", async () => {
    const response = await api(async () => ({ number: "A001" }), 201);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: { number: "A001" } });
  });
  it("preserves business conflict status and code", async () => {
    const response = await api(async () => {
      throw new AppError(409, "INVALID_STATE", "Window is offline.");
    });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: { code: "INVALID_STATE", message: "Window is offline." },
    });
  });
  it("returns HTTP 400 for invalid input", async () => {
    const response = await api(async () =>
      z.object({ id: z.number() }).parse({ id: "invalid" }),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
  });
  it("does not expose internal error details", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await api(async () => {
      throw new Error("private database details");
    });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: { code: "INTERNAL_ERROR", message: "Unexpected server error." },
    });
  });
});
