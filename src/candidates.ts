import type { EvidenceItem, RepoFacts, ReviewExample, SkillCandidate } from "./types.js";

const MIN_CONFIDENCE = 0.65;
const MAX_SKILLS = 8;

export function detectSkillCandidates(facts: RepoFacts): {
  candidates: SkillCandidate[];
  rejectedCandidates: SkillCandidate[];
} {
  const allCandidates = [
    nextAppRouterCandidate(facts),
    nextApiRoutesCandidate(facts),
    nextPagesRouterCandidate(facts),
    reactRouterCandidate(facts),
    nodeApiCandidate(facts),
    reactComponentCandidate(facts),
    frontendApiStateCandidate(facts),
    monorepoWorkspaceCandidate(facts),
    testWorkflowCandidate(facts),
    generatedFilesCandidate(facts),
    genericReactCandidate(facts),
    genericCleanCodeCandidate(facts)
  ].filter((candidate): candidate is SkillCandidate => Boolean(candidate));

  const accepted = allCandidates
    .filter((candidate) => !isGeneric(candidate) && candidate.confidence >= MIN_CONFIDENCE)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, MAX_SKILLS);

  const acceptedIds = new Set(accepted.map((candidate) => candidate.id));
  const rejectedCandidates = allCandidates
    .filter((candidate) => !acceptedIds.has(candidate.id))
    .map((candidate) => ({
      ...candidate,
      rejected: true,
      rejectionReason:
        candidate.rejectionReason ??
        (isGeneric(candidate)
          ? "Candidate is too generic to become a repo-specific skill."
          : `Confidence ${candidate.confidence.toFixed(2)} is below the ${MIN_CONFIDENCE} threshold or stronger candidates were preferred.`)
    }));

  return { candidates: accepted, rejectedCandidates };
}

function reactRouterCandidate(facts: RepoFacts): SkillCandidate | undefined {
  const pattern = facts.routePatterns.find((route) => route.kind === "react-router");
  if (!pattern) return undefined;

  return candidate({
    id: "react-router-routes",
    title: "Add or modify React Router routes",
    suggestedName: "react-router-routes",
    summary:
      "Capture this repository's React Router route definitions, page placement, route guards, navigation data, lazy loading, and validation conventions.",
    confidence: score(0.74, pattern.files.length, facts.packageScripts, ["React", "Vite"]),
    reasons: [
      "React Router route setup was detected in source files.",
      "Route and page changes are repo-specific because projects often combine route arrays, page directories, guards, layouts, and navigation constants differently."
    ],
    evidence: [
      evidence("pattern", undefined, pattern.summary, pattern.confidence),
      ...pattern.files.slice(0, 10).map((file) => evidence("file", file, "React Router setup or route usage example.", 0.84)),
      ...facts.importantDirectories
        .filter((dir) => ["routes", "pages", "app"].includes(dir.path))
        .map((dir) => evidence("directory", dir.path, dir.reason, dir.confidence)),
      ...scriptsEvidence(facts, ["dev", "build", "test", "lint", "typecheck"])
    ],
    relevantFiles: unique([
      ...pattern.files.slice(0, 12),
      ...facts.importantDirectories
        .filter((dir) => ["routes", "pages", "app"].includes(dir.path))
        .map((dir) => dir.path),
      ...facts.entryPoints
    ]),
    review: {
      userTask: "Add a new frontend page or route using the repository's React Router setup.",
      expectedSkillUsage:
        "Codex should use the skill before editing route definitions, page components, guards, layouts, redirects, lazy loading, or navigation constants.",
      relevantFiles: pattern.files.slice(0, 8),
      expectedAgentBehavior: [
        "Inspect the closest route definitions and page examples before adding files.",
        "Follow existing route object, layout, guard, redirect, and lazy-loading conventions.",
        "Update related navigation/menu constants when routes are derived from data rather than only explicit route arrays."
      ],
      reviewerChecklist: [
        "The new route follows the existing route definition style.",
        "Guards, layouts, redirects, and navigation data are updated consistently.",
        "Relevant package validation commands were considered."
      ],
      validationCommands: validationCommands(facts)
    }
  });
}

