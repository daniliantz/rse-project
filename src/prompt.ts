import path from "node:path";
import { writeText } from "./fs.js";
import { maskSecrets } from "./secrets.js";
import type { ExtractionRun, SkillCandidate } from "./types.js";

export async function writeCodexPrompt(run: ExtractionRun): Promise<string> {
  const prompt = buildCodexPrompt(run);
  const promptPath = path.join(run.facts.repoRoot, ".skill-extraction", "codex-prompt.md");
  await writeText(promptPath, prompt);
  return promptPath;
}

export function buildCodexPrompt(run: ExtractionRun): string {
  const candidateSummary = run.candidates.map(formatCandidate).join("\n\n");
  const rejectedSummary = run.rejectedCandidates
    .map((candidate) => `- ${candidate.suggestedName}: ${candidate.rejectionReason ?? "Rejected."}`)
    .join("\n");

  return maskSecrets(`# Task: Generate repo-specific Codex skills

You are running inside a local Git repository on branch \`${run.skillBranch}\`, created from \`${run.baseBranch}\`.

Your task is to create high-quality, repo-specific Codex skills and a root \`AGENTS.md\` for this exact repository.

Use these local analysis artifacts first:

- \`.skill-extraction/analysis.json\`
- \`.skill-extraction/facts.json\`
- \`.skill-extraction/candidates.json\`
- \`.skill-extraction/rejected-candidates.json\`
- \`.skill-extraction/evidence.md\`
- \`.skill-extraction/report.md\`

Then inspect the actual source files before writing final skills. Do not rely only on the JSON artifacts.

## Output to create

- \`AGENTS.md\`
- \`.agents/skills/<skill-name>/SKILL.md\`
- \`.agents/skills/<skill-name>/references/evidence.md\`
- \`.agents/skills/<skill-name>/references/review-example.md\`

## Hard rules

- Do not create generic skills.
- Do not create skills like "React best practices", "TypeScript basics", "Clean code", "Write tests", or "Use ESLint".
- Create only skills that encode project-specific workflows, conventions, architecture, validation steps, or recurring implementation patterns.
- Every skill must be useful for future coding tasks in this exact repository.
- Every skill must include concrete file and directory references that exist in this repo.
- Every skill must include validation steps.
- Every skill must include a review example.
- Every skill must explain when to use it and when not to use it.
- Do not include secrets, tokens, private keys, certificate values, or environment variable values.
- Do not dump large code blocks unless absolutely necessary.
- Prefer fewer high-quality skills over many weak skills.
- Leave changes in the working tree; do not commit.

## Candidate skills to consider

${candidateSummary || "No strong candidates were detected. Inspect the repo and create skills only if you find genuinely repo-specific repeatable workflows."}

## Candidates already rejected by static analysis

${rejectedSummary || "- None"}

## Skill quality bar

A skill is acceptable only if:

1. It is repo-specific.
2. It has a clear trigger in the frontmatter description.
3. It describes a repeatable workflow.
4. It references real files/directories.
5. It includes validation.
6. It includes evidence and a review example.
7. It would help Codex implement or review future changes in this repository.

Reject any candidate that does not meet this bar.

## AGENTS.md requirements

Create or update root \`AGENTS.md\`.

If \`AGENTS.md\` already exists, preserve existing content and add/update only this marked section:

\`<!-- repo-skill-extractor:start -->\`
\`<!-- repo-skill-extractor:end -->\`

Include:

- project overview;
- detected stack;
- common commands;
- repository structure;
- development conventions;
- testing/validation rules;
- where repo skills live;
- how Codex should use the repo skills;
- safety rules.

## SKILL.md format

Each skill must be placed at:

\`.agents/skills/<skill-name>/SKILL.md\`

Each \`SKILL.md\` must start with YAML frontmatter:

\`\`\`yaml
---
name: short-kebab-case-name
description: Clear trigger-focused description of when Codex should use this skill and when it should not.
---
\`\`\`

Then include these sections:

- Skill purpose
- When to use
- When not to use
- Repository-specific context
- Workflow
- Files and directories
- Validation
- Common mistakes

The \`description\` must be specific enough for implicit skill activation. It should name the repository workflow, not just a broad framework.

## Review artifacts

For each skill, create:

\`.agents/skills/<skill-name>/references/evidence.md\`

with:

- Why this skill exists
- Detected patterns
- Relevant files
- Commands
- Confidence
- Risks / uncertainty

Also create:

\`.agents/skills/<skill-name>/references/review-example.md\`

with:

- Example user task
- Expected skill usage
- Relevant files
- Expected agent behavior
- What reviewer should check
- Validation commands

## Final response

After writing files, summarize:

- skills created;
- candidates rejected;
- AGENTS.md changes;
- validation commands that should be run;
- uncertainties.
`);
}

function formatCandidate(candidate: SkillCandidate): string {
  return `### ${candidate.title}

- Suggested skill name: \`${candidate.suggestedName}\`
- Confidence: ${candidate.confidence}
- Summary: ${candidate.summary}
- Reasons:
${candidate.reasons.map((reason) => `  - ${reason}`).join("\n")}
- Relevant files:
${candidate.relevantFiles.map((file) => `  - \`${file}\``).join("\n") || "  - None detected"}
- Review example:
  - User task: ${candidate.suggestedReviewExample.userTask}
  - Expected usage: ${candidate.suggestedReviewExample.expectedSkillUsage}
  - Validation commands: ${candidate.suggestedReviewExample.validationCommands.join(", ") || "Inspect package scripts"}`;
}
