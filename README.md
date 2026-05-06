# rse-project

`rse-project` is a small Node.js + TypeScript CLI that analyzes a local repository, writes reviewable `.skill-extraction` artifacts, creates a new branch from `main`, and runs local `codex exec` to generate repo-specific Codex skills and `AGENTS.md`.

This MVP is intentionally narrow:

- no OpenAI API or external LLM API integration;
- no fixtures or test suite yet;
- no multi-command CLI;
- no skill installation or synchronization;
- no hosted service.

## Usage

```bash
npm install

# Run from source:
npm run dev -- /path/to/project

# Or build and run the compiled CLI:
npm run build
node dist/index.js /path/to/project

# After publishing, the lead-facing command is:
npx rse-project /path/to/project
```

During the run, the tool:

1. verifies the target is a clean local Git repository;
2. creates a new branch from `main` named like `rse/skills-main-20260506-104500`;
3. analyzes project structure, package scripts, frameworks, tests, docs, CI, config files, and repeated workflow signals;
4. writes `.skill-extraction/analysis.json`, `facts.json`, `candidates.json`, `rejected-candidates.json`, `evidence.md`, `report.md`, and `codex-prompt.md`;
5. invokes:

```bash
codex exec --cd <repo> --sandbox danger-full-access --dangerously-bypass-approvals-and-sandbox -
```

The full-access Codex mode is deliberate for this local workflow. Use it only on trusted local repositories.

If Codex is installed but not visible to Node, set the executable path explicitly:

```bash
CODEX_BINARY=/full/path/to/codex npm run dev -- /path/to/project
```

If a run fails after `.skill-extraction/codex-prompt.md` is created, rerun the same command while the target repository is still on the generated `rse/skills-*` branch. The CLI will resume by reusing the existing prompt instead of creating another branch.

## Output In The Target Repository

The static analysis phase creates:

```txt
.skill-extraction/
  analysis.json
  facts.json
  candidates.json
  rejected-candidates.json
  evidence.md
  report.md
  codex-prompt.md
  codex-final-response.md
```

Codex is then instructed to create or update:

```txt
AGENTS.md
.agents/
  skills/
    <skill-name>/
      SKILL.md
      references/
        evidence.md
        review-example.md
```

## Skill Quality Bar

The generated prompt tells Codex to keep only skills that are specific to the target repository. Good skills should encode concrete workflows, conventions, architecture, validation commands, and file references. Generic skills such as "React best practices", "TypeScript basics", or "write tests" are rejected.

## Security Model

The analyzer respects `.gitignore` and always ignores common build outputs, dependency directories, environment files, private keys, and certificates. Secret-like values are masked in generated artifacts. Repository content is not sent to any external API by this tool; the only agent execution is the local `codex exec` command configured on your machine.

## Limitations

v1 works best for JavaScript and TypeScript repositories, especially Node.js, React, Next.js, Vite, Express, Fastify, NestJS, and common monorepo layouts. Other stacks get generic fallback analysis with lower-confidence candidates.
