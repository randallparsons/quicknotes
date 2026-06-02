import { describe, expect, test } from "vitest";
import {
  moveItemDown,
  moveItemUp,
  normalizeSortOrder,
} from "./itemOrderUtils";

const sampleItems = [
  { id: 1, title: "School", sort_order: 0 },
  { id: 2, title: "Web Dev II", sort_order: 1 },
  { id: 3, title: "Dev Tools", sort_order: 2 },
];

describe("item ordering utilities", () => {
  test("moveItemUp moves an item one position earlier", () => {
    const result = moveItemUp(sampleItems, 2);

    expect(result.map((item) => item.title)).toEqual([
      "Web Dev II",
      "School",
      "Dev Tools",
    ]);

    expect(result.map((item) => item.sort_order)).toEqual([0, 1, 2]);
  });

  test("moveItemUp keeps the first item in place", () => {
    const result = moveItemUp(sampleItems, 1);

    expect(result.map((item) => item.title)).toEqual([
      "School",
      "Web Dev II",
      "Dev Tools",
    ]);
  });

  test("moveItemDown moves an item one position later", () => {
    const result = moveItemDown(sampleItems, 2);

    expect(result.map((item) => item.title)).toEqual([
      "School",
      "Dev Tools",
      "Web Dev II",
    ]);

    expect(result.map((item) => item.sort_order)).toEqual([0, 1, 2]);
  });

  test("moveItemDown keeps the last item in place", () => {
    const result = moveItemDown(sampleItems, 3);

    expect(result.map((item) => item.title)).toEqual([
      "School",
      "Web Dev II",
      "Dev Tools",
    ]);
  });

  test("normalizeSortOrder resets sort_order values based on array position", () => {
    const unorderedItems = [
      { id: 10, title: "First Displayed Item", sort_order: 12 },
      { id: 11, title: "Second Displayed Item", sort_order: 22 },
    ];

    const result = normalizeSortOrder(unorderedItems);

    expect(result.map((item) => item.sort_order)).toEqual([0, 1]);
  });
});