#!/usr/bin/env node
/* eslint-disable no-console */
import * as path from 'path';
import * as readline from 'readline';
import * as fs from 'fs';
import * as util from 'util';

import { executeQueryFromObject } from '.';
import { read } from './Reader';
import { createArgsParser } from './ArgsParser';
import { executeMetaCommand } from './MetaInterface';
import { createObjectDataSource } from './ObjectDataSource';

const startRepl = (inputPath: string) => {
  const dataset = read(fs.readFileSync(inputPath, 'utf8'));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.setPrompt('sunda> ');
  rl.prompt();
  rl.on('line', async (input: string) => {
    const firstCharacter = input.substring(0, 1);

    try {
      if (firstCharacter === '!') {
        // This is a MetaInterface command
        await executeMetaCommand(input.substring(1), createObjectDataSource(dataset), console.log);
      } else {
        console.log(util.inspect(await executeQueryFromObject(input, dataset), false, 10, true));
      }
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

export const runCli = (): void => {
  const { parser: argsParser, dumpUsage } = createArgsParser([
    {
      key: 'version',
      longhand: '--version',
      shorthand: '-v',
      description: 'prints version information',
      noInput: true,
    },
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

  const { outputPath, inputPath, query, help, version } = parserOutput;

  if (version) {
    const packageJSON = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../package.json')).toString(),
    );
    console.log(`Running sunda version ${packageJSON.version}`);
    process.exit(0);
  }

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
};

runCli();
