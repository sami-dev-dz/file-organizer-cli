import fs from "fs/promises";
import path from "path";

const argv = process.argv.slice(2);
const folder = argv[1];

try {
  const info = await fs.stat(folder);
  if (!info.isDirectory()) {
    console.error("ERROR: path is not a directory");
    process.exit(1);
  } else {
    console.log("Valid folder:", folder);
  }
} catch (error) {
  console.error("ERROR: folder does not exist");
  process.exit(1);
}

async function readExension() {
  const entries = await read(folder);

  for (const entry of entries) {
    const filePath = path.join(folder, entry.name);

    if (entry.isDirectory()) {
      await read(filePath);
    } else {
      const ext = path.extname(filePath);
      const folderPath = path.join(folder, ext.slice(1));
      await fs.mkdir(folderPath, { recursive: true });
      const destination = path.join(folderPath, entry.name);
      const dist = await getUniquePath(destination, entry.name, folderPath);
      if (dryrun) {
        console.log(`${filePath} → ${destination}`);
      } else {
        await fs.rename(filePath, dist);
      }
    }
  }
}

await read(folder);

async function read(folder) {
  const entries = await fs.readdir(folder, {
    withFileTypes: true,
  });
  return entries;
}
async function readDate(folder) {
  const entries = await read(folder);
  for (const entry of entries) {
    const filePath = path.join(folder, entry.name);

    if (entry.isDirectory()) {
      await readDate(filePath);
    } else {
      const info = await fs.stat(filePath);
      const date = info.mtime.toISOString().slice(0, 10);
      const folderPath = path.join(folder, date);
      await fs.mkdir(folderPath, { recursive: true });
      const destination = path.join(folderPath, entry.name);
      const dist = await getUniquePath(destination, entry.name, folderPath);
      await fs.rename(filePath, dist);
    }
  }
}

async function readSize(folder) {
  const entries = await read(folder);
  for (const entry of entries) {
    const filePath = path.join(folder, entry.name);

    if (entry.isDirectory()) {
      await readSize(filePath);
    } else {
      const info = await fs.stat(filePath);
      const size = info.size;
      let folderPath;
      if (size < 1024 * 1024) {
        folderPath = path.join(folder, "small");
      } else if (size < 10 * 1024 * 1024) {
        folderPath = path.join(folder, "medium");
      } else {
        folderPath = path.join(folder, "large");
      }
      await fs.mkdir(folderPath, { recursive: true });
      const destination = path.join(folderPath, entry.name);
      const dist = await getUniquePath(destination, entry.name, folderPath);
      await fs.rename(filePath, dist);
    }
  }
}

async function getUniquePath(destination, fileName, folderPath) {
  const parsed = path.parse(fileName);
  let count = 1;
  while (true) {
    try {
      await fs.access(destination);
      destination = path.join(
        folderPath,
        `${parsed.name}-${count}${parsed.ext}`,
      );
      count++;
    } catch {
      return destination;
    }
  }
}
