#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const fsp = fs.promises;
const http = require('node:http');
const https = require('node:https');
const os = require('node:os');
const path = require('node:path');
const { pipeline } = require('node:stream');
const { promisify } = require('node:util');
const { spawn, spawnSync } = require('node:child_process');

const pipelineAsync = promisify(pipeline);
const PACKAGE_ROOT = path.resolve(__dirname);
const PACKAGE_JSON = require(path.join(PACKAGE_ROOT, 'package.json'));
const PACKAGE_VERSION = PACKAGE_JSON.version;
const RELEASE_TAG = PACKAGE_VERSION.startsWith('v') ? PACKAGE_VERSION : `v${PACKAGE_VERSION}`;
const DEFAULT_BASE_URL = 'https://github.com/VSCodium/native-keymap/releases/download';
const LOCAL_CHECKSUM_PATH = path.join(PACKAGE_ROOT, 'checksum.txt');

async function main() {
  const intent = computeDownloadIntent();
  if (!intent.shouldDownload) {
    runNodeGypRebuild(intent.reason);
    return;
  }

  try {
    const destination = await downloadPrebuilt(intent.platform, intent.arch);
    console.log(`[native-keymap] Installed prebuilt binary to ${destination}`);
  } catch (error) {
    console.warn(`[native-keymap] Unable to download prebuilt binary (${error.message}). Falling back to source build.`);
    runNodeGypRebuild();
  }
}

function computeDownloadIntent() {
  if (shouldForceSourceBuild()) {
    return { shouldDownload: false, reason: 'download explicitly disabled' };
  }

  const platform = resolvePlatform();
  if (!platform) {
    return { shouldDownload: false, reason: `unsupported platform (${process.platform})` };
  }

  const arch = resolveArch();
  if (!arch) {
    return { shouldDownload: false, reason: `unsupported architecture (${process.arch})` };
  }

  return { shouldDownload: true, platform, arch };
}

function shouldForceSourceBuild() {
  if (isFalse(process.env.npm_config_build_from_source_native_keymap)) {
    return false;
  }

  return isTrue(process.env.NATIVE_KEYMAP_SKIP_PREBUILT) ||
    isTrue(process.env.npm_config_build_from_source) ||
    isTrue(process.env.BUILD_FROM_SOURCE) ||
    isTrue(process.env.npm_config_build_from_source_native_keymap);
}

function isFalse(value) {
  if (!value) {
    return false;
  }
  const normalized = String(value).toLowerCase();
  return normalized === '0' || normalized === 'false' || normalized === 'no';
}

function isTrue(value) {
  if (!value) {
    return false;
  }
  const normalized = String(value).toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function resolvePlatform() {
  const rawPlatform = (process.env.npm_config_platform || process.platform || '').toLowerCase();
  switch (rawPlatform) {
    case 'linux':
      return 'linux';
    case 'darwin':
      return 'darwin';
    case 'win32':
      return 'win32';
    default:
      return null;
  }
}

function resolveArch() {
  const rawArch = (process.env.npm_config_target_arch || process.env.npm_config_arch || process.arch || '').toLowerCase();
  switch (rawArch) {
    case 'x64':
      return 'x64';
    case 'arm64':
    case 'aarch64':
      return 'arm64';
    case 'arm':
    case 'armhf':
    case 'armv7l':
      return 'armhf';
    case 'riscv64':
      return 'riscv64';
    case 'loong64':
    case 'loongarch64':
      return 'loong64';
    case 'ppc64':
    case 'ppc64le':
      return 'ppc64le';
    case 's390x':
      return 's390x';
    default:
      return null;
  }
}

async function downloadPrebuilt(platform, arch) {
  const assetName = `native-keymap-${PACKAGE_VERSION}-${platform}-${arch}.tar.gz`;
  const baseUrl = process.env.NATIVE_KEYMAP_PREBUILT_BASE_URL || DEFAULT_BASE_URL;
  const downloadUrl = `${baseUrl}/${RELEASE_TAG}/${assetName}`;
  console.log(`[native-keymap] Downloading ${assetName} (${platform}/${arch})`);

  const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'native-keymap-'));
  const archivePath = path.join(tmpDir, assetName);

  try {
    await downloadFile(downloadUrl, archivePath);
    const checksumRaw = await loadChecksumManifest();
    const expectedHash = parseChecksum(checksumRaw, assetName);
    await verifySha256(archivePath, expectedHash);
    await extractWithSystemTar(archivePath, tmpDir);
    const binaryPath = path.join(tmpDir, 'keymapping.node');
    await fsp.access(binaryPath, fs.constants.R_OK);

    const outputDir = path.join(PACKAGE_ROOT, 'build', 'Release');
    await fsp.mkdir(outputDir, { recursive: true });
    const destination = path.join(outputDir, 'keymapping.node');
    await fsp.copyFile(binaryPath, destination);
    return destination;
  } finally {
    await cleanup(tmpDir);
  }
}

