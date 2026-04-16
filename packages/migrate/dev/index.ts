import migrate from "../index";

const baseAbsPath = '/home/isaac/Workspace/';

async function main() {
  const ret1 = await migrate(baseAbsPath, 'blog/source/_drafts', {
    assetDirName: 'assets',
    prompt: {
      selectPosts: async () => ['/home/isaac/Workspace/blog/source/_drafts/英语学习/标注 | 局外人 | Pt. 1, Ch. 3.md'],
      selectOutputDirPath: async () => '/home/isaac/Workspace/blog/source/_posts/Develop Records',
    }
  });

  const ret2 = await migrate(baseAbsPath, 'blog/source/_posts', {
    assetDirName: 'assets',
    prompt: {
      selectPosts: async () => ['/home/isaac/Workspace/blog/source/_posts/Develop Records/标注 | 局外人 | Pt. 1, Ch. 3.md'],
      selectOutputDirPath: async () => '/home/isaac/Workspace/blog/source/_drafts/英语学习/',
    }
  });
}

main();
