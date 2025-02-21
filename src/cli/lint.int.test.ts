import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import stream from 'stream';

import { copy } from 'fs-extra';

import { lint } from './lint';

jest.setTimeout(30_000);

const stdoutMock = jest.fn();

jest
  .spyOn(console, 'log')
  .mockImplementation((...args) => stdoutMock(`${args.join(' ')}\n`));

const tscOutputStream = new stream.PassThrough().on('data', stdoutMock);

const BASE_PATH = path.join(__dirname, '..', '..', 'integration', 'base');

const TEMP_PATH = path.join(__dirname, '..', '..', 'integration', 'lint');

const stdout = (randomMatcher: RegExp) =>
  stdoutMock.mock.calls
    .flat(1)
    .join('')
    .replace(/ in [\d\.]+s\./g, ' in <random>s.')
    .replace(
      /tsc      \| Lines of ([^:]+):[ ]+\d+/g,
      'tsc      | Lines of $1: <random>',
    )
    .replace(
      /tsc      \| Nodes of ([^:]+):[ ]+\d+/g,
      'tsc      | Nodes of $1: <random>',
    )
    .replace(
      /tsc      \| (Files|Identifiers|Symbols|Types|Instantiations|Memory used):[ ]+\d+/g,
      'tsc      | $1: <random>',
    )
    .replace(
      /tsc      \| (.+) cache size:[ ]+\d+/g,
      'tsc      | $1 cache size: <random>',
    )
    .replace(
      /tsc      \| (.+) time:[ ]+[\d\.]+s/g,
      'tsc      | $1 time: <random>s',
    )
    .replace(randomMatcher, '<random>');

const prepareTempDirectory = async (baseDir: string, tempDir: string) => {
  await copy(baseDir, tempDir, { recursive: true });

  process.chdir(tempDir);
};

const originalCwd = process.cwd();

beforeEach(() => {
  jest.clearAllMocks();

  process.exitCode = undefined;
});

afterAll(() => {
  // Restore the original working directory to avoid confusion in other tests.
  process.chdir(originalCwd);

  // Clean up temporary directories to avoid subsequent formatting and linting
  // warnings and to save on disk space. This can be commented out to inspect
  // the output.
  return fs.promises.rm(TEMP_PATH, {
    force: true,
    recursive: true,
  });
});

interface Args {
  args: string[];
  base: string;
  exitCode: number | undefined;
}

test.each`
  description     | args           | base           | exitCode
  ${'fixable'}    | ${[]}          | ${'fixable'}   | ${1}
  ${'ok'}         | ${[]}          | ${'ok'}        | ${undefined}
  ${'ok --debug'} | ${['--debug']} | ${'ok'}        | ${undefined}
  ${'unfixable'}  | ${[]}          | ${'unfixable'} | ${1}
`('$description', async ({ args, base, exitCode }: Args) => {
  const baseDir = path.join(BASE_PATH, base);

  const tempDir = path.join(
    TEMP_PATH,
    `${base}-${crypto.randomBytes(32).toString('hex')}`,
  );

  await prepareTempDirectory(baseDir, tempDir);

  await expect(
    // Force `--serial` as worker threads can't run in a TypeScript context.
    lint([...args, '--serial'], tscOutputStream),
  ).resolves.toBeUndefined();

  expect(stdout(new RegExp(tempDir, 'g'))).toMatchSnapshot();

  expect(process.exitCode).toBe(exitCode);
});
