export const crop = (v: string, maxSize: number): string => {
  const half = Math.ceil((maxSize - 3) / 2);

  return v.length >= maxSize
    ? `${v.substring(0, half)}...${v.substring(v.length - half)}`
    : v;
};

export const buf2Hex = (buffer: Uint8Array) =>
  [...new Uint8Array(buffer)]
    .map(x => x.toString(16).padStart(2, "0"))
    .join("");
