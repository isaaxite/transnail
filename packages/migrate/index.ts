import { basename, dirname, join, relative, sep } from "node:path";
import { copyFile, moveFile, normalizeDestPaths, transferFiles, TransferFilesRet } from "./src/transfer";
import { DetectType, ExtractedLink, LinkHarvester, LinkTarget } from "link-harvester";
import { checkFileExist } from "./src/utils";
import { unlinkSync } from "node:fs";

type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

enum TransferModeType {
  Copy = 'copy',
  Replace = 'replace',
  Skip = 'skip',
}

interface Prompts {
  selectPosts: () => Promise<string[]>;
  selectOutputDirPath: () => Promise<string>;
  confirm: (text: string) => Promise<boolean>;
  selectTransferMode: (text: string) => Promise<TransferModeType>;
}

interface Hint {
  warnList: (props: {
    main: { label: string, text: string };
    subs: string[];
  }) => void;
  note: (text: string, label: string) => void;
  fatal: (text: string, label: string) => void;
  success: (text: string, label?: string) => void;
}

// 类型工具定义
type MethodReturnType<
  T extends abstract new (...args: any) => any,
  K extends string
> = K extends keyof InstanceType<T>
  ? ReturnType<InstanceType<T>[K]>
  : never;

type MigraterMethodRetype<Method extends string> = MethodReturnType<typeof Migrater, Method>

type CoreResult = Record<string, {
  movePost: {
    copyErr: MigraterMethodRetype<"copyPost">;
    unlinkErr: MigraterMethodRetype<"unlinkPost">;
  };
  moveAssets: {
    [key: string]: {
      copy: MigraterMethodRetype<"copyAssets">[string];
      unlink: MigraterMethodRetype<"unlinkAssets">[string]
    }
  },
  copyAssets: MigraterMethodRetype<"copyAssets">;
}>;

export function printResult(result: CoreResult, hint: Hint) {
  try {
    for (const [filePath, ret] of Object.entries(result)) {
      const { movePost, moveAssets, copyAssets } = ret;
      const fileName = basename(filePath);

      const moveFaileds = [];
      for (const it of Object.values(moveAssets)) {
        let errMsg = [`move ${basename(it.copy.src)}:`];
        if (it.copy.error) {
          errMsg.push(`copy failed(${it.copy.error.message})`);
        }

        if (it.unlink.error) {
          errMsg.push(`unlink failed(${it.unlink.error.message})`);
        }

        if (errMsg.length > 1) {
          moveFaileds.push(errMsg.join(' '));
        }
      }

      const copyFaileds = [];
      for (const it of Object.values(copyAssets)) {
        if (it.error) {
          copyFaileds.push(`copy ${basename(it.src)}: copy failed(${it.error.message})`);
        }
      }

      let labelItems = [];
      if (movePost.copyErr) {
        labelItems.push(`copy fail(${movePost.copyErr.message}), `);
      }

      if (movePost.unlinkErr) {
        if (!labelItems.length) {
          labelItems.push(`copy success, `);
        }
        labelItems.push(`unlink fail(${movePost.unlinkErr.message})`);
      }

      if (labelItems.length === 1) {
        labelItems.push('unlink skip');
      }

      const isMovePostErr = movePost.copyErr || movePost.unlinkErr;
      const isCopyAssetsErr = copyFaileds.length;
      const isMoveAssetsErr = moveFaileds.length;
      const moveAssetsLen = Object.keys(moveAssets).length;
      const copyAssetsLen = Object.keys(copyAssets).length;
      const assetsSum = moveAssetsLen + copyAssetsLen;
      
      if (!isMovePostErr && !isCopyAssetsErr && !isMoveAssetsErr) {
        return hint.success(
          `Post: move success; Assets(${assetsSum}): move(success: ${moveAssetsLen} fail: 0), copy(success: ${copyAssetsLen} fail: 0)`,
          fileName,
        );
      }

      const title = [
        `Post: ${!isMovePostErr ? 'move success' : `move fail(copy: ${movePost.copyErr ? 'fail' : 'success'}, unlink: ${movePost.unlinkErr ? 'fail' : 'success'})`};`,
        `Assets(${assetsSum}): move(success: ${moveAssetsLen - moveFaileds.length} fail: ${moveFaileds.length})`,
        `copy(success: ${copyAssetsLen - copyFaileds.length} fail: ${copyFaileds.length}`,
      ].join(' ');

      hint.warnList({
        main: { label: fileName, text: title },
        subs: [
          labelItems.join(' '),
          ...moveFaileds,
          ...copyFaileds
        ].filter(Boolean),
      });
    }
  } catch (error) {
    throw error;
  }
}

