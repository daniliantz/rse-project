import { stat } from "node:fs/promises";
import path from "node:path";
import { execa } from "execa";

export async function findGitRoot(repoPath: string): Promise<string> {
  const resolved = path.resolve(repoPath);
  const stats = await stat(resolved).catch(() => undefined);
  if (!stats?.isDirectory()) {
    throw new Error(`Target path is not a directory: ${resolved}`);
  }

  const { stdout } = await execa("git", ["-C", resolved, "rev-parse", "--show-toplevel"]);
  return stdout.trim();
}

export async function ensureCleanWorktree(repoRoot: string): Promise<void> {
  const stdout = await getWorktreeStatus(repoRoot);
  if (stdout.trim()) {
    throw new Error(
      [
        "Target repository has uncommitted changes.",
        "Commit, stash, or clean them before running repo-skill-extractor.",
        "This protects existing user work before creating the skills branch."
      ].join(" ")
    );
  }
}

export async function getCurrentBranch(repoRoot: string): Promise<string> {
  const { stdout } = await execa("git", ["-C", repoRoot, "branch", "--show-current"]);
  return stdout.trim();
}

export async function getWorktreeStatus(repoRoot: string): Promise<string> {
  const { stdout } = await execa("git", ["-C", repoRoot, "status", "--porcelain"]);
  return stdout;
}

export async function createSkillBranch(repoRoot: string, baseBranch: string): Promise<string> {
  const startPoint = await resolveStartPoint(repoRoot, baseBranch);
  const branchName = buildSkillBranchName(baseBranch);
  await execa("git", ["-C", repoRoot, "switch", "-c", branchName, startPoint]);
  return branchName;
}

async function resolveStartPoint(repoRoot: string, baseBranch: string): Promise<string> {
  if (await refExists(repoRoot, baseBranch)) {
    return baseBranch;
  }

  const originRef = `origin/${baseBranch}`;
  if (await refExists(repoRoot, originRef)) {
    return originRef;
  }

  throw new Error(
    `Cannot find base branch "${baseBranch}" locally or as "${originRef}". Fetch it first or pass an existing branch.`
  );
}

async function refExists(repoRoot: string, ref: string): Promise<boolean> {
  try {
    await execa("git", ["-C", repoRoot, "rev-parse", "--verify", `${ref}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

function buildSkillBranchName(baseBranch: string): string {
  const safeBase = baseBranch.replace(/^origin\//, "").replace(/[^a-zA-Z0-9._/-]+/g, "-");
  const stamp = new Date()
    .toISOString()
    .replace(/\.\d+Z$/, "")
    .replaceAll(":", "")
    .replace("T", "-");

  return `rse/skills-${safeBase}-${stamp}`;
}