async function downloadFile(url, destination) {
  const response = await httpGet(url);
  await pipelineAsync(response, fs.createWriteStream(destination));
}

async function loadChecksumManifest() {
  const content = await fsp.readFile(LOCAL_CHECKSUM_PATH, 'utf8');
  return content;
}

function httpGet(url, redirects = 0) {
  const parsedUrl = new URL(url);
  const client = parsedUrl.protocol === 'http:' ? http : https;
  const requestOptions = {
    protocol: parsedUrl.protocol,
    hostname: parsedUrl.hostname,
    port: parsedUrl.port,
    path: `${parsedUrl.pathname}${parsedUrl.search}`,
    headers: {
      'User-Agent': 'native-keymap-install-script',
      'Accept': '*/*'
    }
  };

  return new Promise((resolve, reject) => {
    const request = client.get(requestOptions, (response) => {
      const status = response.statusCode || 0;
      if (status >= 300 && status < 400 && response.headers.location) {
        response.resume();
        if (redirects > 5) {
          reject(new Error(`Too many redirects trying to reach ${url}`));
          return;
        }
        const redirectUrl = new URL(response.headers.location, parsedUrl).toString();
        resolve(httpGet(redirectUrl, redirects + 1));
        return;
      }
      if (status !== 200) {
        response.resume();
        reject(new Error(`Request to ${url} failed with status ${status}`));
        return;
      }
      resolve(response);
    });

    request.on('error', reject);
  });
}

function parseChecksum(raw, assetName) {
  const entries = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (entries.length === 0) {
    throw new Error('Checksum file is empty');
  }

  for (const entry of entries) {
    const [hash, ...rest] = entry.split(/\s+/);
    if (!hash) {
      continue;
    }
    const target = rest.join(' ');
    if (target === assetName) {
      return hash.toLowerCase();
    }
  }

  throw new Error(`Unable to find checksum entry for ${assetName}`);
}

async function verifySha256(filePath, expectedHash) {
  const hash = crypto.createHash('sha256');
  await new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', resolve);
  });
  const digest = hash.digest('hex');
  if (digest !== expectedHash) {
    throw new Error(`Checksum mismatch (expected ${expectedHash}, got ${digest})`);
  }
}

async function extractWithSystemTar(archivePath, destinationDir) {
  await new Promise((resolve, reject) => {
    const args = ['-xzf', archivePath, '-C', destinationDir];
    const child = spawn('tar', args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`tar exited with code ${code}`));
        return;
      }
      resolve();
    });
  });
}

async function cleanup(dirPath) {
  if (!dirPath) {
    return;
  }
  try {
    await fsp.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    console.warn(`[native-keymap] Unable to cleanup temporary files: ${error.message}`);
  }
}

function runNodeGypRebuild(reason) {
  if (reason) {
    console.log(`[native-keymap] Skipping prebuilt download: ${reason}`);
  }
  const nodeGypScript = process.env.npm_config_node_gyp;
  const exec = nodeGypScript ? process.execPath : (process.platform === 'win32' ? 'node-gyp.cmd' : 'node-gyp');
  const args = nodeGypScript ? [nodeGypScript, 'rebuild'] : ['rebuild'];
  const result = spawnSync(exec, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error('node-gyp rebuild failed');
  }
}

main().catch((error) => {
  console.error(`[native-keymap] Installation failed: ${error.stack || error.message}`);
  process.exit(1);
});
