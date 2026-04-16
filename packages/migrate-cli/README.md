# @transnail/migrate-cli

A powerful CLI tool for interactively migrating Markdown files and their referenced assets (images, documents, videos, etc.) to a new location.

> 📖 [中文文档 (Chinese README)](https://github.com/isaaxite/transnail/blob/main/packages/migrate-cli/docs/README.zh-CN.md)

## Features

- 🚀 **Interactive Migration** - Select which posts to migrate with an intuitive interface
- 📎 **Asset Handling** - Automatically detects and transfers referenced resources (images, PDFs, videos, etc.)
- 🎯 **Smart Classification** - Distinguishes between accessible/inaccessible resources and internal/external references
- 🔄 **Flexible Conflict Resolution** - Choose to copy, replace, or skip when destination files exist
- 📁 **Directory Navigation** - Browse and select output directories interactively
- 🛡️ **Safe Operations** - Validates file accessibility and handles errors gracefully

## Installation

```bash
npm install -g @transnail/migrate-cli
```

Or use directly with npx:

```bash
npx @transnail/migrate-cli [options]
```

## Usage

### Parameters

| Short | Long | Description |
|-------|------|-------------|
| `-b` | `--base` | Base directory path (absolute or relative) |
| `-a` | `--asset-dirname` | Assets directory name (e.g., `assets`, `images`) |
| `-i` | `--input-dir` | Input directory relative to base path |
| `-o` | `--output-dir` | Output directory relative to base path |

### Examples

```bash
# Basic usage
npx @transnail/migrate-cli \
  --base="./my-blog" \
  --asset-dirname="assets" \
  --input-dir="./posts" \
  --output-dir="./migrated"

# Using short parameters
npx @transnail/migrate-cli \
  -b "./my-blog" \
  -a "assets" \
  -i "./posts" \
  -o "./migrated"

# With absolute paths
npx @transnail/migrate-cli \
  --base="/Users/username/blog" \
  --asset-dirname="images" \
  --input-dir="content" \
  --output-dir="output"
```

## How It Works

1. **Scanning** - The tool scans all markdown files in the input directory
2. **Extraction** - Extracts titles from front-matter and identifies all resource references
3. **Classification** - Resources are classified as:
   - **Accessible** - Resources that can be read
   - **Invalid** - Broken references
   - **Internal** - Resources within the input directory
   - **External** - Resources outside the input directory or referenced elsewhere
4. **Interactive Selection** - You select which posts to migrate and where to put them
5. **Conflict Handling** - When destination files exist, you choose how to proceed
6. **Migration** - Files and resources are copied/moved to the destination

## Resource Types Supported

### Links Detected

- Markdown links: `[text](url)`
- Markdown images: `![alt](url)`
- HTML images: `<img src="url">`
- HTML anchors: `<a href="url">`

### Resource Classification

- **Local resources** - Files within the project
- **External pages** - Web pages (http/https)
- **External resources** - Web resources with extensions (images, PDFs, etc.)
- **In-page anchors** - Internal page links (`#section`)
- **Other protocols** - mailto:, tel:, etc.

### File Extensions Recognized

- Images: `jpg`, `jpeg`, `png`, `gif`, `webp`, `svg`, `bmp`, `ico`, `tiff`, `avif`

- Documents: `pdf`, `doc`, `docx`, `xls`, `xlsx`, `ppt`, `pptx`

- Media: `mp4`, `webm`, `ogg`, `mov`, `avi`, `mkv`, `mp3`, `wav`, `flac`, `aac`, `m4a`

- Archives: `zip`, `tar`, `gz`, `rar`, `7z`, `dmg`, `exe`, `apk`

- Fonts: `woff`, `woff2`, `ttf`, `otf`

## Interactive Prompts

### 1. Select Posts

```bash
✔ Select posts to migrate
  ◯  My First Post
  ◯  Technical Tutorial
  ◯  Project Announcement
  ◯  Year in Review
> (Use <space> to select, <enter> to submit)
```

### 2. Select Output Directory

```bash
✔ Select directory to migrate to (./output)
  ◯ Previous
  ◯ Current
  ◯ docs/
  ◯ public/
  ◯ archive/
```

### 3. Handle Conflicts

When a destination file already exists:

```bash
✔ dest exist: image.png
  from: ./posts/assets/image.png
  to:   ./output/assets/image.png

✔ Choose how to handle?
  ◯ Copy (keep both)
  ◯ Replace (overwrite)
  ◯ Skip (leave as is)
```

## Output

After migration, the tool reports:

- **Moved files** - Resources that were relocated
- **Copied files** - Resources that were duplicated
- **Failed operations** - Any files that couldn't be transferred

## Requirements

- Node.js 14.x or higher
- Read/write permissions for source and destination directories

## License

[GPL-3.0-or-later](https://github.com/isaaxite/transnail/blob/main/LICENSE) © [isaaxite](https://github.com/isaaxite)
