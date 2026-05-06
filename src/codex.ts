import path from "node:path";
import { homedir } from "node:os";
import { execa } from "execa";
import fg from "fast-glob";
import { pathExists } from "./fs.js";

export async function runCodexExec(repoRoot: string, prompt: string): Promise<void> {
  const codexBinary = await resolveCodexBinary();
  if (!codexBinary) {
    throw new Error(
      [
        "Codex CLI is not available as a normal executable.",
        "Set CODEX_BINARY to the full codex executable path or add codex to PATH.",
        "",
        "You can run the already generated prompt manually with:",
        buildManualCodexCommand(repoRoot)
      ].join("\n")
    );
  }

  const finalMessagePath = path.join(repoRoot, ".skill-extraction", "codex-final-response.md");
  const args = [
    "exec",
    "--cd",
    repoRoot,
    "--sandbox",
    "danger-full-access",
    "--dangerously-bypass-approvals-and-sandbox",
    "--output-last-message",
    finalMessagePath,
    "-"
  ];

  try {
    await execa(codexBinary, args, {
      input: prompt,
      stdout: "inherit",
      stderr: "inherit"
    });
  } catch (error) {
    const maybeNodeError = error as NodeJS.ErrnoException;
    if (maybeNodeError.code === "ENOENT") {
      throw new Error(
        [
          `Codex executable was resolved to ${codexBinary}, but it could not be launched.`,
          "Set CODEX_BINARY to the full codex executable path or add codex to PATH.",
          "",
          "You can run the already generated prompt manually with:",
          buildManualCodexCommand(repoRoot)
        ].join("\n")
      );
    }
    throw error;
  }
}

export function buildManualCodexCommand(repoRoot: string): string {
  const promptPath = path.join(repoRoot, ".skill-extraction", "codex-prompt.md");
  const finalMessagePath = path.join(repoRoot, ".skill-extraction", "codex-final-response.md");

  return [
    "codex exec",
    "--cd",
    shellQuote(repoRoot),
    "--sandbox danger-full-access",
    "--dangerously-bypass-approvals-and-sandbox",
    "--output-last-message",
    shellQuote(finalMessagePath),
    "-",
    "<",
    shellQuote(promptPath)
  ].join(" ");
}

async function resolveCodexBinary(): Promise<string | undefined> {
  const configured = process.env.CODEX_BINARY;
  if (configured && (await pathExists(configured))) {
    return configured;
  }

  const fromPath = await commandOutput("which", ["codex"]);
  if (fromPath) {
    return fromPath;
  }

  const fromLoginShell = await commandOutput(process.env.SHELL || "/bin/sh", ["-lc", "command -v codex"]);
  if (fromLoginShell?.startsWith("/")) {
    return fromLoginShell;
  }

  const home = homedir();
  const knownCodexPaths = await fg(
    [
      ".vscode/extensions/openai.chatgpt-*/bin/*/codex",
      ".vscode-insiders/extensions/openai.chatgpt-*/bin/*/codex",
      ".cursor/extensions/openai.chatgpt-*/bin/*/codex"
    ],
    {
      cwd: home,
      absolute: true,
      onlyFiles: true,
      unique: true
    }
  );

  return knownCodexPaths.sort().at(-1);
}

async function commandOutput(command: string, args: string[]): Promise<string | undefined> {
  try {
    const { stdout } = await execa(command, args);
    return stdout.trim().split(/\r?\n/)[0];
  } catch {
    return undefined;
  }
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}
