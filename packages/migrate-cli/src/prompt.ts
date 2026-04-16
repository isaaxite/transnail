import prompts from "prompts";
import { clearLine } from "./utils";
import { PathTreeNode, TransferModeType } from "./types";

type PostPathGetter = () => Array<{ title: string, postPath: string }>;
type DirTreeGetter = () => PathTreeNode;

interface CtorProps {
  getPostPaths: PostPathGetter;
  getDirTree: DirTreeGetter;
}

export default class Prompt {
  private readonly getPostPaths: PostPathGetter;
  private readonly getDirTree: DirTreeGetter;

  constructor(prop: CtorProps) {
    this.getPostPaths = prop.getPostPaths || (() => []);
    this.getDirTree = prop.getDirTree || (() => []);
  }

  async selectPosts(): Promise<string[]> {
    const { value } = await prompts({
      type: 'autocompleteMultiselect',
      name: 'value',
      message: 'Select posts to migrate',
      instructions: false,
      choices: () => {
        const ret = [];
        for (const { title, postPath: value } of this.getPostPaths()) {
          ret.push({ title, value });
        }
        return ret;
      },
      hint: '- Space to select. Return to submit'
    });

    if (typeof value === 'undefined') {
      clearLine();
      process.exit(0);
    }

    if (!value.length) {
      clearLine();
      return await this.selectPosts();
    }

    return value;
  }

  async selectOutputDirPath(): Promise<string> {
    const PREVIOUS = Symbol('previous');
    const USE_CURRENT = Symbol('use current');
    let node = this.getDirTree();

    while (true) {
      const choices: Array<{
        title: string;
        value: Symbol | PathTreeNode;
        description?: string;
      }> = [{
        title: 'Current',
        value: USE_CURRENT,
        description: 'Use current directory',
      }];

      node.children.reduce((choices, it) => {
        const flag = it.children.length ? '/' : '';
        choices.push({
          title: `${it.value}${flag}`,
          value: it,
        });
        return choices;
      }, choices);

      const relative = node.getPath().relative;
      let message = 'Select directory to migrate to';
      message = relative ? `${message}(${relative})` : message;

      const ret = await prompts({
        type: 'select',
        name: 'value',
        message,
        choices: node.parent ? [
          { title: 'Previous', value: PREVIOUS, description: 'Return to parent directory' },
          ...choices,
        ] : choices,
      });

      if (typeof ret.value === 'undefined') {
        clearLine();
        process.exit(0);
      }

      if (ret.value === PREVIOUS) {
        node = node.parent!;
        clearLine();
        continue;
      }

      if (ret.value === USE_CURRENT) break;

      node = ret.value;
      
      if (!node.children.length) break;

      clearLine();
    }

    return node.getPath().absolute;
  }

  async selectTransferMode(message: string): Promise<TransferModeType> {
    const { value } = await prompts({
      type: 'select',
      name: 'value',
      message,
      choices: [
        { title: 'Copy', value: TransferModeType.Copy },
        { title: 'Replace', value: TransferModeType.Replace },
        { title: 'Skip', value: TransferModeType.Skip },
      ],
    });

    if (typeof value === 'undefined') {
      clearLine();
      process.exit(0);
    }

    return value;
  }

  async confirm(text: string): Promise<boolean> {
    const { value } = await prompts({
      type: 'confirm',
      name: 'value',
      message: text || 'Continue?',
      initial: true
    });

    if (typeof value === 'undefined') {
      clearLine();
      process.exit(0);
    }

    return value;
  }
}
