import { describe, it, expect } from "vitest";
const crypto = require("crypto");

/**
 * Mock of the core hashing logic used in api/auth.js
 */
function verifyHash(passcode, expectedHash) {
  const inputHash = crypto
    .createHash("sha256")
    .update(passcode)
    .digest("hex")
    .toLowerCase();

  return inputHash === expectedHash.toLowerCase().trim();
}

describe("Authentication Logic", () => {
  it("should correctly verify a valid passcode hash", () => {
    const passcode = "123456";
    // echo -n "123456" | sha256sum
    const validHash =
      "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92";

    expect(verifyHash(passcode, validHash)).toBe(true);
  });

  it("should fail for an invalid passcode", () => {
    const passcode = "wrong";
    const validHash =
      "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92";

    expect(verifyHash(passcode, validHash)).toBe(false);
  });

  it("should be case-insensitive for the hash string", () => {
    const passcode = "123456";
    const validHash =
      "8D969EEF6ECAD3C29A3A629280E686CF0C3F5D5A86AFF3CA12020C923ADC6C92";

    expect(verifyHash(passcode, validHash)).toBe(true);
  });
});
