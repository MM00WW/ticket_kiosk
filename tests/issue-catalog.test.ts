import { describe, expect, it } from "vitest";
import {
  createTicketSchema,
  defaultIssues,
  storedIssuesSchema,
} from "@/lib/issueCatalog";

describe("ticket issue compatibility", () => {
  it("accepts legacy clients without issues", () => {
    expect(createTicketSchema.parse({}).issues).toEqual(defaultIssues);
  });
  it("preserves cross-category requests and removes duplicates", () => {
    const account = { category: "account", subcategory: "password-reset" };
    const network = { category: "network", subcategory: "vpn" };
    expect(
      createTicketSchema.parse({ issues: [account, network, account] }).issues,
    ).toEqual([account, network]);
  });
  it.each([
    { issues: [] },
    { issues: [{ category: "account", subcategory: "vpn" }] },
    { issues: [{ category: "unknown", subcategory: "unsure" }] },
  ])("rejects invalid requests: %j", ({ issues }) => {
    expect(createTicketSchema.safeParse({ issues }).success).toBe(false);
  });
  it("keeps historical empty issues readable", () => {
    expect(storedIssuesSchema.parse([])).toEqual([]);
  });
});
