import { describe, it, expect } from "vitest";
import { hexToAscii } from "../utils/bytes";

describe("hexToAscii", () => {
  it("converts hex to ASCII when printable", () => {
    expect(hexToAscii("687474703a")).toBe("http:");
    expect(hexToAscii("48656c6c6f")).toBe("Hello");
    expect(hexToAscii("21")).toBe("!");
    expect(hexToAscii("313233")).toBe("123");
    expect(hexToAscii("202020")).toBe("   ");
    expect(hexToAscii("4a617661")).toBe("Java");
    expect(hexToAscii("54797065736372697074")).toBe("Typescript");
    expect(hexToAscii("48656c6c6f20576f726c6421")).toBe("Hello World!");
  });

  it("returns original hex when containing non-printable characters", () => {
    expect(hexToAscii("00")).toBe("00");
    expect(hexToAscii("010203")).toBe("010203");
    expect(hexToAscii("1F")).toBe("1F");
  });

  it("handles empty strings", () => {
    expect(hexToAscii("")).toBe("");
  });
});
