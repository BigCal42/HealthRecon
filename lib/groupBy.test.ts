import { describe, it, expect } from "vitest";

import { groupBy } from "./groupBy";

describe("groupBy", () => {
  it("groups items by key", () => {
    const items = [
      { type: "a", value: 1 },
      { type: "b", value: 2 },
      { type: "a", value: 3 },
    ];

    const result = groupBy(items, (item) => item.type);

    expect(result["a"].length).toBe(2);
    expect(result["b"].length).toBe(1);
    expect(result["a"][0].value).toBe(1);
    expect(result["a"][1].value).toBe(3);
  });

  it("returns empty object for empty input", () => {
    const result = groupBy([], () => "key");

    expect(result).toEqual({});
  });
});

