import main from "../src/main";
import { PostDisplayType } from "../src/types";

(async () => {
  await main(
    'assets',
    '/home/isaac/Workspace',
    'blog/source/_drafts',
    'blog/source/_posts',
    PostDisplayType.FileName,
  );
})();
