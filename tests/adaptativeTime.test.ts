import { describe, expect, it } from "vitest";
import {
  durationOfDaysHoursMinutes,
  parseIntOr,
  secondsToDuration,
} from "../utils/adaptiveTime";

describe("parseIntOr", () => {
  it("should parseInt and return the correct value", () => {
    expect(parseIntOr("1", 0)).toBe(1);
    expect(parseIntOr("2", 0)).toBe(2);
    expect(parseIntOr("245678", 0)).toBe(245678);
  });

  it("should parseInt and return only the int", () => {
    expect(parseIntOr("1.13", 0)).toBe(1);
    expect(parseIntOr("1.5678", 0)).toBe(1);
    expect(parseIntOr("24.98765678", 0)).toBe(24);
  });

  it("should failed to parseInt and return the default value", () => {
    expect(parseIntOr("azeaze", 1)).toBe(1);
  });

  it("should failed to parseInt and return the default value", () => {
    expect(parseIntOr("1aze23aze24.5", 0)).toBe(0);
  });

  it("should failed to parseInt and return the default value", () => {
    expect(parseIntOr(undefined, 0)).toBe(0);
  });
});

describe("durationOfDaysHoursMinutes", () => {
  it("should return a duration with 1 day", () => {
    const duration = durationOfDaysHoursMinutes(
      "1",
      undefined,
      undefined
    ).toObject();

    expect(duration.days).toBe(1);
    expect(duration.hours).toBe(undefined);
    expect(duration.minutes).toBe(undefined);
  });

  it("should return a duration with 1 day", () => {
    const duration = durationOfDaysHoursMinutes(
      "1.5678",
      undefined,
      undefined
    ).toObject();

    expect(duration.days).toBe(1);
    expect(duration.hours).toBe(undefined);
    expect(duration.minutes).toBe(undefined);
  });

  it("should return a duration with 1 day and 2 hours", () => {
    const duration = durationOfDaysHoursMinutes(
      "1.5678",
      "2",
      undefined
    ).toObject();

    expect(duration.days).toBe(1);
    expect(duration.hours).toBe(2);
    expect(duration.minutes).toBe(undefined);
  });

  it("should return a duration with 1 day and 2 hours and 30 minutes", () => {
    const duration = durationOfDaysHoursMinutes("1.5678", "2", "30");
    expect(duration.days).toBe(1);
    expect(duration.hours).toBe(2);
    expect(duration.minutes).toBe(30);
  });

  it("should return a duration with 3 days", () => {
    const duration = durationOfDaysHoursMinutes(
      "1.5678",
      "24",
      (60 * 24).toString()
    ).toObject();

    expect(duration.days).toBe(3);
    expect(duration.hours).toBe(undefined);
    expect(duration.minutes).toBe(undefined);
  });
});

describe("secondsToDuration", () => {
  it("should return a duration of 1 day", () => {
    const duration = secondsToDuration(3600 * 24).toObject();

    expect(duration.days).toBe(1);
    expect(duration.hours).toBe(undefined);
    expect(duration.minutes).toBe(undefined);
  });

  it("should return a duration of 4 days 3 hours and 30 minutes", () => {
    const duration = secondsToDuration(
      3600 * 24 * 4 + 3600 * 3 + 1800
    ).toObject();

    expect(duration.days).toBe(4);
    expect(duration.hours).toBe(3);
    expect(duration.minutes).toBe(30);
  });
});
