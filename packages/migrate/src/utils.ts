import { existsSync } from "node:fs";

export function clearLine() {
  process.stdout.write('\x1B[1A\x1B[2K');
}

export function checkFileExist(fullFilePath: string) {
  try {
    return existsSync(fullFilePath);
  } catch (error) {
    return false;
  }
}
