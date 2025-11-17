import { createHash } from "crypto";

export function hashText(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

