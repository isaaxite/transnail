import { error } from "node:console";
import migrate, { DestAssetStruct, Migrater, printResult } from "../index";

const baseAbsPath = '/home/isaac/Workspace/';

async function main() {
  // const ret1 = await migrate(baseAbsPath, 'blog/source/_drafts', {
  //   assetDirName: 'assets',
  //   prompt: {
  //     selectPosts: async () => ['/home/isaac/Workspace/blog/source/_drafts/英语学习/标注 | 局外人 | Pt. 1, Ch. 3.md'],
  //     selectOutputDirPath: async () => '/home/isaac/Workspace/blog/source/_posts/Develop Records',
  //   }
  // });

  // const ret2 = await migrate(baseAbsPath, 'blog/source/_posts', {
  //   assetDirName: 'assets',
  //   prompt: {
  //     selectPosts: async () => ['/home/isaac/Workspace/blog/source/_posts/Develop Records/标注 | 局外人 | Pt. 1, Ch. 3.md'],
  //     selectOutputDirPath: async () => '/home/isaac/Workspace/blog/source/_drafts/英语学习/',
  //   }
  // });

  // const migrater1 = new Migrater({
  //   base: '/home/isaac/Workspace/blog',
  //   input: {
  //     filePath: 'source/_posts/Develop Records/标注 | 局外人 | Pt. 1, Ch. 3.md',
  //     assetScope: 'source',
  //   },
  //   output: 'source/_drafts/英语学习',
  //   destAssetStruct: DestAssetStruct.PreserveOriginal,
  // });

  // const ret1 = await migrater1.transAll();

  // const migrater2 = new Migrater({
  //   base: '/home/isaac/Workspace/blog',
  //   input: {
  //     filePath: 'source/_drafts/英语学习/标注 | 局外人 | Pt. 1, Ch. 3.md',
  //     assetScope: 'source',
  //   },
  //   output: 'source/_posts/Develop Records',
  //   destAssetStruct: DestAssetStruct.Flatten,
  // });

  // // const ret2 = await migrater2.transAll();

  // await migrater2.calcAssetsPayload();
  // const invalid = migrater2.invalid;

  

  printResult(getMock(), Object.create({
    warnList(props: {
      main: { label: string, text: string };
      subs: string[];
    }) {
      const { main, subs } = props;
      const label = ['WARN', main.label].filter(Boolean).join(': ');
      console.info('');
      console.warn(`[${label}] ${main.text}`);
      subs.forEach(text => console.warn(`[${label}:SUBS] ${text}`));
      console.info('');
    },
    success(text: string, label?: string) {
      const strs: string[] = [];
      if (label) {
        strs.push(`${label} -`);
      }

      strs.push(text);
      console.info(`[SUCCESS] ${strs.join(' ')}`);
    }
  }));
}

main();

function getMock() {
  return {
    "/home/isaac/Workspace/blog/source/_posts/Develop Records/标注 | 局外人 | Pt. 1, Ch. 3.md": {
      movePost: {
        copyErr: new Error('copyErr'),
        // copyErr: undefined,
        // unlinkErr: new Error('unlinkErr'),
        unlinkErr: undefined,
      },
      moveAssets: {
        "/home/isaac/Workspace/blog/source/_posts/Develop Records/assets/2025-10-01-22-41-41.png": {
          copy: {
            src: "/home/isaac/Workspace/blog/source/_posts/Develop Records/assets/2025-10-01-22-41-41.png",
            dest: "/home/isaac/Workspace/blog/source/_drafts/英语学习/assets/2025-10-01-22-41-41.png",
            error: undefined,
            // error: new Error('copy err'),
          },
          unlink: {
            src: "/home/isaac/Workspace/blog/source/_posts/Develop Records/assets/2025-10-01-22-41-41.png",
            error: undefined,
            // error: new Error('unlink err'),
          },
        },
        "/home/isaac/Workspace/blog/source/_posts/Develop Records/assets/image_202510012222.png": {
          copy: {
            src: "/home/isaac/Workspace/blog/source/_posts/Develop Records/assets/image_202510012222.png",
            dest: "/home/isaac/Workspace/blog/source/_drafts/英语学习/assets/image_202510012222.png",
            error: undefined,
          },
          unlink: {
            src: "/home/isaac/Workspace/blog/source/_posts/Develop Records/assets/image_202510012222.png",
            error: undefined,
            // error: new Error('unlink err'),
          },
        },
        "/home/isaac/Workspace/blog/source/_posts/Develop Records/assets/2025-10-09-18-25-51.png": {
          copy: {
            src: "/home/isaac/Workspace/blog/source/_posts/Develop Records/assets/2025-10-09-18-25-51.png",
            dest: "/home/isaac/Workspace/blog/source/_drafts/英语学习/assets/2025-10-09-18-25-51.png",
            error: undefined,
          },
          unlink: {
            src: "/home/isaac/Workspace/blog/source/_posts/Develop Records/assets/2025-10-09-18-25-51.png",
            error: undefined,
          },
        },
      },
      copyAssets: {
        "/home/isaac/Workspace/blog/source/_posts/Develop Records/assets/2025-10-13-19-45-16.png": {
          src: "/home/isaac/Workspace/blog/source/_posts/Develop Records/assets/2025-10-13-19-45-16.png",
          dest: "/home/isaac/Workspace/blog/source/_drafts/英语学习/assets/2025-10-13-19-45-16.png",
          error: undefined,
        },
        "/home/isaac/Workspace/blog/source/_posts/Develop Records/assets/2025-10-09-18-30-30.png": {
          src: "/home/isaac/Workspace/blog/source/_posts/Develop Records/assets/2025-10-09-18-30-30.png",
          dest: "/home/isaac/Workspace/blog/source/_drafts/英语学习/assets/2025-10-09-18-30-30.png",
          error: undefined,
          // error: new Error('copyAssets'),
        },
      },
    },
  };
}