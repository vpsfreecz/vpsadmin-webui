#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function parseOptions(args) {
  const options = { webuiRef: 'HEAD' };
  const seen = new Set();
  const keys = new Map([
    ['--package', 'packagePath'],
    ['--webui-ref', 'webuiRef'],
    ['--haveapi-ref', 'haveapiRef'],
  ]);
  for (let i = 0; i < args.length; i++) {
    const key = keys.get(args[i]);
    if (!key || !args[i + 1] || args[i + 1].startsWith('--') || seen.has(key)) {
      throw new Error(`Invalid or duplicate argument: ${args[i]}`);
    }
    seen.add(key);
    options[key] = args[++i];
  }
  if (!options.packagePath || !path.isAbsolute(options.packagePath) || !options.packagePath.endsWith('.tgz')) {
    throw new Error('--package must be an absolute .tgz path');
  }
  if (options.haveapiRef && !/^[a-f0-9]{40}$/.test(options.haveapiRef))
    throw new Error('--haveapi-ref must be a full commit SHA');
  return options;
}

export function candidateProvenance(supplied, gitHead) {
  if (gitHead && !/^[a-f0-9]{40}$/.test(gitHead)) throw new Error('Candidate gitHead must be a full commit SHA');
  if (supplied && gitHead && supplied !== gitHead) throw new Error('--haveapi-ref disagrees with candidate gitHead');
  if (!supplied && !gitHead) throw new Error('Candidate has no gitHead; provide --haveapi-ref from the pack owner');
  return {
    haveapiRef: supplied || gitHead,
    provenance: supplied ? 'pack-owner assertion' : 'package gitHead metadata',
  };
}

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const readJson = async (filename) => JSON.parse(await readFile(filename, 'utf8'));

/** Capture only lock-listed packages installed on this platform after npm ci. */
async function captureInstallBaseline(directory) {
  const files = {};
  for (const filename of ['package.json', 'package-lock.json']) {
    files[filename] = sha256(await readFile(path.join(directory, filename)));
  }
  const lock = await readJson(path.join(directory, 'package-lock.json'));
  const packages = [];
  for (const [relative, expected] of Object.entries(lock.packages)) {
    if (!relative.startsWith('node_modules/')) continue;
    const installedPath = path.join(directory, relative);
    try {
      await stat(installedPath);
    } catch (error) {
      if (error.code === 'ENOENT') continue; // Platform-optional packages can be absent.
      throw error;
    }
    const installed = await readJson(path.join(installedPath, 'package.json'));
    if (
      typeof installed.name !== 'string' ||
      typeof installed.version !== 'string' ||
      installed.version !== expected.version
    ) {
      throw new Error(`Installed baseline disagrees with lock: ${relative}`);
    }
    packages.push({ path: relative, name: installed.name, version: installed.version });
  }
  return { files, packages };
}

/** Candidate dependencies may add paths, while the existing locked graph stays fixed. */
async function verifyInstallBaseline(directory, baseline) {
  for (const [filename, expected] of Object.entries(baseline.files)) {
    if (sha256(await readFile(path.join(directory, filename))) !== expected) {
      throw new Error(`Candidate install changed ${filename}`);
    }
  }
  for (const expected of baseline.packages) {
    let installed;
    try {
      installed = await readJson(path.join(directory, expected.path, 'package.json'));
    } catch (error) {
      if (error.code === 'ENOENT') throw new Error(`Candidate install removed locked package: ${expected.path}`);
      throw error;
    }
    if (installed.name !== expected.name || installed.version !== expected.version) {
      throw new Error(`Candidate install changed locked package: ${expected.path}`);
    }
  }
}

// Forward cancellation to the whole owned subprocess group, including a Vite child.
export async function run(command, args, cwd) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit', detached: true });
    const stop = (signal) => {
      try {
        process.kill(-child.pid, signal);
      } catch {}
    };
    const interrupt = () => stop('SIGINT');
    const terminate = () => stop('SIGTERM');
    process.on('SIGINT', interrupt);
    process.on('SIGTERM', terminate);
    const cleanup = () => {
      process.off('SIGINT', interrupt);
      process.off('SIGTERM', terminate);
    };
    child.once('error', (error) => {
      cleanup();
      reject(error);
    });
    child.once('exit', (code, signal) => {
      cleanup();
      if (code === 0) resolve();
      else reject(new Error(`${command} exited ${code ?? signal}`));
    });
  });
}