function nextAppRouterCandidate(facts: RepoFacts): SkillCandidate | undefined {
  const pattern = facts.routePatterns.find((route) => route.kind === "next-app-router");
  if (!pattern) return undefined;

  return candidate({
    id: "next-app-router-pages",
    title: "Add or modify Next.js App Router pages",
    suggestedName: "next-app-router-pages",
    summary:
      "Capture this repository's App Router page, layout, metadata, and validation conventions.",
    confidence: score(0.76, pattern.files.length, facts.packageScripts, ["Next.js", "React"]),
    reasons: [
      "Next.js App Router page files were detected.",
      "Future page work benefits from repo-specific routing, metadata, layout, and validation guidance."
    ],
    evidence: [
      evidence("pattern", undefined, pattern.summary, pattern.confidence),
      ...pattern.files.slice(0, 8).map((file) => evidence("file", file, "App Router page example.", 0.86)),
      ...scriptsEvidence(facts, ["dev", "build", "lint", "test", "typecheck"])
    ],
    relevantFiles: unique([...pattern.files.slice(0, 12), ...facts.entryPoints]),
    review: {
      userTask: "Add a new route/page following this repository's existing App Router conventions.",
      expectedSkillUsage:
        "Codex should use the skill before touching routing, layout, metadata, loading/error states, or route-specific validation.",
      relevantFiles: pattern.files.slice(0, 8),
      expectedAgentBehavior: [
        "Inspect nearby page and layout files before writing code.",
        "Follow existing naming, metadata, data fetching, and component composition patterns.",
        "Update related navigation, sitemap, or tests when the repository pattern requires it."
      ],
      reviewerChecklist: [
        "The new page follows existing route structure.",
        "Metadata and data loading match nearby examples.",
        "Validation commands from package scripts were considered."
      ],
      validationCommands: validationCommands(facts)
    }
  });
}

function nextApiRoutesCandidate(facts: RepoFacts): SkillCandidate | undefined {
  const pattern = facts.apiPatterns.find((api) => api.kind.includes("next") && api.files.length > 0);
  if (!pattern) return undefined;

  return candidate({
    id: "next-api-route-handlers",
    title: "Add or modify Next.js API route handlers",
    suggestedName: "next-api-route-handlers",
    summary: "Capture route handler conventions for request parsing, response shape, auth, and validation.",
    confidence: score(0.74, pattern.files.length, facts.packageScripts, ["Next.js"]),
    reasons: [
      "Next.js API route files were detected.",
      "API changes are high-value skill candidates because they often involve auth, validation, response shape, and error handling conventions."
    ],
    evidence: [
      evidence("pattern", undefined, pattern.summary, pattern.confidence),
      ...pattern.files.slice(0, 8).map((file) => evidence("file", file, "API route example.", 0.86)),
      ...scriptsEvidence(facts, ["test", "lint", "typecheck", "build"])
    ],
    relevantFiles: pattern.files.slice(0, 12),
    review: {
      userTask: "Add a new API endpoint using the repository's route handler conventions.",
      expectedSkillUsage:
        "Codex should use the skill before adding or changing handlers, request validation, auth checks, or response/error shapes.",
      relevantFiles: pattern.files.slice(0, 8),
      expectedAgentBehavior: [
        "Inspect existing route handlers before adding a new one.",
        "Reuse existing request parsing, auth, validation, and error response conventions.",
        "Add or update tests when matching examples exist."
      ],
      reviewerChecklist: [
        "The handler mirrors existing response and error conventions.",
        "Sensitive data is not exposed.",
        "Relevant validation commands were run or documented."
      ],
      validationCommands: validationCommands(facts)
    }
  });
}

function nextPagesRouterCandidate(facts: RepoFacts): SkillCandidate | undefined {
  const pattern = facts.routePatterns.find((route) => route.kind === "next-pages-router");
  if (!pattern) return undefined;

  return candidate({
    id: "next-pages-router-pages",
    title: "Add or modify Next.js Pages Router pages",
    suggestedName: "next-pages-router-pages",
    summary: "Capture this repository's Pages Router conventions for pages, data loading, and validation.",
    confidence: score(0.72, pattern.files.length, facts.packageScripts, ["Next.js", "React"]),
    reasons: [
      "Next.js Pages Router files were detected.",
      "Page additions need repo-specific conventions around data loading, layout, metadata, and tests."
    ],
    evidence: [
      evidence("pattern", undefined, pattern.summary, pattern.confidence),
      ...pattern.files.slice(0, 8).map((file) => evidence("file", file, "Pages Router example.", 0.82))
    ],
    relevantFiles: pattern.files.slice(0, 12),
    review: {
      userTask: "Add a new page following the repository's Pages Router conventions.",
      expectedSkillUsage:
        "Codex should use the skill before adding pages, data loading functions, or page-level tests.",
      relevantFiles: pattern.files.slice(0, 8),
      expectedAgentBehavior: [
        "Inspect nearby pages before editing.",
        "Follow existing data loading, layout, and route naming patterns.",
        "Update tests or docs when similar pages do so."
      ],
      reviewerChecklist: [
        "Route location and naming match the repo.",
        "Data loading follows existing conventions.",
        "Relevant validation commands were considered."
      ],
      validationCommands: validationCommands(facts)
    }
  });
}

