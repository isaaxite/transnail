import { basename, dirname, join, relative } from "node:path";
import { DetectType, ExtractedLink, LinkHarvester, LinkTarget } from "link-harvester";
import { checkFileExist, copyFile, HintAdapter, isFileInDirectory, printResult, PromptsAdapter } from "./src/utils";
import { unlinkSync } from "node:fs";
import { Prompts, Hint, PartialBy, AssetsPayload, MigraterCtorParam, MigraterBase, MigratePromptRet } from "./src/types";
import { DestAssetStruct, TransferModeType } from "./src/constants";

export async function migratePrompt(
  // absolute path
  baseAbsPath: string,
  // relative to baseAbsPath
  inputDir: string,
  opt: {
    prompt: PartialBy<Prompts, 'confirm' | 'selectTransferMode'>;
    hint?: Hint;
  }
) {
  const hint = new HintAdapter(opt.hint);
  const prompt = new PromptsAdapter(opt.prompt);
  const inputDirAbs = join(baseAbsPath, inputDir);
  const postFullPaths = await prompt.selectPosts();
  const outputDirpath = await prompt.selectOutputDirPath();

  const result: MigratePromptRet = {};

  for (const postFullPath of postFullPaths) {
    const migrater = new Migrater({
      base: baseAbsPath,
      input: {
        filePath: relative(baseAbsPath, postFullPath),
        assetScope: relative(baseAbsPath, inputDirAbs),
      },
      output: relative(baseAbsPath, outputDirpath),
      destAssetStruct: DestAssetStruct.PreserveOriginal,
    });

    const assetsPayload = await migrater.calcAssetsPayload();

    if (migrater.invalid.length) {
      hint.warnList({
        main: {
          label: 'invalid reference exists',
          text: basename(postFullPath),
        },
        subs: migrater.invalid.map(it => it.syntax),
      });
    }

    if (checkFileExist(migrater.destPostAbs) && !(await prompt.confirm(
      `[${relative(baseAbsPath, migrater.destPostAbs)}] is exist, continue?`
    ))) {
      process.exit(0);
    }

    for (const it of assetsPayload.skip) {
      hint.warnList({
        main: { label: 'dest exist', text: it.src },
        subs: [
          `from:  ${relative(baseAbsPath, it.src)}`,
          `to:    ${relative(baseAbsPath, it.dest)}`
        ]
      });

      const mode = await prompt.selectTransferMode('Choose how to handle?');

      switch(mode) {
        case TransferModeType.Copy:
          migrater.assetsPayload.copy.push(it);
          break;
        case TransferModeType.Replace:
          migrater.assetsPayload.move.push(it);
          break;
        case TransferModeType.Skip:
        default:
          // notthing to do!
      }
    }
    

    const copyPostRet = migrater.copyPost();
    const copyAssetsRet = migrater.copyAssets();
    let unlinkPostErr: Error | undefined;

    if (!copyPostRet) {
      unlinkPostErr = migrater.unlinkPost();
    }

    const unlinkAssetsRet = migrater.unlinkAssets();

    const moveAssetsRet: any = {};
    const copyAssetsPureRet: any = {};

    for (const [key, copyAssetsItRet] of Object.entries(copyAssetsRet)) {
      if (unlinkAssetsRet[key]) {
        moveAssetsRet[key] = {
          copy: copyAssetsItRet,
          unlink: unlinkAssetsRet[key],
        };
      } else {
        copyAssetsPureRet[key] = copyAssetsItRet;
      }
    }

    result[postFullPath] = {
      movePost: { copyErr: copyPostRet, unlinkErr: unlinkPostErr },
      moveAssets: moveAssetsRet,
      copyAssets: copyAssetsPureRet,
    };
  }

  printResult(result, hint);

  return result;
}

