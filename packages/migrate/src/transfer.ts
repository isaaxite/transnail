import { accessSync, constants, copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync } from "node:fs";
import { basename, dirname, join, normalize, resolve } from "node:path";

export function copyFile(src: string, dest: string) {
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
}

export function moveFile(src: string, dest: string) {
  copyFile(src, dest);
  unlinkSync(src);
}

export function transferFiles(
  outputDir: string,
  mdFilePath: string,
  resources: {
    move: Array<string>;
    copy: Array<any>;
  },
) {
  if (!existsSync(outputDir)) {
    console.error(`${outputDir} is not exist!`)
    process.exit(1);
  }

  const resolvedOutputDir = resolve(outputDir);
  const resolvedMdFile    = resolve(mdFilePath);
  const mdDir             = dirname(resolvedMdFile);

  const moved: string[]  = [];
  const copied: string[]  = [];
  const failed: {
    moved: string[];
    copied: string[];
  } = {
    moved: [],
    copied: [],
  };

  const mdDestPath = join(resolvedOutputDir, basename(resolvedMdFile));
  moveFile(resolvedMdFile, mdDestPath);

  for (const url of (resources.move || [])) {
    const srcAbs  = resolve(mdDir, url);
    const destAbs = join(resolvedOutputDir, url);
    try {
      moveFile(srcAbs, destAbs);
      moved.push(url);
    } catch (error) {
      failed.moved.push(url);
    }
  }

  for (const url of (resources.copy || [])) {
    const srcAbs  = resolve(mdDir, url);
    const destAbs = join(resolvedOutputDir, normalize(url));

    try {
      copyFile(srcAbs, destAbs);
      copied.push(url);
    } catch (error) {
      failed.copied.push(url);
    }
  }

  return { moved, copied, failed };
}

export function findMdFiles(dirPath: string) {
  const resolvedDir = resolve(dirPath);

  try {
    accessSync(resolvedDir, constants.R_OK);
    if (!statSync(resolvedDir).isDirectory()) {
      throw new Error(`Path exists but is not a directory: ${resolvedDir}`);
    }
  } catch (err: any) {
    throw new Error(`Directory is invalid or inaccessible: ${resolvedDir} (${err.message})`);
  }

  const walk = (dir: string) => {
    const entries = readdirSync(dir, { withFileTypes: true });
    const results: string[] = [];

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...walk(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push(fullPath);
      }
    }

    return results;
  };

  return walk(resolvedDir);
}

export function normalizeDestPaths<K extends string>(outputDir: string, pathsObj: Record<K, string[]>) {
  if (!existsSync(outputDir)) {
    console.error(`${outputDir} is not exist!`)
    process.exit(1);
  }

  const output = resolve(outputDir);
  const result = {} as Record<K, Array<{ src: string, dest: string }>>;
  for (const [key, arr] of Object.entries(pathsObj) as [K, string[]][]) {
    if (!result[key]) {
      result[key] = [];
    }

    for (const it of arr) {
      const dest = resolve(output, it);
      result[key].push({ src: it, dest });
    }
  }

  return result;
}
