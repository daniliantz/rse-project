#!/usr/bin/env node
import path from "node:path";
import pc from "picocolors";
import { analyzeRepository } from "./analyze.js";
import { writeExtractionArtifacts } from "./artifacts.js";
import { runCodexExec } from "./codex.js";
import { detectSkillCandidates } from "./candidates.js";
import { findGitRoot, ensureCleanWorktree, createSkillBranch, getCurrentBranch } from "./git.js";
import { readTextIfExists } from "./fs.js";
import { writeCodexPrompt } from "./prompt.js";
import type { ExtractionRun } from "./types.js";

const VERSION = "0.1.0";

async function main(): Promise<void> {
  const { repoPath, baseBranch } = parseArgs(process.argv.slice(2));

  logStep(`Resolving target repository: ${repoPath}`);
  const repoRoot = await findGitRoot(repoPath);
  const resumed = await getResumableRun(repoRoot);
  if (resumed) {
    logStep(`Resuming existing extraction on ${resumed.branch}`);
    console.log(pc.green(`Using prompt: ${resumed.promptPath}`));
    await runCodexWithPrompt(repoRoot, resumed.prompt);
    return;
  }

  logStep("Checking target working tree is clean");
  await ensureCleanWorktree(repoRoot);

  logStep(`Creating skills branch from ${baseBranch}`);
  const skillBranch = await createSkillBranch(repoRoot, baseBranch);

  logStep("Analyzing repository patterns");
  const facts = await analyzeRepository(repoRoot);

  logStep("Detecting skill candidates");
  const { candidates, rejectedCandidates } = detectSkillCandidates(facts);

  const run: ExtractionRun = {
    tool: "repo-skill-extractor",
    generatedAt: new Date().toISOString(),
    baseBranch,
    skillBranch,
    facts,
    candidates,
    rejectedCandidates
  };

  logStep("Writing .skill-extraction artifacts");
  await writeExtractionArtifacts(run);
  const promptPath = await writeCodexPrompt(run);
  const prompt = await readTextIfExists(promptPath);
  if (!prompt) {
    throw new Error(`Prompt was not written: ${promptPath}`);
  }

  console.log(pc.green(`\nCreated branch: ${skillBranch}`));
  console.log(pc.green(`Wrote prompt: ${promptPath}`));
  console.log(pc.green(`Accepted candidates: ${candidates.length}`));
  console.log(pc.yellow(`Rejected candidates: ${rejectedCandidates.length}`));

  logStep("Running local Codex with full repository access");
  await runCodexWithPrompt(repoRoot, prompt);
}

async function getResumableRun(
  repoRoot: string
): Promise<{ branch: string; promptPath: string; prompt: string } | undefined> {
  const branch = await getCurrentBranch(repoRoot);
  const promptPath = path.join(repoRoot, ".skill-extraction", "codex-prompt.md");
  const prompt = await readTextIfExists(promptPath);

  if (branch.startsWith("rse/skills-") && prompt) {
    return { branch, promptPath, prompt };
  }

  return undefined;
}

async function runCodexWithPrompt(repoRoot: string, prompt: string): Promise<void> {
  await runCodexExec(repoRoot, prompt);
  console.log(pc.green("\nDone. Review AGENTS.md, .agents/skills, and .skill-extraction in the target repository."));
}

function parseArgs(args: string[]): { repoPath: string; baseBranch: string } {
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  if (args.includes("--version") || args.includes("-v")) {
    console.log(VERSION);
    process.exit(0);
  }

  const unknownFlag = args.find((arg) => arg.startsWith("-"));
  if (unknownFlag) {
    throw new Error(`Unknown option: ${unknownFlag}. This MVP intentionally supports only repoPath and baseBranch.`);
  }

  const [repoPath, baseBranch, ...extra] = args;
  if (!repoPath || !baseBranch || extra.length > 0) {
    printHelp();
    throw new Error("Expected exactly two arguments: <repoPath> <baseBranch>.");
  }

  return { repoPath, baseBranch };
}

function printHelp(): void {
  console.log(`repo-skill-extractor ${VERSION}

Usage:
  rse <repoPath> <baseBranch>

Example:
  rse /path/to/project main

What it does:
  - verifies the target Git worktree is clean
  - creates a new rse/skills-* branch from <baseBranch>
  - writes .skill-extraction artifacts
  - runs codex exec with full access so Codex can create AGENTS.md and .agents/skills
`);
}

function logStep(message: string): void {
  console.log(pc.cyan(`==> ${message}`));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(pc.red(`\nError: ${message}`));
  process.exitCode = 1;
});
