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

async function read(folder) {
  const entries = await fs.readdir(folder, {
    withFileTypes: true,
  });

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
      await fs.rename(filePath, dist);
    }
  }
}

await read(folder);

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
