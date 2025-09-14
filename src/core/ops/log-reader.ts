import fs from 'fs';
import readline from 'readline';

export async function readLogTail(filePath: string, lines: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input });
    const buffer: string[] = [];

    rl.on('line', (line) => {
      buffer.push(line);
      if (buffer.length > lines) {
        buffer.shift();
      }
    });

    rl.on('close', () => {
      resolve(buffer.join('\n'));
    });

    rl.on('error', (err) => {
      reject(err);
    });
  });
}