function nodeApiCandidate(facts: RepoFacts): SkillCandidate | undefined {
  const apiPattern = facts.apiPatterns.find((api) => api.kind.includes("node") || api.kind.includes("fastify"));
  const routePattern = facts.routePatterns.find((route) => ["express", "fastify", "nestjs"].includes(route.kind));
  if (!apiPattern && !routePattern) return undefined;

  const files = unique([...(apiPattern?.files ?? []), ...(routePattern?.files ?? [])]);
  return candidate({
    id: "node-api-endpoints",
    title: "Add or modify Node API endpoints",
    suggestedName: "node-api-endpoints",
    summary: "Capture server route conventions, validation, service boundaries, and error handling.",
    confidence: score(0.7, files.length || 1, facts.packageScripts, ["Express", "Fastify", "NestJS"]),
    reasons: [
      "Node HTTP route patterns were detected.",
      "Endpoint work usually needs repository-specific controller, service, validation, and test conventions."
    ],
    evidence: [
      ...(apiPattern ? [evidence("pattern", undefined, apiPattern.summary, apiPattern.confidence)] : []),
      ...(routePattern ? [evidence("pattern", undefined, routePattern.summary, routePattern.confidence)] : []),
      ...files.slice(0, 8).map((file) => evidence("file", file, "API route/controller example.", 0.78))
    ],
    relevantFiles: files.slice(0, 12),
    review: {
      userTask: "Add a new API endpoint using the repository's existing server conventions.",
      expectedSkillUsage:
        "Codex should use the skill before adding controllers, routes, services, validators, or endpoint tests.",
      relevantFiles: files.slice(0, 8),
      expectedAgentBehavior: [
        "Trace the existing route-to-service flow before writing code.",
        "Reuse validation and error handling helpers already used by this repo.",
        "Add tests using the same test style when examples exist."
      ],
      reviewerChecklist: [
        "The endpoint is placed in the right layer.",
        "Error handling and validation match existing code.",
        "Tests or validation commands cover the change."
      ],
      validationCommands: validationCommands(facts)
    }
  });
}

function reactComponentCandidate(facts: RepoFacts): SkillCandidate | undefined {
  if (!facts.frameworks.includes("React")) return undefined;
  const componentDirs = facts.importantDirectories.filter((dir) =>
    ["components", "pages", "shared", "styles"].includes(dir.path)
  );
  const componentEvidence = componentDirs.flatMap((dir) =>
    facts.configFiles
      .filter((config) => ["tailwind", "eslint", "prettier", "typescript"].includes(config.kind))
      .map((config) => evidence("config", config.path, `Relevant ${config.kind} config for component work.`, 0.72))
  );

  if (componentDirs.length === 0) return undefined;

  return candidate({
    id: "react-component-conventions",
    title: "Add or modify React components using project conventions",
    suggestedName: "react-component-conventions",
    summary:
      "Capture component placement, styling, import, export, and validation conventions that are specific to this repository.",
    confidence: score(0.66, componentDirs.length + componentEvidence.length, facts.packageScripts, ["React"]),
    reasons: [
      "React and component/source directories were detected.",
      "Component work benefits from repo-specific placement, styling, import/export, and validation conventions."
    ],
    evidence: [
      ...componentDirs.map((dir) => evidence("directory", dir.path, dir.reason, dir.confidence)),
      ...componentEvidence.slice(0, 8),
      ...scriptsEvidence(facts, ["lint", "typecheck", "build", "test"])
    ],
    relevantFiles: unique([
      ...facts.configFiles.map((config) => config.path),
      ...facts.entryPoints,
      ...componentDirs.map((dir) => dir.path)
    ]).slice(0, 15),
    review: {
      userTask: "Add a component using this repository's existing component and styling conventions.",
      expectedSkillUsage:
        "Codex should use the skill before creating reusable UI, editing page-local UI, or changing component styling/import/export patterns.",
      relevantFiles: componentDirs.map((dir) => dir.path),
      expectedAgentBehavior: [
        "Inspect nearby components before choosing file location and API shape.",
        "Use existing styling and export conventions.",
        "Run or recommend the repo's UI validation commands."
      ],
      reviewerChecklist: [
        "The component is in the expected directory.",
        "Props, styling, and exports follow nearby examples.",
        "Validation commands match package scripts."
      ],
      validationCommands: validationCommands(facts)
    }
  });
}

