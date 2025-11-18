import { describe, it, expect } from "vitest";

import { hashText } from "./hash";

describe("hashText", () => {
  it("produces stable hash for same input", () => {
    const input = "Hello, HealthRecon!";
    const h1 = hashText(input);
    const h2 = hashText(input);

    expect(h1).toBe(h2);
  });

  it("produces different hashes for different inputs", () => {
    const h1 = hashText("a");
    const h2 = hashText("b");

    expect(h1).not.toBe(h2);
  });
});

