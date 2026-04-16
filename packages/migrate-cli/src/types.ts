export interface PathTreeNode {
  depth: number;
  parent: PathTreeNode | null;
  value: string;
  children: PathTreeNode[];
  getPath(): {
    relative: string;
    absolute: string;
  };
}

export enum TransferModeType {
  Copy = 'copy',
  Replace = 'replace',
  Skip = 'skip',
}