function frontendApiStateCandidate(facts: RepoFacts): SkillCandidate | undefined {
  if (!facts.frameworks.includes("React")) return undefined;
  const workflowDirs = facts.importantDirectories.filter((dir) =>
    ["api", "features", "hooks", "types", "shared", "services"].includes(dir.path)
  );
  if (workflowDirs.length < 2) return undefined;

  return candidate({
    id: "frontend-api-state-workflow",
    title: "Add or modify frontend API and state workflow",
    suggestedName: "frontend-api-state-workflow",
    summary:
      "Capture this repository's frontend API service, state management, shared type, hook, and validation conventions.",
    confidence: score(0.67, workflowDirs.length, facts.packageScripts, ["React", "TypeScript"]),
    reasons: [
      "Frontend API/state directories were detected.",
      "API and state changes are repo-specific because projects differ in service wrappers, typed response shapes, state registration, hooks, and error handling."
    ],
    evidence: [
      ...workflowDirs.map((dir) => evidence("directory", dir.path, dir.reason, dir.confidence)),
      ...facts.configFiles
        .filter((config) => ["typescript", "vite", "eslint", "vitest"].includes(config.kind))
        .map((config) => evidence("config", config.path, `Relevant ${config.kind} config for frontend API/state work.`, 0.72)),
      ...scriptsEvidence(facts, ["build", "test", "lint", "typecheck"])
    ],
    relevantFiles: unique([
      ...workflowDirs.map((dir) => dir.path),
      ...facts.configFiles
        .filter((config) => ["typescript", "vite", "eslint", "vitest", "package manifest"].includes(config.kind))
        .map((config) => config.path)
    ]),
    review: {
      userTask: "Add frontend data fetching or shared state for an existing feature.",
      expectedSkillUsage:
        "Codex should use the skill before adding API service calls, state slices/stores, shared response types, hooks, or frontend error-handling paths.",
      relevantFiles: workflowDirs.map((dir) => dir.path),
      expectedAgentBehavior: [
        "Inspect nearby API services, state modules, hooks, and shared types before adding new ones.",
        "Reuse the repository's API client/wrapper and typed response conventions.",
        "Register new state in the existing store/provider pattern when the repo has one."
      ],
      reviewerChecklist: [
        "API calls go through the repository's existing client/service abstraction.",
        "State and hooks follow nearby feature patterns.",
        "Shared types and validation commands match existing frontend conventions."
      ],
      validationCommands: validationCommands(facts)
    }
  });
}

function monorepoWorkspaceCandidate(facts: RepoFacts): SkillCandidate | undefined {
  if (facts.workspaces.length < 2) return undefined;

  return candidate({
    id: "workspace-package-workflow",
    title: "Work inside this repository's workspace layout",
    suggestedName: "workspace-package-workflow",
    summary: "Capture workspace layout, package boundaries, scripts, and validation conventions.",
    confidence: score(0.74, facts.workspaces.length, facts.packageScripts, ["Turborepo", "Nx"]),
    reasons: [
      "Multiple workspaces were detected.",
      "Agents need repo-specific guidance on where code belongs and which package scripts validate changes."
    ],
    evidence: [
      ...facts.workspaces
        .slice(0, 10)
        .map((workspace) => evidence("directory", workspace.path, `Workspace package ${workspace.name}.`, 0.82)),
      ...facts.configFiles
        .filter((config) => ["turborepo", "nx", "package manifest"].includes(config.kind))
        .map((config) => evidence("config", config.path, `Workspace-related ${config.kind} config.`, 0.78))
    ],
    relevantFiles: unique([
      ...facts.workspaces.map((workspace) => workspace.packageJsonPath ?? workspace.path),
      ...facts.configFiles.filter((config) => ["turborepo", "nx", "package manifest"].includes(config.kind)).map((config) => config.path)
    ]).slice(0, 15),
    review: {
      userTask: "Add code to the correct package in this monorepo.",
      expectedSkillUsage:
        "Codex should use the skill before editing package boundaries, workspace scripts, imports, or shared packages.",
      relevantFiles: facts.workspaces.map((workspace) => workspace.path).slice(0, 10),
      expectedAgentBehavior: [
        "Identify the owning app/package before editing.",
        "Respect package boundaries and existing workspace scripts.",
        "Run validation from the right workspace or root script."
      ],
      reviewerChecklist: [
        "The change lives in the intended workspace.",
        "Imports do not violate existing package boundaries.",
        "The selected validation command matches the edited workspace."
      ],
      validationCommands: validationCommands(facts)
    }
  });
}

