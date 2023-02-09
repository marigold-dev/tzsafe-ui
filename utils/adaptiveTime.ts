import { DateTime, Duration } from "luxon";
function conv(duration: Duration): Duration {
  if (duration.years) {
    duration = Duration.fromObject({ years: duration.years });
  }
  if (duration.months) {
    duration = Duration.fromObject({ months: duration.months });
  }
  if (duration.weeks) {
    duration = Duration.fromObject({ weeks: duration.weeks });
  }
  if (duration.days) {
    duration = Duration.fromObject({ days: duration.days });
  }
  if (duration.hours) {
    duration = Duration.fromObject({ hours: duration.hours });
  }
  if (duration.seconds) {
    duration = Duration.fromObject({ seconds: duration.seconds });
  }
  if (duration.milliseconds) {
    duration = Duration.fromObject({ millisecond: duration.milliseconds });
  }
  return duration;
}
function adaptiveTime(x: string): string {
  let duration = Duration.fromMillis(Number(x) * 1000).rescale();

  return conv(duration).normalize().toHuman();
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
