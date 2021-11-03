#!/usr/bin/env node

/* eslint-disable no-console */
import * as readline from 'readline';
import * as fs from 'fs';
import { execute } from './Executor';
import { parse } from './Parser';
import { tokenise } from './Tokeniser';
import { read } from './Reader';
import { createObjectDataSource } from './ObjectDataSource';
import { DataSource } from './CommonTypes';
import { createArgsParser } from './ArgsParser';

export * from './CommonTypes';

export const executeQuery = async <T>(query: string, datasource: DataSource): Promise<T[]> => {
  const tokens = tokenise(query);
  const parsedQuery = parse(tokens);
  return execute<T>(parsedQuery, datasource);
};

export const executeQueryFromObject = async <T>(
  query: string,
  data: Record<string, unknown[]>,
): Promise<T[]> => executeQuery<T>(query, createObjectDataSource(data));

const startRepl = (inputPath: string) => {
  const dataset = read(fs.readFileSync(inputPath, 'utf8'));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.setPrompt('sunda> ');
  rl.prompt();
  rl.on('line', async (input: string) => {
    try {
      console.log(await executeQueryFromObject(input, dataset));
    } catch (e) {
      console.error(e.message);
    }
    rl.prompt();
  });
  rl.on('close', process.exit);
};

const startStreamMode = async (query: string, inputPath?: string, outputPath?: string) => {
  const readStream = inputPath ? fs.createReadStream(inputPath) : process.stdin;
  const writeStream = outputPath ? fs.createWriteStream(outputPath) : process.stdout;

  const data = await new Promise<Record<string, unknown[]>>((resolve, reject) => {
    let accumulated = '';
    readStream.on('data', (chunk) => {
      accumulated += chunk.toString();
    });
    readStream.on('close', () => {
      resolve(JSON.parse(accumulated));
    });
    readStream.on('error', reject);
  });

  const queryResult = await executeQueryFromObject(query, data);

  await new Promise((resolve, reject) => {
    writeStream.write(JSON.stringify(queryResult));
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });

  writeStream.end();
};

if (require.main === module) {
  if (process.argv.length < 3) {
    console.error('Usage: sunda <input-path>');
    process.exit(1);
  }

  const argsParser = createArgsParser([
    {
      key: 'inputPath',
      default: true,
    },
    {
      key: 'outputPath',
      longhand: '--output',
      shorthand: '-o',
    },
    {
      key: 'query',
      longhand: '--query',
      shorthand: '-q',
    },
  ]);
  const { outputPath, inputPath, query } = argsParser(process.argv.slice(2));

  if (outputPath && inputPath && !query) {
    console.error('Cannot specify output location when running in REPL mode');
    process.exit(1);
  }

  if (!query) {
    startRepl(inputPath);
  } else {
    startStreamMode(query, inputPath, outputPath);
  }
}
