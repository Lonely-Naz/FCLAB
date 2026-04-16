import { cp, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const output = join(root, 'dist');
const files = ['index.html', 'about.html', 'portfolio.html', 'thoughts.html'];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const file of files) {
  await cp(join(root, file), join(output, file));
}

await cp(join(root, 'assets'), join(output, 'assets'), { recursive: true });