function testWorkflowCandidate(facts: RepoFacts): SkillCandidate | undefined {
  const testPattern = facts.testPatterns.find((pattern) => pattern.confidence >= 0.7);
  if (!testPattern) return undefined;

  return candidate({
    id: "repo-test-workflow",
    title: "Add or update tests using repository conventions",
    suggestedName: "repo-test-workflow",
    summary: "Capture this repository's test tools, file placement, naming, and validation commands.",
    confidence: score(0.68, testPattern.files.length + testPattern.commands.length, facts.packageScripts, [
      "Vitest",
      "Jest",
      "Playwright"
    ]),
    reasons: [
      `${testPattern.tool} test signals were detected.`,
      "Test changes are useful only when they follow project-specific placement, helpers, and commands."
    ],
    evidence: [
      evidence("pattern", undefined, `Detected ${testPattern.tool} test workflow.`, testPattern.confidence),
      ...testPattern.files.slice(0, 10).map((file) => evidence("file", file, "Test file example.", 0.76)),
      ...testPattern.commands.map((command) => evidence("script", undefined, command, 0.8))
    ],
    relevantFiles: testPattern.files.slice(0, 15),
    review: {
      userTask: "Add or update tests for a change using this repository's test conventions.",
      expectedSkillUsage:
        "Codex should use the skill before adding tests, choosing test location, or deciding validation commands.",
      relevantFiles: testPattern.files.slice(0, 8),
      expectedAgentBehavior: [
        "Inspect nearby tests before writing a new one.",
        "Reuse existing helpers and test naming conventions.",
        "Run or recommend the most relevant package script."
      ],
      reviewerChecklist: [
        "The test file is placed with similar tests.",
        "Assertions and helpers follow repo examples.",
        "The selected command is available in package.json."
      ],
      validationCommands: validationCommands(facts)
    }
  });
}

function generatedFilesCandidate(facts: RepoFacts): SkillCandidate | undefined {
  if (facts.generatedFilePatterns.length === 0 && facts.doNotEditPatterns.length === 0) return undefined;

  return candidate({
    id: "generated-files-safety",
    title: "Work safely around generated and do-not-edit files",
    suggestedName: "generated-files-safety",
    summary: "Capture repository-specific generated files, lockfiles, and safe edit boundaries.",
    confidence: facts.generatedFilePatterns.length > 0 ? 0.72 : 0.62,
    reasons: [
      "Generated or do-not-edit file patterns were detected.",
      "Agents need explicit guidance to avoid editing generated outputs directly."
    ],
    evidence: [
      ...facts.generatedFilePatterns.map((pattern) =>
        evidence("pattern", undefined, `Generated file pattern: ${pattern}`, 0.74)
      ),
      ...facts.doNotEditPatterns.map((pattern) =>
        evidence("pattern", undefined, `Do-not-edit pattern: ${pattern}`, 0.7)
      )
    ],
    relevantFiles: facts.doNotEditPatterns,
    review: {
      userTask: "Update functionality that touches generated outputs or lockfiles.",
      expectedSkillUsage:
        "Codex should use the skill before editing generated files, lockfiles, or files marked as do-not-edit.",
      relevantFiles: facts.doNotEditPatterns,
      expectedAgentBehavior: [
        "Find the source file or generation command before editing generated output.",
        "Avoid committing secrets or generated churn.",
        "Document uncertainty when the generation source is unclear."
      ],
      reviewerChecklist: [
        "Generated files were not edited by hand unless the repo requires it.",
        "The source of generation was identified.",
        "Diff noise is limited to relevant files."
      ],
      validationCommands: validationCommands(facts)
    }
  });
}

