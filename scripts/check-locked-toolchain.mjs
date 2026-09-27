import fs from 'node:fs';

const nodeVersion = fs.readFileSync('.node-version', 'utf8').trim();
const nvmVersion = fs.readFileSync('.nvmrc', 'utf8').trim();
const expectedNpm = '11.19.0'; // Bundled with upstream Node 24.21.0 and locked Nixpkgs.
const npmVersion = process.env.npm_config_user_agent?.match(/(?:^|\s)npm\/(\d+\.\d+\.\d+)/)?.[1];

if (nodeVersion !== nvmVersion || process.versions.node !== nodeVersion || npmVersion !== expectedNpm) {
  console.error(`Locked toolchain mismatch: .node-version=${nodeVersion}, .nvmrc=${nvmVersion}, ` +
    `node=${process.versions.node}, npm=${npmVersion ?? '(run through npm)'}, expected npm=${expectedNpm}`);
  process.exitCode = 1;
} else {
  console.log(`Locked toolchain: Node ${nodeVersion}, npm ${npmVersion}`);
}