export class Migrater implements MigraterBase {
  private base: string;
  private linksDataCache: { accessible: ExtractedLink[], invalid: ExtractedLink[] } | null = null;
  private destAssetStruct: DestAssetStruct;
  private assetsScopeAbs: string;
  private inputBaseAbs: string;
  private outputDirAbs: string;
  private filename: string;
  private inputFullFilePath: string;
  public assetsPayload: AssetsPayload = {
    move: [],
    copy: [],
    skip: [],
  };
  public destPostAbs: string;

  constructor({
    base,
    output,
    input,
    destAssetStruct,
  }: MigraterCtorParam) {
    this.base = base;
    this.outputDirAbs = join(this.base, output);
    this.filename = basename(input.filePath);
    this.inputFullFilePath = join(this.base, input.filePath);
    this.inputBaseAbs = dirname(this.inputFullFilePath);
    this.assetsScopeAbs = join(this.base, input.assetScope);
    this.destAssetStruct = destAssetStruct || DestAssetStruct.Flatten;
    this.destPostAbs = join(this.outputDirAbs, this.filename);
  }

  private genAssetDestFullPath(url: string) {
    switch (this.destAssetStruct) {
      case DestAssetStruct.Flatten:
        return join(this.outputDirAbs, basename(url));
      case DestAssetStruct.PreserveOriginal:
      default:
        return join(this.outputDirAbs, url);
    }
  }

  private copyFile(src: string, dest: string) {
    try {
      copyFile(src, dest); 
    } catch (error) {
      return error as Error;
    }
  }

  get invalid() {
    return this.linksDataCache?.invalid || [];
  }

  async getLinksData() {
    if (!this.linksDataCache) {
      let harvester = new LinkHarvester({
        base: this.assetsScopeAbs,
        filePath: this.inputFullFilePath,
      });
      this.linksDataCache = await harvester.gather()
        .filterBy(LinkTarget.LocalResource)
        .detect(DetectType.Accessible)
        .detect(DetectType.ExternalRefs)
        .classify({
          accessible: it => Boolean(it.accessible),
          invalid: 'rest',
        });
    }

    return this.linksDataCache;
  }

  async calcAssetsPayload() {
    const { accessible } = await this.getLinksData();

    for (const it of accessible) {
      const destAssetAbsPath = this.genAssetDestFullPath(it.url);
      const assetAbsPath = join(this.inputBaseAbs, it.url);
      const getItem = () => ({
        src: assetAbsPath,
        dest: destAssetAbsPath,
        raw: it,
      });

      if (checkFileExist(destAssetAbsPath)) {
        this.assetsPayload.skip.push(getItem());
      } else if (!it.externalRefs?.length && isFileInDirectory(this.assetsScopeAbs, assetAbsPath)) {
        this.assetsPayload.move.push(getItem());
      } else {
        this.assetsPayload.copy.push(getItem());
      }
    }

    return this.assetsPayload;
  }

  copyAssets() {
    const result: Record<string, { src: string, dest: string, error?: Error }> = {};
    const arr = [...this.assetsPayload.move, ...this.assetsPayload.copy];
    for (let i = 0; i < arr.length; i++) {
      const { src, dest } = arr[i];
      const error = this.copyFile(src, dest);
      result[src] = { src, dest, error };
    }

    return result;
  }

  unlinkAssets() {
    const result: Record<string, { src: string, error?: Error }> = {};
    for (let i = 0; i < this.assetsPayload.move.length; i++) {
      const { src } = this.assetsPayload.move[i];
      result[src]= { src, error: undefined };
      try {
        unlinkSync(src);
      } catch (error: any) {
        result[src].error = error;
      }
    }

    return result;
  }

  copyPost() {
    const destPostAbs = join(this.outputDirAbs, this.filename);
    return this.copyFile(this.inputFullFilePath, destPostAbs);
  }

  unlinkPost() {
    try {
      unlinkSync(this.inputFullFilePath);
    } catch (error) {
      return error as Error;
    }
  }

  async transAll() {
    await this.calcAssetsPayload();
    this.copyAssets();
    this.copyPost();
    this.unlinkAssets();
    this.unlinkPost();
  }
}
