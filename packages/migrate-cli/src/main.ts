import migrate from "@transnail/migrate";
import { PathTreeify } from "path-treeify";
import Prompt from "./prompt";
import fg from 'fast-glob';
import { readFrontMatterTitle } from "./utils";
import Hint from "./hint";
import { basename, join } from "node:path";
import { PostDisplayType } from "./types";

export default async function main(
  assetDirName: string,
  baseAbsPath: string,
  inputDir: string,
  outputDir: string,
  postDisplayType: PostDisplayType,
) {
  const inputDirAbs = join(baseAbsPath, inputDir);
  const outputDirAbs = join(baseAbsPath, outputDir);
  const getPostPaths = (): Array<{ title: string, postPath: string }> => {
    const result = [];
    const filePaths = fg.sync(`**/*.{md,markdown}`, {
      onlyFiles: true,
      cwd: inputDirAbs,
    });

    const getTitle = postDisplayType === PostDisplayType.FileName
      ? (fullPath: string) => basename(fullPath)
      : (fullPath: string) => {
        const { title } = readFrontMatterTitle(fullPath);
        return title;
      };
    for (const segement of filePaths) {
      const fullPath = join(inputDirAbs, segement);
      const title = getTitle(fullPath);
      if (title) {
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
