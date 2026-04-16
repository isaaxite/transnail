# @transnail/migrate-cli

一个强大的交互式 CLI 工具，用于迁移 Markdown 文件及其引用的资源文件（图片、文档、视频等）。

## 功能特点

- 🚀 **交互式迁移** - 通过直观的界面选择要迁移的文章
- 📎 **资源处理** - 自动检测并转移引用的资源文件
- 🎯 **智能分类** - 区分可访问/不可访问资源，内部/外部引用
- 🔄 **灵活冲突处理** - 目标文件存在时可选择复制、替换或跳过
- 📁 **目录导航** - 交互式浏览和选择输出目录
- 🛡️ **安全操作** - 验证文件可访问性并优雅处理错误

## 安装

```bash
npm install -g @transnail/migrate-cli
```

或直接使用 npx：

```bash
npx @transnail/migrate-cli [选项]
```

## 使用方法

### 参数说明

| 简写 | 完整参数 | 说明 |
|------|----------|------|
| `-b` | `--base` | 基础目录路径（绝对或相对路径） |
| `-a` | `--asset-dirname` | 资源目录名称（如 `assets`、`images`） |
| `-i` | `--input-dir` | 相对于基础路径的输入目录 |
| `-o` | `--output-dir` | 相对于基础路径的输出目录 |

### 使用示例

```bash
# 基本用法
npx @transnail/migrate-cli \
  --base="./my-blog" \
  --asset-dirname="assets" \
  --input-dir="./posts" \
  --output-dir="./migrated"

# 使用简写参数
npx @transnail/migrate-cli \
  -b "./my-blog" \
  -a "assets" \
  -i "./posts" \
  -o "./migrated"

# 使用绝对路径
npx @transnail/migrate-cli \
  --base="/Users/username/blog" \
  --asset-dirname="images" \
  --input-dir="content" \
  --output-dir="output"
```

## 工作原理

1. **扫描** - 工具扫描输入目录中的所有 Markdown 文件
2. **提取** - 从 front-matter 提取标题并识别所有资源引用
3. **分类** - 资源被分类为：
   - **可访问** - 可以读取的资源
   - **无效** - 损坏的引用
   - **内部** - 输入目录内的资源
   - **外部** - 输入目录外或被其他文件引用的资源
4. **交互选择** - 选择要迁移的文章和目标位置
5. **冲突处理** - 目标文件存在时选择处理方式
6. **迁移** - 文件及资源被复制/移动到目标位置

## 支持的资源类型

### 检测的链接类型

- Markdown 链接：`[文本](url)`
- Markdown 图片：`![替代文本](url)`
- HTML 图片：`<img src="url">`
- HTML 锚点：`<a href="url">`

### 资源分类

- **本地资源** - 项目内的文件
- **外部页面** - 网页（http/https）
- **外部资源** - 带扩展名的网络资源（图片、PDF等）
- **页内锚点** - 内部页面链接（`#章节`）
- **其他协议** - mailto:、tel: 等

### 识别的文件扩展名

- 图片：`jpg`、`jpeg`、`png`、`gif`、`webp`、`svg`、`bmp`、`ico`、`tiff`、`avif`

- 文档：`pdf`、`doc`、`docx`、`xls`、`xlsx`、`ppt`、`pptx`

- 媒体：`mp4`、`webm`、`ogg`、`mov`、`avi`、`mkv`、`mp3`、`wav`、`flac`、`aac`、`m4a`

- 压缩包：`zip`、`tar`、`gz`、`rar`、`7z`、`dmg`、`exe`、`apk`

- 字体：`woff`、`woff2`、`ttf`、`otf`

## 交互式提示

### 1. 选择文章

```bash
✔ 选择要迁移的文章
  ◯  我的第一篇文章
  ◯  技术教程
  ◯  项目公告
  ◯  年度回顾
> (使用 <space> 选择，<enter> 确认)
```

### 2. 选择输出目录

```bash
✔ 选择迁移目标目录 (./output)
  ◯ 返回上级
  ◯ 当前目录
  ◯ docs/
  ◯ public/
  ◯ archive/
```

### 3. 处理冲突

当目标文件已存在时：

```bash
✔ 目标文件已存在: image.png
  源文件: ./posts/assets/image.png
  目标位置: ./output/assets/image.png

✔ 请选择处理方式？
  ◯ 复制（保留两者）
  ◯ 替换（覆盖）
  ◯ 跳过（保持原样）
```

## 输出结果

迁移完成后，工具会报告：

- **已移动文件** - 被重定位的资源
- **已复制文件** - 被复制的资源
- **失败操作** - 无法转移的文件

## 系统要求

- Node.js 14.x 或更高版本
- 源目录和目标目录的读写权限

## 许可证

MIT
