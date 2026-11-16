import { createHash } from 'node:crypto';
import {
  closeSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  statSync,
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PNG_SIGNATURE = Buffer.from('89504e470d0a1a0a', 'hex');
const SIZE_CAP = 1024 * 1024;

const sourcePath = fileURLToPath(new URL('entry.png', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
const targetPath = join(outputDir, 'entry.png');

/**
 * Reads the leading bytes of a file without pulling the whole thing into memory.
 */
function readHead(file: string, length: number): Buffer {
  const fd = openSync(file, 'r');
  const head = Buffer.alloc(length);
  try {
    const got = readSync(fd, head, 0, length, 0);
    if (got < length) {
      throw new Error(
        `copied file ${file} is truncated: only ${got} of ${length} signature bytes are readable`,
      );
    }
  } finally {
    closeSync(fd);
  }
  return head;
}

/**
 * Confirms that the copy on disk is a PNG-shaped regular file within the size cap,
 * and returns its byte length. Any defect throws with a description of the defect.
 */
function assertValidCopy(file: string): number {
  if (!existsSync(file)) {
    throw new Error(`no file was written at ${file}`);
  }

  const stats = statSync(file);
  if (!stats.isFile()) {
    throw new Error(`path ${file} is not a regular file`);
  }
  if (stats.size > SIZE_CAP) {
    throw new Error(
      `file ${file} is ${stats.size} bytes, which exceeds the ${SIZE_CAP} byte ceiling`,
    );
  }

  const head = readHead(file, PNG_SIGNATURE.length);
  if (!head.equals(PNG_SIGNATURE)) {
    throw new Error(
      `file ${file} lacks the PNG signature 89 50 4e 47 0d 0a 1a 0a; found ${head.toString('hex')}`,
    );
  }

  return stats.size;
}

mkdirSync(outputDir, { recursive: true });
copyFileSync(sourcePath, targetPath);

const bytes = assertValidCopy(targetPath);
const digest = createHash('sha256').update(readFileSync(targetPath)).digest('hex');

console.log(`${targetPath} | ${bytes} bytes | sha256 ${digest}`);
