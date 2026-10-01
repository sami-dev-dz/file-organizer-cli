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
      console.log("File:", filePath);
    }
  }
}
await read(folder);
