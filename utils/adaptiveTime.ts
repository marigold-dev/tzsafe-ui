import { DateTime, Duration } from "luxon";

function conv(duration: Duration): Duration {
  if (duration.years) {
    duration = Duration.fromObject(
      { years: duration.years },
      {
        locale: "en",
      }
    );
  }
  if (duration.months) {
    duration = Duration.fromObject(
      { months: duration.months },
      {
        locale: "en",
      }
    );
  }
  if (duration.weeks) {
    duration = Duration.fromObject(
      { weeks: duration.weeks },
      {
        locale: "en",
      }
    );
  }
  if (duration.days) {
    duration = Duration.fromObject(
      { days: duration.days },
      {
        locale: "en",
      }
    );
  }
  if (duration.hours) {
    duration = Duration.fromObject(
      { hours: duration.hours },
      {
        locale: "en",
      }
    );
  }
  if (duration.seconds) {
    duration = Duration.fromObject(
      { seconds: duration.seconds },
      {
        locale: "en",
      }
    );
  }
  if (duration.milliseconds) {
    duration = Duration.fromObject(
      { millisecond: duration.milliseconds },
      {
        locale: "en",
      }
    );
  }
  return duration;
}

export function adaptiveTime(x: string): string {
  if (isNaN(Number(x))) return "";

  const duration = Duration.fromMillis(Number(x) * 1000, {
    locale: "en",
  }).rescale();

  return duration.normalize().toHuman();
}

export const parseIntOr = <T>(
  value: string | undefined,
  defaultValue: T
): number | T =>
  // The double number allows to only return an int and not a float
  isNaN(Number(value)) ? defaultValue : Math.floor(Number(value));

export const durationOfDaysHoursMinutes = (
  days: string | undefined,
  hours: string | undefined,
  minutes: string | undefined
): Duration =>
  Duration.fromObject({
    days: parseIntOr(days, undefined),
    hours: parseIntOr(hours, undefined),
    minutes: parseIntOr(minutes, undefined),
  })
    .normalize()
    .rescale();

export const secondsToDuration = (seconds: number): Duration => {
  const duration = Duration.fromMillis(seconds * 1000)
    .rescale()
    .shiftTo("days", "hours", "minutes")
    .mapUnits(v => Math.floor(v));

  return Duration.fromObject({
    days: duration.days === 0 ? undefined : duration.days,
    hours: duration.hours === 0 ? undefined : duration.hours,
    minutes: duration.minutes === 0 ? undefined : duration.minutes,
  });
};
