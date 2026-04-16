import migrate from "@transnail/migrate";
import { PathTreeify } from "path-treeify";
import Prompt from "./prompt";
import fg from 'fast-glob';
import { readFrontMatterTitle } from "./utils";
import Hint from "./hint";
import { join } from "node:path";

export default async function main(
  assetDirName: string,
  baseAbsPath: string,
  inputDir: string,
  outputDir: string,
) {
  const inputDirAbs = join(baseAbsPath, inputDir);
  const outputDirAbs = join(baseAbsPath, outputDir);
  const getPostPaths = (): Array<{ title: string, postPath: string }> => {
    const result = [];
    const filePaths = fg.sync(`**/*.{md,markdown}`, {
      onlyFiles: true,
      cwd: inputDirAbs,
    });

    for (const segement of filePaths) {
      const fullPath = join(inputDirAbs, segement);
      const { error, title } = readFrontMatterTitle(fullPath);
      if (!error && title) {
        result.push({ title, postPath: fullPath })
      }
    }

    return result;
  };

  const getDirTree = () => {
    const ptf = new PathTreeify({
      base: outputDirAbs,
      filter: ({ name }) => name !== assetDirName,
    });

    return ptf.build();
  };

  await migrate(baseAbsPath, inputDir, {
    assetDirName,
    prompt: new Prompt({
      getPostPaths,
      getDirTree,
    }),
    hint: new Hint(),
  });
}
