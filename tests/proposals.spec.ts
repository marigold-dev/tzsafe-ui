import { describe, expect, it } from "vitest";
import { canExecute, canReject } from "../utils/proposals";

describe("canExecute", () => {
  it("should correctly identify if proposal can be executed", () => {
    expect(canExecute([], 1)).toBeFalsy();
    expect(canExecute([{ result: false }], 1)).toBeFalsy();
    expect(canExecute([{ result: true }], 1)).toBeTruthy();
  });
});

describe("canReject", () => {
  it("should correctly identify if proposal can be rejected", () => {
    expect(canReject([], 1, 2)).toBeFalsy();
    expect(canReject([{ result: false }], 1, 1)).toBeTruthy();
    expect(canReject([{ result: true }], 1, 12)).toBeFalsy();
  });
});
