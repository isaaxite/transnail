import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { basename, dirname, sep } from "node:path";
import { Hint, MigratePromptRet, PartialBy, Prompts } from "./types";
import { TransferModeType } from "./constants";

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

export function copyFile(src: string, dest: string) {
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
}

export const isFileInDirectory = (base: string, filePath: string) => {
  const dir = base.endsWith(sep) ? base : base + sep;
  return filePath.startsWith(dir);
};

export class HintAdapter implements Hint {
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

export class PromptsAdapter implements Prompts {
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

export function printResult(result: MigratePromptRet, hint: Hint) {
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
