import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.dirname(fileURLToPath(import.meta.url));
const [input, output, option] = process.argv.slice(2);
if (!input || !output || (option && option !== '--overwrite')) throw new Error('Usage: node finalize-video.mjs input.mp4 output.mp4 [--overwrite]');
if (path.resolve(input) === path.resolve(output)) throw new Error('Input and output must differ; preserve the candidate video.');
const metadata = JSON.parse(fs.readFileSync(path.join(root, 'media-metadata.json'), 'utf8'));
execFileSync(process.env.FFMPEG_PATH || '/opt/homebrew/bin/ffmpeg', [
  '-hide_banner', '-loglevel', 'error', '-i', path.resolve(input),
  '-i', path.join(root, 'assets/film-mix.wav'), '-map', '0:v:0', '-map', '1:a:0',
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-aac_pns', '0', '-aac_is', '0',
  '-ar', '48000', '-t', String(metadata.duration), '-movflags', '+faststart',
  option === '--overwrite' ? '-y' : '-n', path.resolve(output)
], {stdio:'inherit'});
console.log(`Finalized ${path.resolve(output)} with unchanged video and the verified PCM mix.`);
