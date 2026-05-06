import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

export async function readTextIfExists(filePath: string): Promise<string | undefined> {
  if (!(await pathExists(filePath))) {
    return undefined;
  }

  return readFile(filePath, "utf8");
}

export async function readJsonIfExists<T>(filePath: string): Promise<T | undefined> {
  const text = await readTextIfExists(filePath);
  if (!text) {
    return undefined;
  }

  return JSON.parse(text) as T;
}

export async function writeJson(filePath: string, value: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function writeText(filePath: string, value: string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

export function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}
