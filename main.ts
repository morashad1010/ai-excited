import { createHash } from 'node:crypto';
import { copyFile, mkdir, open, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Leading bytes every PNG file starts with, kept as a byte array for comparison. */
const PNG_MAGIC = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);

/** Hard ceiling for the delivered artwork: 1 MiB. */
const BYTE_BUDGET = 1_048_576;

const FALLBACK_OUTPUT_DIR = '/output';

interface Delivery {
  readonly destination: string;
  readonly bytes: number;
  readonly sha256: string;
}

function artworkSource(): string {
  return fileURLToPath(new URL('./entry.png', import.meta.url));
}

function outputDirectory(): string {
  const configured = process.env.MAKEFUN_OUTPUT_DIR?.trim();
  return configured && configured.length > 0 ? configured : FALLBACK_OUTPUT_DIR;
}

async function prepareDirectory(directory: string): Promise<void> {
  await mkdir(directory, { recursive: true });
}

async function placeArtwork(source: string, destination: string): Promise<void> {
  await copyFile(source, destination);
}

/** Throws unless the path resolves to a real file; returns its byte length. */
async function requireRegularFile(path: string): Promise<number> {
  const info = await stat(path).catch((cause: unknown) => {
    throw new Error(`nothing readable at ${path}`, { cause });
  });
  if (!info.isFile()) {
    throw new Error(`${path} exists but is not a regular file`);
  }
  return info.size;
}

/** Throws unless the first eight bytes match the PNG signature exactly. */
async function requirePngMagic(path: string): Promise<void> {
  const handle = await open(path, 'r');
  try {
    const head = Buffer.alloc(PNG_MAGIC.length);
    const { bytesRead } = await handle.read(head, 0, head.length, 0);
    if (bytesRead !== head.length || !head.equals(Buffer.from(PNG_MAGIC))) {
      const seen = head.subarray(0, bytesRead).toString('hex') || '(empty)';
      throw new Error(`${path} is not a PNG: leading bytes ${seen}`);
    }
  } finally {
    await handle.close();
  }
}

/** Throws when the copy is heavier than the competition allows. */
function requireWithinBudget(size: number, path: string): void {
  if (size > BYTE_BUDGET) {
    throw new Error(`${path} weighs ${size} bytes, over the ${BYTE_BUDGET} byte limit`);
  }
}

/** Streams the file through sha256 in fixed-size chunks. */
async function digestOf(path: string): Promise<string> {
  const handle = await open(path, 'r');
  try {
    const hash = createHash('sha256');
    const chunk = Buffer.allocUnsafe(64 * 1024);
    let offset = 0;
    for (;;) {
      const { bytesRead } = await handle.read(chunk, 0, chunk.length, offset);
      if (bytesRead === 0) break;
      hash.update(chunk.subarray(0, bytesRead));
      offset += bytesRead;
    }
    return hash.digest('hex');
  } finally {
    await handle.close();
  }
}

async function deliver(): Promise<Delivery> {
  const source = artworkSource();
  const directory = outputDirectory();
  const destination = join(directory, 'entry.png');

  await prepareDirectory(directory);
  await placeArtwork(source, destination);

  const bytes = await requireRegularFile(destination);
  await requirePngMagic(destination);
  requireWithinBudget(bytes, destination);

  return { destination, bytes, sha256: await digestOf(destination) };
}

function report({ destination, bytes, sha256 }: Delivery): void {
  process.stdout.write(`${destination} | ${bytes} bytes | sha256 ${sha256}\n`);
}

deliver().then(report, (error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
