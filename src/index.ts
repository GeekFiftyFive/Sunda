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
      resolve(read(accumulated));
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
  const { parser: argsParser, dumpUsage } = createArgsParser([
    {
      key: 'inputPath',
      default: true,
      description: 'input file name',
    },
    {
      key: 'outputPath',
      longhand: '--output',
      shorthand: '-o',
      description: 'Specifies a file to write query output to',
    },
    {
      key: 'query',
      longhand: '--query',
      shorthand: '-q',
      description: 'Query to run against the dataset',
    },
    {
      key: 'help',
      longhand: '--help',
      shorthand: '-h',
      description: 'Prints command usage',
      noInput: true,
    },
  ]);

  let parserOutput: Record<string, string | boolean>;

  try {
    parserOutput = argsParser(process.argv.slice(2));
  } catch (err) {
    console.error((err as { message: string }).message);
    process.exit(1);
  }

  const { outputPath, inputPath, query, help } = parserOutput;

  if (outputPath && inputPath && !query) {
    console.error('Cannot specify output location when running in REPL mode');
    process.exit(1);
  }

  if ((!outputPath && !inputPath && !query) || help) {
    dumpUsage('sunda', console.log);
    process.exit(1);
  }

  try {
    if (!query) {
      startRepl(inputPath as string);
    } else {
      startStreamMode(query as string, inputPath as string, outputPath as string);
    }
  } catch (err) {
    console.error((err as { message: string }).message);
    process.exit(1);
  }
}
