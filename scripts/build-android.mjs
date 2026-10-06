import { spawnSync } from 'node:child_process';
import { mkdirSync, copyFileSync } from 'node:fs';
const win = process.platform === 'win32';
const args = ['assembleDebug', '--no-daemon', '--max-workers=2'];
const result = win
  ? spawnSync('cmd.exe', ['/d', '/c', 'gradlew.bat', ...args], { cwd: 'android', stdio: 'inherit' })
  : spawnSync('sh', ['./gradlew', ...args], { cwd: 'android', stdio: 'inherit' });
if (result.error) { console.error(result.error.message); process.exit(1); }
if (result.status !== 0) process.exit(result.status || 1);
mkdirSync('outputs', { recursive: true });
copyFileSync('android/app/build/outputs/apk/debug/app-debug.apk', 'outputs/ZolNutrition-debug.apk');
console.log('APK: outputs/ZolNutrition-debug.apk');
