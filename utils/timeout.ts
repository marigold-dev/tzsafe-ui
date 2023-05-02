export function timeout<T>(time: number, returnValue: T): Promise<T> {
  return new Promise(resolve => {
    setTimeout(() => resolve(returnValue), time);
  });
}

export function promiseWithTimeout<T>(promise: Promise<T>, time: number) {
  return Promise.race([promise, timeout(time, -1)]);
}

let previousId = -1;
export function debounce(func: () => void, time: number) {
  window.clearTimeout(previousId);
  previousId = window.setTimeout(func, time);
}
