import { describe, expect, it } from "vitest";
import { canExecute, canReject } from "../utils/proposals";

describe("canExecute", () => {
  it("should correctly identify if proposal can be executed", () => {
    // threshold = 1
    expect(canExecute([], 1)).toBeFalsy();
    expect(canExecute([{ result: false }], 1)).toBeFalsy();
    expect(canExecute([{ result: true }], 1)).toBeTruthy();
    expect(canExecute([], 2)).toBeFalsy();

    // threshold = 2
    expect(canExecute([{ result: false }], 2)).toBeFalsy();
    expect(canExecute([{ result: false }, { result: false }], 2)).toBeFalsy();
    expect(canExecute([{ result: false }, { result: true }], 2)).toBeFalsy();
    expect(canExecute([{ result: true }, { result: true }], 2)).toBeTruthy();

    //threshold = 3
    expect(canExecute([{ result: false }], 3)).toBeFalsy();
    expect(
      canExecute([{ result: false }, { result: false }, { result: false }], 3)
    ).toBeFalsy();
    expect(
      canExecute([{ result: false }, { result: true }, { result: true }], 3)
    ).toBeFalsy();
    expect(
      canExecute([{ result: true }, { result: true }, { result: true }], 3)
    ).toBeTruthy();
  });
});

describe("canReject", () => {
  it("should correctly identify if proposal can be rejected", () => {
    expect(canReject([{ result: false }], 1, 1)).toBeTruthy();

    expect(canReject([], 1, 2)).toBeFalsy();
    expect(canReject([{ result: true }], 1, 2)).toBeFalsy();
    expect(canReject([{ result: false }], 1, 2)).toBeFalsy();
    expect(canReject([{ result: true }, { result: true }], 1, 2)).toBeFalsy();
    expect(
      canReject([{ result: false }, { result: false }], 1, 2)
    ).toBeTruthy();

    expect(canReject([{ result: true }], 2, 2)).toBeFalsy();
    expect(canReject([{ result: false }], 2, 2)).toBeTruthy();

    expect(canReject([], 1, 3)).toBeFalsy();
    expect(canReject([{ result: true }], 1, 3)).toBeFalsy();
    expect(canReject([{ result: false }], 1, 3)).toBeFalsy();
    expect(canReject([{ result: true }, { result: true }], 1, 3)).toBeFalsy();
    expect(canReject([{ result: false }, { result: false }], 1, 3)).toBeFalsy();
    expect(
      canReject([{ result: false }, { result: false }, { result: false }], 1, 3)
    ).toBeTruthy();

    expect(canReject([], 2, 3)).toBeFalsy();
    expect(canReject([{ result: true }], 2, 3)).toBeFalsy();
    expect(canReject([{ result: false }], 2, 3)).toBeFalsy();
    expect(canReject([{ result: true }, { result: true }], 2, 3)).toBeFalsy();
    expect(
      canReject([{ result: false }, { result: false }], 2, 3)
    ).toBeTruthy();
    expect(
      canReject([{ result: false }, { result: false }, { result: false }], 2, 3)
    ).toBeTruthy();

    expect(canReject([], 3, 3)).toBeFalsy();
    expect(canReject([{ result: true }], 3, 3)).toBeFalsy();
    expect(canReject([{ result: false }], 3, 3)).toBeTruthy();
    expect(canReject([{ result: true }, { result: true }], 3, 3)).toBeFalsy();
    expect(
      canReject([{ result: false }, { result: false }], 3, 3)
    ).toBeTruthy();
    expect(
      canReject([{ result: false }, { result: false }, { result: false }], 3, 3)
    ).toBeTruthy();

    expect(canReject([{ result: true }], 1, 12)).toBeFalsy();
    expect(canReject([{ result: false }], 1, 12)).toBeFalsy();
  });
});
