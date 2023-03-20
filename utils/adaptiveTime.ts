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
function adaptiveTime(x: string): string {
  if (isNaN(Number(x))) return "";

  const duration = Duration.fromMillis(Number(x) * 1000, {
    locale: "en",
  }).rescale();

  return duration.normalize().toHuman();
}
function countdown(x: string, createdOn: string): string {
  let created = DateTime.fromISO(new Date(createdOn).toISOString()).toObject();
  let duration = Duration.fromMillis(Number(x) * 1000)
    .plus(Duration.fromObject(created))
    .minus(Duration.fromObject(DateTime.now().toObject()))
    .rescale();
  return conv(duration).toHuman();
}
export { adaptiveTime, countdown };
