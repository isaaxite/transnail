import { ExtractedLink } from "link-harvester";
import { DestAssetStruct } from "./constants";

export interface Prompts {
  selectPosts: () => Promise<string[]>;
  selectOutputDirPath: () => Promise<string>;
  confirm: (text: string) => Promise<boolean>;
  selectTransferMode: (text: string) => Promise<TransferModeType>;
}

export interface Hint {
  warnList: (props: {
    main: { label: string, text: string };
    subs: string[];
  }) => void;
  note: (text: string, label: string) => void;
  fatal: (text: string, label: string) => void;
  success: (text: string, label?: string) => void;
}

export interface MigraterCtorParam {
  base: string;
  input: {
    assetScope: string,
    filePath: string,
  };
  output: string;
  destAssetStruct: DestAssetStruct;
}

export interface MigraterBase {
  assetsPayload: AssetsPayload;
  destPostAbs: string;

  getLinksData(): Promise<{
    accessible: ExtractedLink[];
    invalid: ExtractedLink[];
  }>;

  calcAssetsPayload(): Promise<AssetsPayload>;

  copyAssets(): Record<string, {
    src: string;
    dest: string;
    error?: Error;
  }>;

  unlinkAssets(): Record<string, {
    src: string;
    error?: Error;
  }>;

  unlinkPost(): Error | undefined;

  copyPost(): Error | undefined;

  transAll(): Promise<void>;
}

export interface AssetsPayloadItem {
  raw: ExtractedLink;
  src: string;
  dest: string;
}

export interface AssetsPayload {
  move: AssetsPayloadItem[];
  copy: AssetsPayloadItem[];
  skip: AssetsPayloadItem[];
}

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// 类型工具定义
export type MethodReturnType<
  T,
  K extends string
> = K extends keyof T
  ? T[K] extends (...args: any) => any
    ? ReturnType<T[K]>
    : never
  : never;
  
type MigraterMethodRetype<Method extends string> = MethodReturnType<MigraterBase, Method>

export type MigratePromptRet = Record<string, {
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
