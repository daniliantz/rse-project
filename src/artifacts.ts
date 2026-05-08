import path from "node:path";
import { maskSecrets } from "./secrets.js";
import { writeJson, writeText } from "./fs.js";
import type { ExtractionRun, RepoFacts, SkillCandidate } from "./types.js";

export async function writeExtractionArtifacts(run: ExtractionRun): Promise<void> {
  const outputDir = path.join(run.facts.repoRoot, ".skill-extraction");

  await writeJson(path.join(outputDir, "analysis.json"), run);
  await writeJson(path.join(outputDir, "facts.json"), run.facts);
  await writeJson(path.join(outputDir, "candidates.json"), run.candidates);
  await writeJson(path.join(outputDir, "rejected-candidates.json"), run.rejectedCandidates);
  await writeText(path.join(outputDir, "evidence.md"), buildEvidenceMarkdown(run.facts, run.candidates));
  await writeText(path.join(outputDir, "report.md"), buildReportMarkdown(run));
}

function buildEvidenceMarkdown(facts: RepoFacts, candidates: SkillCandidate[]): string {
  const lines = [
    "# Repo Skill Extraction Evidence",
    "",
    "## Repository",
    "",
    `- Name: ${facts.repoName}`,
    `- Root: ${facts.repoRoot}`,
    `- Analyzed files: ${facts.analyzedFileCount}`,
    `- Package manager: ${facts.packageManager}`,
    `- Package bins: ${facts.packageBins.join(", ") || "none"}`,
    "",
    "## Detected Stack",
    "",
    listOrNone(facts.frameworks),
    "",
    "## Languages",
    "",
    listOrNone(facts.languages),
    "",
    "## Package Scripts",
    "",
    listOrNone(Object.entries(facts.packageScripts).map(([name, command]) => `${name}: ${command}`)),
    "",
    "## Important Directories",
    "",
    listOrNone(facts.importantDirectories.map((dir) => `${dir.path}: ${dir.reason}`)),
    "",
    "## Routes And APIs",
    "",
    listOrNone([
      ...facts.routePatterns.map((route) => `${route.kind}: ${route.summary} (${route.files.length} files)`),
      ...facts.apiPatterns.map((api) => `${api.kind}: ${api.summary} (${api.files.length} files)`)
    ]),
    "",
    "## Tests",
    "",
    listOrNone(facts.testPatterns.map((test) => `${test.tool}: ${test.files.length} files; commands: ${test.commands.join(", ") || "none"}`)),
    "",
    "## Candidate Evidence",
    ""
  ];

  for (const candidate of candidates) {
    lines.push(`### ${candidate.title}`, "");
    lines.push(`- Confidence: ${candidate.confidence}`);
    lines.push(`- Summary: ${candidate.summary}`);
    for (const item of candidate.evidence) {
      const location = item.path ? ` (${item.path})` : "";
      lines.push(`- ${item.kind}${location}: ${item.reason}`);
    }
    lines.push("");
  }

  return maskSecrets(lines.join("\n"));
}

function buildReportMarkdown(run: ExtractionRun): string {
  const facts = run.facts;
  const lines = [
    "# Repo Skill Extractor Report",
    "",
    `Generated at: ${run.generatedAt}`,
    `Base branch: ${run.baseBranch}`,
    `Skill branch: ${run.skillBranch}`,
    "",
    "## Summary",
    "",
    `- Repository: ${facts.repoName}`,
    `- Stack: ${facts.frameworks.join(", ") || "unknown"}`,
    `- Package manager: ${facts.packageManager}`,
    `- Candidate skills: ${run.candidates.length}`,
    `- Rejected candidates: ${run.rejectedCandidates.length}`,
    "",
    "## Accepted Skill Candidates",
    "",
    listOrNone(run.candidates.map((candidate) => `${candidate.suggestedName} (${candidate.confidence}): ${candidate.summary}`)),
    "",
    "## Rejected Candidates",
    "",
    listOrNone(
      run.rejectedCandidates.map(
        (candidate) => `${candidate.suggestedName} (${candidate.confidence}): ${candidate.rejectionReason ?? "Rejected."}`
      )
    ),
    "",
    "## Next Review Steps",
    "",
    "- Review `.skill-extraction/codex-prompt.md` if Codex output looks weak.",
    "- Inspect generated `.agents/skills/**/SKILL.md` for repo specificity.",
    "- Confirm every generated skill has `references/evidence.md` and `references/review-example.md`.",
    "- Run the validation commands suggested by each skill."
  ];

  return maskSecrets(lines.join("\n"));
}

function listOrNone(items: string[]): string {
  if (items.length === 0) {
    return "- None detected";
  }

  return items.map((item) => `- ${item}`).join("\n");
}
