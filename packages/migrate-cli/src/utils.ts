import { accessSync, constants, readFileSync } from "node:fs";
import { resolve } from "node:path";

export function clearLine() {
  process.stdout.write('\x1B[1A\x1B[2K');
}
/**
 * Read and extract the title from a md file's front-matter
 */
export function readFrontMatterTitle(filePath: string) {
  const resolvedPath = resolve(filePath);

  try {
    accessSync(resolvedPath, constants.R_OK);
  } catch (err: any) {
    return { error: `File is inaccessible: ${resolvedPath} (${err.message})` };
  }

  const content = readFileSync(resolvedPath, 'utf-8');

  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) {
    return { error: 'Missing front-matter' };
  }

  const titleMatch = fmMatch[1].match(/^title:\s*(.+)$/m);
  if (!titleMatch) {
    return { error: 'front-matter has no title field' };
  }

  const title = titleMatch[1].trim().replace(/^['"]|['"]$/g, '');
  return { title };
}