function genericReactCandidate(facts: RepoFacts): SkillCandidate | undefined {
  if (!facts.frameworks.includes("React")) return undefined;

  return candidate({
    id: "generic-react-best-practices",
    title: "React best practices",
    suggestedName: "react-best-practices",
    summary: "Generic React advice.",
    confidence: 0.5,
    reasons: ["React was detected, but this alone is not repo-specific."],
    evidence: [evidence("dependency", undefined, "React detected.", 0.5)],
    relevantFiles: [],
    review: emptyReview("Use React best practices."),
    rejectionReason: "Generic React advice is explicitly below the skill quality bar."
  });
}

function genericCleanCodeCandidate(facts: RepoFacts): SkillCandidate | undefined {
  if (facts.analyzedFileCount === 0) return undefined;

  return candidate({
    id: "generic-clean-code",
    title: "Clean code",
    suggestedName: "clean-code",
    summary: "Generic clean code advice.",
    confidence: 0.4,
    reasons: ["Every repository benefits from clean code, so this is not a repo-specific workflow."],
    evidence: [],
    relevantFiles: [],
    review: emptyReview("Write clean code."),
    rejectionReason: "Generic clean-code guidance is not useful as a repo-specific skill."
  });
}

function candidate(input: {
  id: string;
  title: string;
  suggestedName: string;
  summary: string;
  confidence: number;
  reasons: string[];
  evidence: EvidenceItem[];
  relevantFiles: string[];
  review: ReviewExample;
  rejectionReason?: string;
}): SkillCandidate {
  return {
    id: input.id,
    title: input.title,
    suggestedName: input.suggestedName,
    summary: input.summary,
    confidence: Math.max(0, Math.min(1, Number(input.confidence.toFixed(2)))),
    reasons: input.reasons,
    evidence: input.evidence,
    relevantFiles: unique(input.relevantFiles).slice(0, 20),
    suggestedReviewExample: input.review,
    rejectionReason: input.rejectionReason
  };
}

function score(
  base: number,
  exampleCount: number,
  scripts: Record<string, string>,
  preferredFrameworks: string[]
): number {
  const scriptBonus = Object.keys(scripts).some((name) => /test|lint|typecheck|build/i.test(name)) ? 0.07 : 0;
  const frameworkBonus = preferredFrameworks.length > 0 ? 0.03 : 0;
  const exampleBonus = Math.min(0.12, exampleCount * 0.015);
  return Math.min(0.96, base + scriptBonus + frameworkBonus + exampleBonus);
}

function evidence(kind: EvidenceItem["kind"], path: string | undefined, reason: string, confidence: number): EvidenceItem {
  return { kind, path, reason, confidence };
}

function scriptsEvidence(facts: RepoFacts, names: string[]): EvidenceItem[] {
  return Object.entries(facts.packageScripts)
    .filter(([name]) => names.some((expected) => name.includes(expected)))
    .map(([name, command]) => evidence("script", undefined, `${name}: ${command}`, 0.78));
}

function validationCommands(facts: RepoFacts): string[] {
  const preferred = Object.entries(facts.packageScripts)
    .filter(([name]) => /typecheck|lint|test|build|check/i.test(name))
    .map(([name, command]) =>
      command.startsWith("cd ")
        ? command
        : `${facts.packageManager === "yarn" ? "yarn" : facts.packageManager === "pnpm" ? "pnpm" : facts.packageManager === "bun" ? "bun run" : "npm run"} ${name}`
    )
    .slice(0, 4);

  return preferred.length > 0 ? preferred : ["Inspect package.json and run the closest validation command."];
}

function emptyReview(userTask: string): ReviewExample {
  return {
    userTask,
    expectedSkillUsage: "This candidate should be rejected.",
    relevantFiles: [],
    expectedAgentBehavior: ["Reject this candidate as too generic."],
    reviewerChecklist: ["Confirm no generic skill was generated."],
    validationCommands: []
  };
}

function isGeneric(candidate: SkillCandidate): boolean {
  const text = `${candidate.title} ${candidate.summary} ${candidate.suggestedName}`.toLowerCase();
  return [
    "best practices",
    "clean code",
    "typescript basics",
    "react development",
    "frontend tasks"
  ].some((generic) => text.includes(generic));
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}