export async function runPilot(
  options,
  { cwd = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), runCommand = run } = {}
) {
  if (!(await stat(options.packagePath)).isFile()) throw new Error('Candidate must be a regular file');
  const git = (args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  const webuiRef = git(['rev-parse', '--verify', '--end-of-options', `${options.webuiRef}^{commit}`]);
  const candidateBytes = await readFile(options.packagePath);
  const tarSha256 = sha256(candidateBytes);
  // Nix shells remove their TMPDIR on exit; retain pilot evidence outside it.
  const directory = await mkdtemp(path.join(process.env.HAVEAPI_PACKAGE_TMPDIR || '/tmp', 'webui-haveapi-package-'));
  const sourceDirectory = path.join(directory, 'source');
  await mkdir(sourceDirectory);
  const candidatePath = path.join(directory, 'candidate.tgz');
  await writeFile(candidatePath, candidateBytes);
  const report = {
    directory,
    sourceDirectory,
    webuiRef,
    tarSha256,
    packagePath: options.packagePath,
    node: process.version,
    status: 'incomplete',
  };
  const record = () => writeFile(path.join(directory, 'result.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`Package pilot artifacts: ${directory}`);
  try {
    // Read only committed objects. The caller's worktree, index and lockfile are untouched.
    await runCommand(
      'git',
      ['archive', '--format=tar', `--output=${path.join(directory, 'source.tar')}`, webuiRef],
      cwd
    );
    await runCommand('tar', ['-xf', path.join(directory, 'source.tar')], sourceDirectory);
    report.npm = execFileSync('npm', ['--version'], { cwd, encoding: 'utf8' }).trim();
    await runCommand('npm', ['ci'], sourceDirectory);
    const baseline = await captureInstallBaseline(sourceDirectory);
    await writeFile(path.join(directory, 'dependency-baseline.json'), JSON.stringify(baseline, null, 2) + '\n');
    report.lockedGraph = { packageCount: baseline.packages.length, files: baseline.files };
    await runCommand(
      'npm',
      ['install', '--ignore-scripts', '--no-save', '--package-lock=true', candidatePath],
      sourceDirectory
    );
    await verifyInstallBaseline(sourceDirectory, baseline);
    const pkg = JSON.parse(
      await readFile(path.join(sourceDirectory, 'node_modules/haveapi-client/package.json'), 'utf8')
    );
    if (pkg.name !== 'haveapi-client') throw new Error('Candidate is not haveapi-client');
    Object.assign(report, candidateProvenance(options.haveapiRef, pkg.gitHead), { packageVersion: pkg.version });
    for (const name of ['typescript', 'vite', '@playwright/test']) {
      const metadata = JSON.parse(
        await readFile(path.join(sourceDirectory, 'node_modules', name, 'package.json'), 'utf8')
      );
      (report.tools ??= {})[name] = metadata.version;
    }
    await record();
    await runCommand(
      'node',
      ['node_modules/typescript/bin/tsc', '-p', 'scripts/haveapi-package/tsconfig.json'],
      sourceDirectory
    );
    await runCommand(
      'node',
      ['node_modules/vite/bin/vite.js', 'build', '--config', 'scripts/haveapi-package/vite.config.ts'],
      sourceDirectory
    );
    await runCommand(
      'node',
      ['scripts/playwright.mjs', 'test', '--config', 'scripts/haveapi-package/playwright.config.ts'],
      sourceDirectory
    );
    report.status = 'passed';
  } catch (error) {
    report.status = 'failed';
    report.error = error.message;
    throw error;
  } finally {
    await record();
    console.log(`Package pilot result: ${path.join(directory, 'result.json')}`);
  }
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    await runPilot(parseOptions(process.argv.slice(2)));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