async function core(
  // absolute path
  baseAbsPath: string,
  // relative to baseAbsPath
  inputDir: string,
  opt: {
    isMigrateMdDile: boolean;
    assetDirName: string;
    prompt: Prompts;
    hint: Hint;
  }
) {
  const { prompt, hint, assetDirName, isMigrateMdDile } = opt;
  const inputDirAbs = join(baseAbsPath, inputDir);
  const postFullPaths = await prompt.selectPosts();
  const outputDirpath = await prompt.selectOutputDirPath();

  const result: Record<string, {
    movePost: {
      copyErr: MigraterMethodRetype<"copyPost">;
      unlinkErr: MigraterMethodRetype<"unlinkPost">;
    };
    moveAssets: {
      [key: string]: {
        copy: MigraterMethodRetype<"copyAssets">[string];
        unlink: MigraterMethodRetype<"unlinkAssets">[string]
      }
    },
    copyAssets: MigraterMethodRetype<"copyAssets">;
  }> = {};

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

class HintAdapter implements Hint {
  constructor(private hint?: Partial<Hint>){}

  warnList(...args: Parameters<Hint['warnList']>) {
    return this.hint?.warnList ? this.hint.warnList(...args) : undefined;
  }

  note(...args: Parameters<Hint['note']>) {
    return this.hint?.note ? this.hint.note(...args) : undefined;
  }

  fatal(...args: Parameters<Hint['fatal']>) {
    return this.hint?.fatal ? this.hint.fatal(...args) : undefined;
  }

  success(...args: Parameters<Hint['success']>) {
    return this.hint?.success ? this.hint.success(...args) : undefined;
  }
}

class PromptsAdapter implements Prompts {
  constructor(private prompts: PartialBy<Prompts, "confirm" | "selectTransferMode">){}

  async selectPosts() {
    return this.prompts.selectPosts();
  }

  async selectOutputDirPath() {
    return this.prompts.selectOutputDirPath();
  }

  async selectTransferMode(text: string) {
    return this.prompts.selectTransferMode
      ? this.prompts.selectTransferMode(text)
      : TransferModeType.Copy;
  }

  async confirm(text: string) {
    return this.prompts.confirm ? this.prompts.confirm(text) : true;
  }
}

export default async function migrate(baseAbsPath: string, inputDir: string, opt: {
  assetDirName: string;
  isMigrateMdDile?: boolean;
  prompt: PartialBy<Prompts, 'confirm' | 'selectTransferMode'>;
  hint?: Hint;
}) {
  return core(baseAbsPath, inputDir, {
    isMigrateMdDile: typeof opt.isMigrateMdDile === 'boolean' ? opt.isMigrateMdDile : true,
    assetDirName: opt.assetDirName || '',
    hint: new HintAdapter(opt.hint),
    prompt: new PromptsAdapter(opt.prompt),
  });
}

const isFileInDirectory = (base: string, filePath: string) => {
  const dir = base.endsWith(sep) ? base : base + sep;
  return filePath.startsWith(dir);
};

export enum TransferScope {
  AssetsOnly = 'assets_only',
  FullContent = 'full_content',
}

export enum DestAssetStruct {
  PreserveOriginal = 'preserve_original',
  Flatten = 'flatten',
}

interface MigraterCtorParam {
  base: string;
  input: {
    assetScope: string,
    filePath: string,
  };
  output: string;
  destAssetStruct: DestAssetStruct;
}

interface AssetsPayloadItem {
  raw: ExtractedLink;
  src: string;
  dest: string;
}

interface AssetsPayload {
  move: AssetsPayloadItem[];
  copy: AssetsPayloadItem[];
  skip: AssetsPayloadItem[];
}

export class Migrater {
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

  private copyFile(src: string, dest: string) {
    try {
      copyFile(src, dest); 
    } catch (error) {
      return error as Error;
    }
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
