import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { createReadStream } from "fs";

// ---------- Helper functions ----------

// Read the content of a folder (files + sub-folders)
async function readFolder(folder) {
  return await fs.readdir(folder, { withFileTypes: true });
}

// Get ALL files in a folder, including the ones inside sub-folders
async function getAllFiles(folder) {
  const entries = await readFolder(folder);
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(folder, entry.name);

    if (entry.isDirectory()) {
      // it's a folder: look inside it (recursion)
      const filesInside = await getAllFiles(fullPath);
      files.push(...filesInside);
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

// Check if a file or folder already exists
async function exists(somePath) {
  try {
    await fs.access(somePath);
    return true;
  } catch {
    return false;
  }
}

// If "photo.jpg" already exists, try "photo-1.jpg", then "photo-2.jpg", etc.
// plannedPaths = names we already decided to use (needed for --dry-run,
// because in a simulation nothing really exists on the disk)
async function getUniquePath(wantedPath, plannedPaths) {
  const { dir, name, ext } = path.parse(wantedPath);
  let candidate = wantedPath;
  let count = 1;

  while (plannedPaths.has(candidate) || (await exists(candidate))) {
    candidate = path.join(dir, `${name}-${count}${ext}`);
    count++;
  }

  return candidate;
}

// ---------- Choosing the destination folder ----------

// Example: photo.JPG -> root/jpg
async function getFolderByExtension(filePath, root) {
  const ext = path.extname(filePath);
  // files without extension (Makefile...) go into "no-extension"
  const folderName = ext ? ext.slice(1).toLowerCase() : "no-extension";
  return path.join(root, folderName);
}

// Example: file modified on 15 Sept 2026 -> root/2026-09-15
async function getFolderByDate(filePath, root) {
  const stats = await fs.stat(filePath);
  const date = stats.mtime.toISOString().slice(0, 10);
  return path.join(root, date);
}

// Under 1 MB -> small, under 10 MB -> medium, otherwise large
async function getFolderBySize(filePath, root) {
  const stats = await fs.stat(filePath);
  const oneMB = 1024 * 1024;

  if (stats.size < oneMB) return path.join(root, "small");
  if (stats.size < 10 * oneMB) return path.join(root, "medium");
  return path.join(root, "large");
}

// ---------- Moving the files ----------

// Move each file into the folder chosen by getTargetFolder
async function organize(root, getTargetFolder, dryRun) {
  // list every file BEFORE moving anything
  const files = await getAllFiles(root);
  const plannedPaths = new Set();

  for (const filePath of files) {
    const targetFolder = await getTargetFolder(filePath);
    const fileName = path.basename(filePath);
    const wantedPath = path.join(targetFolder, fileName);

    // the file is already in the right place: do nothing
    // (otherwise it would be renamed to photo-1.jpg on every run)
    if (wantedPath === filePath) continue;

    // if the name is already taken, pick another one
    const finalPath = await getUniquePath(wantedPath, plannedPaths);
    plannedPaths.add(finalPath);

    if (dryRun) {
      // simulation: only print what would happen
      console.log(`${filePath} → ${finalPath}`);
    } else {
      await fs.mkdir(targetFolder, { recursive: true });
      await fs.rename(filePath, finalPath);
    }
  }
}

// ---------- Finding duplicates ----------

// Compute the fingerprint (hash) of a file, chunk by chunk,
// so a big file is never fully loaded in memory
async function getHash(filePath) {
  const hash = crypto.createHash("sha256");
  const stream = createReadStream(filePath);

  for await (const chunk of stream) {
    hash.update(chunk);
  }

  return hash.digest("hex");
}

// Find files with exactly the same content
async function findDuplicates(files) {
  // step 1: group files by size (fast).
  // Two files with different sizes can never be identical.
  const filesBySize = new Map();

  for (const file of files) {
    const stats = await fs.stat(file);
    if (!filesBySize.has(stats.size)) {
      filesBySize.set(stats.size, []);
    }
    filesBySize.get(stats.size).push(file);
  }

  // step 2: compute hashes only for groups with 2 files or more
  let duplicateCount = 0;

  for (const group of filesBySize.values()) {
    if (group.length < 2) continue;

    const seenHashes = new Map();

    for (const file of group) {
      const hash = await getHash(file);

      if (seenHashes.has(hash)) {
        console.log(`Duplicate: ${file}`);
        console.log(`Original:  ${seenHashes.get(hash)}`);
        duplicateCount++;
      } else {
        seenHashes.set(hash, file);
      }
    }
  }

  console.log(`${duplicateCount} duplicate(s) found.`);
}

// ---------- Main program ----------

async function main() {
  const args = process.argv.slice(2);

  const command = args[0];
  const folder = args[1];
  const dryRun = args.includes("--dry-run");

  // value after --by (extension, date or size)
  const byIndex = args.indexOf("--by");
  const organizeBy = byIndex !== -1 ? args[byIndex + 1] : undefined;

  if (!command) {
    console.error("ERROR: missing command");
    process.exit(1);
  }

  if (command !== "organize") {
    console.error("ERROR: unknown command");
    process.exit(1);
  }

  if (!folder) {
    console.error("ERROR: missing folder");
    process.exit(1);
  }

  // make sure the folder really exists
  try {
    const stats = await fs.stat(folder);

    if (!stats.isDirectory()) {
      console.error("ERROR: path is not a directory");
      process.exit(1);
    }
  } catch {
    console.error("ERROR: folder does not exist");
    process.exit(1);
  }

  if (args.includes("--dedupe")) {
    const files = await getAllFiles(folder);
    await findDuplicates(files);
  } else if (organizeBy === "extension") {
    await organize(
      folder,
      (file) => getFolderByExtension(file, folder),
      dryRun,
    );
  } else if (organizeBy === "date") {
    await organize(folder, (file) => getFolderByDate(file, folder), dryRun);
  } else if (organizeBy === "size") {
    await organize(folder, (file) => getFolderBySize(file, folder), dryRun);
  } else {
    console.error("ERROR: use --by extension|date|size or --dedupe");
    process.exit(1);
  }
}

// if something unexpected happens (permissions...), print a clean message
try {
  await main();
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
}
