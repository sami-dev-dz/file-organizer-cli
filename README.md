# file-organizer-cli

![Node.js](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)
![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)

A small command-line tool that cleans up messy folders. It sorts files into sub-folders by extension, modification date or size, and it can also find duplicate files by comparing their content.

No dependencies, just Node.js.

## Why I built it

My Downloads folder was a mess, and I didn't want to trust a tool that moves files without showing me what it's about to do. So the main idea here is safety: every move can be previewed first with `--dry-run`, existing files are never overwritten, and running the tool twice doesn't break anything.

## Features

- Sort files by **extension**, **date** or **size**
- **Dry run** mode to preview every move before touching the disk
- **Name collisions** handled automatically (`photo.jpg` becomes `photo-1.jpg`)
- **Duplicate detection** using SHA-256 hashes, read as a stream so large files don't fill the memory
- Works on **nested folders**, all files are collected recursively
- **Safe to run twice**: files that are already in the right place are left alone

## Requirements

- Node.js 18 or higher

## Installation

```bash
git clone https://github.com/sami-dev-dz/file-organizer-cli.git
cd file-organizer-cli
```

There is nothing to install. The project has no dependencies.

## Usage

```bash
node organize.js organize <folder> --by <extension|date|size> [--dry-run]
node organize.js organize <folder> --dedupe
```

### Examples

Preview what would happen, without changing anything:

```bash
node organize.js organize ~/Downloads --by extension --dry-run
```

```
/home/sami/Downloads/Makefile → /home/sami/Downloads/no-extension/Makefile
/home/sami/Downloads/report.pdf → /home/sami/Downloads/pdf/report.pdf
/home/sami/Downloads/trip/a.jpg → /home/sami/Downloads/jpg/a.jpg
/home/sami/Downloads/work/a.jpg → /home/sami/Downloads/jpg/a-1.jpg
```

Do it for real:

```bash
node organize.js organize ~/Downloads --by extension
```

Sort photos by the date they were last modified:

```bash
node organize.js organize ~/Photos --by date
```

Sort by size:

```bash
node organize.js organize ~/Videos --by size
```

Look for duplicates:

```bash
node organize.js organize ~/Docs --dedupe
```

```
Duplicate: /home/sami/Docs/copy-of-cv.pdf
Original:  /home/sami/Docs/cv.pdf
1 duplicate(s) found.
```

### Options

| Option           | Description                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| `--by extension` | Folders named after the file extension (`jpg`, `pdf`, ...). Files without an extension go to `no-extension`. |
| `--by date`      | Folders named after the last modified date (`2026-09-15`).                                                   |
| `--by size`      | `small` (under 1 MB), `medium` (under 10 MB) or `large`.                                                     |
| `--dedupe`       | Lists files with identical content. It only reports, it never deletes anything.                              |
| `--dry-run`      | Prints the planned moves and changes nothing on disk.                                                        |

## How it works

1. The tool lists every file in the folder, including the ones in sub-folders, **before** moving anything.
2. For each file, it works out the destination folder from the chosen rule.
3. If the file is already where it should be, it is skipped.
4. If the name is already taken, a number is added until the name is free. In dry-run mode, the names already planned are tracked too, so the preview matches what a real run would do.
5. The destination folder is created if needed, then the file is moved.

For duplicates, files are first grouped by size, because two files of different sizes can't be identical. Only the groups with two or more files get hashed, which saves a lot of time on big folders.

## Things to know

- Files from sub-folders are moved up into the category folders at the root of the target folder. Empty sub-folders are left behind.
- Hidden files like `.gitignore` have no extension, so they end up in `no-extension`.
- There is no undo. Use `--dry-run` first, and try it on a copy of your folder if the files matter.
- `--dedupe` ignores `--dry-run`, since it doesn't change anything anyway.

## Project structure

```
file-organizer-cli/
├── organize.js     # the whole tool
├── package.json
└── README.md
```

## Ideas for later

- A `--delete-duplicates` option with a confirmation prompt
- A real `organize` command through the `bin` field in `package.json`
- Ignore patterns (skip `.git`, `node_modules`, ...)
- Tests

## License

MIT
