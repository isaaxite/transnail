import { basename, dirname, join, relative, sep } from "node:path";
import { normalizeDestPaths, transferFiles, TransferFilesRet } from "./src/transfer";
import { DetectType, LinkHarvester, LinkTarget } from "link-harvester";
import { checkFileExist } from "./src/utils";

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
  success: (text: string, label: string) => void;
}

async function core(baseAbsPath: string, inputDir: string, opt: {
  assetDirName: string;
  prompt: Prompts;
  hint: Hint;
}) {
  const { prompt, hint, assetDirName } = opt;
  const inputDirAbs = join(baseAbsPath, inputDir);
  const postPaths = await prompt.selectPosts();
  const outputDirpath = await prompt.selectOutputDirPath();

  const isFileInDirectory = (base: string, filePath: string) => {
    const dir = base.endsWith(sep) ? base : base + sep;
    return filePath.startsWith(dir);
  };

  const result: Record<string, TransferFilesRet> = {};

  for (const postPath of postPaths) {
    let harvester = new LinkHarvester({
      base: inputDirAbs,
      filePath: postPath,
    });
    const dirPath = dirname(postPath);
    const assetsDirPath = join(dirPath, assetDirName);
    let linksData = await harvester.gather()
      .filterBy(LinkTarget.LocalResource)
      .detect(DetectType.Accessible)
      .detect(DetectType.ExternalRefs)
      .classify({
        accessible: it => Boolean(it.accessible),
        invalid: 'rest',
      });
    harvester = null as any;

    if (linksData.invalid.length) {
      hint.warnList({
        main: {
          label: 'invalid reference exists',
          text: basename(postPath),
        },
        subs: linksData.invalid.map(it => it.syntax),
      });
    }

    let srcs: {
      post: string;
      move: string[];
      copy: string[];
    } = {
      post: postPath,
      move: [],
      copy: [],
    };

    linksData.accessible.reduce((data, it) => {
      const assetAbsPath = join(dirPath, it.url);
      if (
        it.externalRefs?.length
        || !isFileInDirectory(inputDirAbs, assetAbsPath)
      ) {
        data.copy.push(it.url);
      } else if (isFileInDirectory(assetsDirPath, assetAbsPath)) {
        data.move.push(it.url);
      }
      return data;
    }, srcs);
    linksData = null as any;

    let dests = normalizeDestPaths(outputDirpath, {
      move: srcs.move,
      copy: srcs.copy,
      post: [basename(postPath)],
    });
    srcs = null as any;

    if (checkFileExist(dests.post[0].dest) && !(await prompt.confirm(
      `[${relative(baseAbsPath, dests.post[0].dest)}] is exist, continue?`
    ))) {
      process.exit(0);
    }

    const newMove: Array<{ src: string, dest: string }> = [];
    const newCopy: Array<{ src: string, dest: string }> = [];
    const preProcess = async (
      data: Array<{ src: string, dest: string }>,
      cb: (it: { src: string, dest: string }) => void,
    ) => {
      for (const it of data) {
        if (!checkFileExist(it.dest)) {
          cb(it);
          continue;
        }

        hint.warnList({
          main: { label: 'dest exist', text: it.src },
          subs: [
            `from:  ${relative(baseAbsPath, join(dirPath, it.src))}`,
            `to:    ${relative(baseAbsPath, it.dest)}`
          ]
        });

        const mode = await prompt.selectTransferMode('Choose how to handle?');

        switch(mode) {
          case TransferModeType.Copy:
            newCopy.push(it);
            break;
          case TransferModeType.Replace:
            newMove.push(it);
            break;
          case TransferModeType.Skip:
          default:
            // notthing to do!
        }
      }
    };

    await preProcess(dests.move, (it) => newMove.push(it));
    await preProcess(dests.copy, (it) => newCopy.push(it));

    dests.move = newMove;
    dests.copy = newCopy;

    const resources: { move: string[], copy: string[] } = { move: [], copy: [] };
    resources.move = dests.move.map(it => it.src);
    resources.copy = dests.copy.map(it => it.src);
    newMove.length = 0;
    newCopy.length = 0;
    dests = null as any;

    result[postPath] = transferFiles(outputDirpath, postPath, resources);
  }

  const hasFailed = (failed: TransferFilesRet['failed']) => failed.moved.length || failed.copied.length;
  try {
    for (const [filePath, ret] of Object.entries(result)) {
      const { failed, moved, copied } = ret;
      const fileName = basename(filePath);
      const successLabel = `assets - moved(${moved.length}) copied(${copied.length})`;
      const failedLabel = `failed(moved: ${failed.moved.length}, copied: ${failed.copied.length})`;

      hasFailed(failed)
        ? hint.note(fileName, `${successLabel} ${failedLabel}`)
        : hint.success(fileName, successLabel);

      failed.moved.forEach((asset) => hint.fatal(asset, 'moved'));
      failed.copied.forEach((asset) => hint.fatal(asset, 'copied'));
    }
  } catch (error) {
    throw error;
  }

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
  prompt: PartialBy<Prompts, 'confirm' | 'selectTransferMode'>;
  hint?: Hint;
}) {
  return core(baseAbsPath, inputDir, {
    assetDirName: opt.assetDirName || '',
    hint: new HintAdapter(opt.hint),
    prompt: new PromptsAdapter(opt.prompt),
  });
}
