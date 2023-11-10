export const crop = (v: string, maxSize: number): string => {
  const half = Math.ceil((maxSize - 3) / 2);

  return v.length >= maxSize
    ? `${v.substring(0, half)}...${v.substring(v.length - half)}`
    : v;
};
