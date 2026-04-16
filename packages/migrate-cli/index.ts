import main from "./src/main";
import minimist from "minimist";
import { resolve } from "node:path";

const args = minimist(process.argv.slice(2), {
  string: [
    'base',           // relative path
    'asset-dirname',
    'input-dir',      // relative to base
    'output-dir',     // relative to base
  ],
  alias: {
    'base': ['b'],
    'input-dir': ['i', 'inputDir'],
    'output-dir': ['o', 'outputDir'],
    'asset-dirname': ['a', 'assetDirName'],
  },
});

const { inputDir, outputDir, assetDirName } = args;
const baseAbsPath = resolve(args.base);

main(assetDirName, baseAbsPath, inputDir, outputDir);
