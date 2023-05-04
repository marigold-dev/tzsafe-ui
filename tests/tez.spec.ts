import { describe, it, expect } from "vitest";
import { tezToMutez, mutezToTez } from "../utils/tez";

describe("utils - tez", () => {
  describe("tezToMutez", () => {
    it("should convert tez to mutez", () => {
      expect(tezToMutez(1)).toBe(1000000);
      expect(tezToMutez(0.000001)).toBe(1);
      expect(tezToMutez(123456789)).toBe(123456789000000);
    });
  });

  describe("mutezToTez", () => {
    it("should convert mutez to tez", () => {
      expect(mutezToTez(1)).toBe(0.000001);
      expect(mutezToTez(0.000001)).toBe(0.000000000001);
      expect(mutezToTez(1000000)).toBe(1);
    });
  });
});
