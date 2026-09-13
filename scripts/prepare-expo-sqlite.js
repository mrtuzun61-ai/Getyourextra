const fs = require('fs');
const path = require('path');
const https = require('https');

if (process.env.EAS_BUILD_PLATFORM !== 'android') {
  console.log('[expo-sqlite] Android EAS build patch skipped.');
  process.exit(0);
}

const root = path.resolve(__dirname, '..');
const sqliteAndroidDir = path.join(root, 'node_modules', 'expo-sqlite', 'android');
const gradlePath = path.join(sqliteAndroidDir, 'build.gradle');
const sourceDir = path.join(sqliteAndroidDir, 'sqlite3_src_patched');

const files = [
  {
    name: 'sqlite3.c',
    url: 'https://raw.githubusercontent.com/expo/expo/sdk-52/packages/expo-sqlite/vendor/sqlite3/sqlite3.c',
    minBytes: 8_000_000,
  },
  {
    name: 'sqlite3.h',
    url: 'https://raw.githubusercontent.com/expo/expo/sdk-52/packages/expo-sqlite/vendor/sqlite3/sqlite3.h',
    minBytes: 500_000,
  },
];

function download(url, destination, redirects = 0) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          'User-Agent': 'GetYourExtra-EAS-Build',
          Accept: 'application/octet-stream',
        },
      },
      (response) => {
        const status = response.statusCode || 0;
        if ([301, 302, 303, 307, 308].includes(status) && response.headers.location) {
          response.resume();
          if (redirects >= 5) {
            reject(new Error(`Too many redirects while downloading ${url}`));
            return;
          }
          resolve(download(new URL(response.headers.location, url).toString(), destination, redirects + 1));
          return;
        }

        if (status < 200 || status >= 300) {
          response.resume();
          reject(new Error(`HTTP ${status} while downloading ${url}`));
          return;
        }

        const temp = `${destination}.tmp`;
        const output = fs.createWriteStream(temp);
        response.pipe(output);
        output.on('finish', () => {
          output.close(() => {
            fs.renameSync(temp, destination);
            resolve();
          });
        });
        output.on('error', reject);
      }
    );

    request.setTimeout(60_000, () => request.destroy(new Error(`Timeout downloading ${url}`)));
    request.on('error', reject);
  });
}

async function downloadWithRetry(file, attempts = 4) {
  const destination = path.join(sourceDir, file.name);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      console.log(`[expo-sqlite] Downloading ${file.name} from Expo's GitHub mirror (attempt ${attempt}/${attempts})...`);
      await download(file.url, destination);
      const size = fs.statSync(destination).size;
      if (size < file.minBytes) {
        throw new Error(`${file.name} is unexpectedly small (${size} bytes)`);
      }

      // Expo SDK 52 vendors the same SQLite 3.45.3 amalgamation but renames
      // public symbols from sqlite3_* to exsqlite3_* to avoid collisions.
      // Expo SDK 51's native wrapper expects the canonical sqlite3_* API.
      // Restore the original symbol names before compiling.
      const original = fs.readFileSync(destination, 'utf8');
      const restored = original.replace(/exsqlite3/g, 'sqlite3');
      if (restored === original) {
        throw new Error(`${file.name} did not contain Expo-prefixed SQLite symbols`);
      }
      fs.writeFileSync(destination, restored);

      console.log(`[expo-sqlite] ${file.name} ready with canonical sqlite3 symbols (${size} bytes).`);
      return;
    } catch (error) {
      if (fs.existsSync(destination)) fs.rmSync(destination, { force: true });
      if (attempt === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
    }
  }
}

async function main() {
  if (!fs.existsSync(gradlePath)) {
    throw new Error(`expo-sqlite Android build.gradle not found at ${gradlePath}`);
  }

  fs.mkdirSync(sourceDir, { recursive: true });
  for (const file of files) {
    await downloadWithRetry(file);
  }

  let gradle = fs.readFileSync(gradlePath, 'utf8');
  const originalSourceDir = 'def SQLITE3_SRC_DIR = new File("$buildDir/sqlite3_src")';
  const patchedSourceDir = 'def SQLITE3_SRC_DIR = new File("$projectDir/sqlite3_src_patched")';
  const originalDependency = 'nativeBuildDependsOn(project, prepareSQLite)';
  const patchedDependency = 'nativeBuildDependsOn(project, createNativeDepsDirectories)';

  if (gradle.includes(originalSourceDir)) {
    gradle = gradle.replace(originalSourceDir, patchedSourceDir);
  } else if (!gradle.includes(patchedSourceDir)) {
    throw new Error('Could not locate expo-sqlite SQLITE3_SRC_DIR in build.gradle');
  }

  if (gradle.includes(originalDependency)) {
    gradle = gradle.replace(originalDependency, patchedDependency);
  } else if (!gradle.includes(patchedDependency)) {
    throw new Error('Could not locate expo-sqlite prepareSQLite dependency in build.gradle');
  }

  fs.writeFileSync(gradlePath, gradle);
  console.log('[expo-sqlite] Patched Android build to use SQLite 3.45.3 sources from Expo GitHub with SDK 51-compatible symbol names.');
}

main().catch((error) => {
  console.error('[expo-sqlite] Build preparation failed:', error);
  process.exit(1);
});
