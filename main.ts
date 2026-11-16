// Submission helper for make.fun's ai-excited-01 competition.
// Copies entry.png into the competition output directory and validates the copy.

import { createHash } from 'node:crypto';
import { copyFile, mkdir, open, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_BYTES = 1_048_576;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const source = fileURLToPath(new URL('./entry.png', import.meta.url));
const destination = path.join(outDir, 'entry.png');

await mkdir(outDir, { recursive: true });
await copyFile(source, destination);

const info = await stat(destination);
if (!info.isFile()) {
  throw new Error(`${destination} is not a regular file`);
}

if (info.size > MAX_BYTES) {
  throw new Error(
    `${destination} is ${info.size} bytes, over the ${MAX_BYTES} byte limit`,
  );
}

const handle = await open(destination, 'r');
let header: Buffer;
try {
  header = Buffer.alloc(PNG_SIGNATURE.length);
  const { bytesRead } = await handle.read(header, 0, header.length, 0);
  if (bytesRead !== header.length) {
    throw new Error(
      `${destination} is only ${bytesRead} bytes, too short to be a PNG`,
    );
  }
} finally {
  await handle.close();
}

if (!header.equals(PNG_SIGNATURE)) {
  throw new Error(
    `${destination} does not start with the PNG signature ` +
      `(89 50 4E 47 0D 0A 1A 0A), got ${header.toString('hex').match(/../g)?.join(' ')}`,
  );
}

const digest = createHash('sha256').update(await readFile(destination)).digest('hex');

console.log(`${destination} ${info.size} bytes sha256:${digest}`);
