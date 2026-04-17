import main from "./src/main";
import minimist from "minimist";
import { resolve } from "node:path";
import { PostDisplayType } from "./src/types";

const args = minimist(process.argv.slice(2), {
  string: [
    'base',           // relative path
    'asset-dirname',
    'input-dir',      // relative to base
    'output-dir',     // relative to base
    'post-display-mode',
  ],
  alias: {
    'base': ['b'],
    'input-dir': ['i', 'inputDir'],
    'output-dir': ['o', 'outputDir'],
    'asset-dirname': ['a', 'assetDirName'],
    'post-display-mode': ['p', 'postDisplayType'],
  },
});

const { inputDir, outputDir, assetDirName } = args;
const baseAbsPath = resolve(args.base);

let postDisplayType = PostDisplayType.Title;
if ([PostDisplayType.FileName, PostDisplayType.Title].includes(args.postDisplayType.trim())) {
  postDisplayType = args.postDisplayType.trim();
}

main(assetDirName, baseAbsPath, inputDir, outputDir, postDisplayType);
