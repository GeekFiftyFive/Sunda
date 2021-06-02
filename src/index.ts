/* eslint-disable no-console */
import * as readline from 'readline';
import * as fs from 'fs';
import { execute } from './Executor';
import { parse } from './Parser';
import { tokenise } from './Tokeniser';

if (process.argv.length < 3) {
  console.error('Usage: squirrel <input-path>');
  process.exit(1);
}

const inputPath = process.argv[2];
const dataset = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

export const executeQuery = <T>(query: string, data: Record<string, unknown[]>): T[] => {
  const tokens = tokenise(query);
  const parsedQuery = parse(tokens);
  return execute<T>(parsedQuery, data);
};

rl.setPrompt('squirrel> ');
rl.prompt();
rl.on('line', (input: string) => {
  console.log(executeQuery(input, dataset));
  rl.prompt();
});
rl.on('close', process.exit);
