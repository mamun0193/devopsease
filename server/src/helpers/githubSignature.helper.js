import crypto from "crypto";

export function verifyGitHubSignature(rawBody, signatureHeader, secret) {
  if (!secret) {
    return { valid: false, reason: "missing_secret" };
  }

  if (!signatureHeader || typeof signatureHeader !== "string") {
    return { valid: false, reason: "missing_signature" };
  }

  if (!signatureHeader.startsWith("sha256=")) {
    return { valid: false, reason: "invalid_signature_format" };
  }

  const incomingHex = signatureHeader.slice(7);

  if (!incomingHex || incomingHex.length !== 64 || !/^[a-f0-9]+$/i.test(incomingHex)) {
    return { valid: false, reason: "malformed_signature" };
  }

  const computedHex = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  const incomingBuffer = Buffer.from(incomingHex, "hex");
  const computedBuffer = Buffer.from(computedHex, "hex");

  if (incomingBuffer.length !== computedBuffer.length) {
    return { valid: false, reason: "signature_length_mismatch" };
  }

  const valid = crypto.timingSafeEqual(incomingBuffer, computedBuffer);
  return { valid, reason: valid ? null : "signature_mismatch" };
}
