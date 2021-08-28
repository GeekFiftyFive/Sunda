#!/usr/bin/env node

/* eslint-disable no-console */
import * as readline from 'readline';
import * as fs from 'fs';
import { execute } from './Executor';
import { parse } from './Parser';
import { tokenise } from './Tokeniser';
import { read } from './Reader';
import { createObjectDataSource } from './ObjectDataSource';

export * from './CommonTypes';

export const executeQuery = async <T>(
  query: string,
  data: Record<string, unknown[]>,
): Promise<T[]> => {
  const tokens = tokenise(query);
  const parsedQuery = parse(tokens);
  return execute<T>(parsedQuery, createObjectDataSource(data));
};

if (require.main === module) {
  if (process.argv.length < 3) {
    console.error('Usage: sunda <input-path>');
    process.exit(1);
  }
  const inputPath = process.argv[2];
  const dataset = read(fs.readFileSync(inputPath, 'utf8'));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.setPrompt('sunda> ');
  rl.prompt();
  rl.on('line', async (input: string) => {
    try {
      console.log(await executeQuery(input, dataset));
    } catch (e) {
      console.error(e.message);
    }
    rl.prompt();
  });
  rl.on('close', process.exit);
}
