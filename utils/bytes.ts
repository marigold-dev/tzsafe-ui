// convert bytes to string if the string is human readable
// otherwise, remain the same
export function hexToAscii(hexStr: string): string {
  let asciiStr = "";

  for (let i = 0; i < hexStr.length; i += 2) {
    const byte = hexStr.substr(i, 2);
    const byteValue = parseInt(byte, 16);

    // Check if the byte value is in the printable ASCII range
    if (byteValue < 32 || byteValue > 126) {
      return hexStr; // Return original hex string if non-printable character found
    }

    asciiStr += String.fromCharCode(byteValue);
  }

  return asciiStr;
}
