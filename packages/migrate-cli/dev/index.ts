import main from "../src/main";

(async () => {
  await main(
    'assets',
    '/home/isaac/Workspace',
    'blog/source/_drafts',
    'blog/source/_posts',
  );
})();
