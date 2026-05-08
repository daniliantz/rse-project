import type { EvidenceItem, RepoFacts, ReviewExample, SkillCandidate } from "./types.js";

const MIN_CONFIDENCE = 0.6;
const MAX_SKILLS = 16;

export function detectSkillCandidates(facts: RepoFacts): {
  candidates: SkillCandidate[];
  rejectedCandidates: SkillCandidate[];
} {
  const allCandidates = [
    nextAppRouterCandidate(facts),
    nextPagesRouterCandidate(facts),
    reactRouterCandidate(facts),
    frontendScreenLayoutCandidate(facts),
    reactComponentCandidate(facts),
    frontendFeatureModuleCandidate(facts),
    frontendApiClientCandidate(facts),
    frontendStateStoreCandidate(facts),
    formValidationCandidate(facts),
    nextApiRoutesCandidate(facts),
    nodeApiCandidate(facts),
    authAccessCandidate(facts),
    seoMetadataCandidate(facts),
    localizationCandidate(facts),
    monorepoWorkspaceCandidate(facts),
    testWorkflowCandidate(facts),
    nodeCliWorkflowCandidate(facts),
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

function frontendScreenLayoutCandidate(facts: RepoFacts): SkillCandidate | undefined {
  if (!hasFrontend(facts)) return undefined;

  const screenDirs = dirsByName(facts, ["app", "pages", "routes", "screens", "views"]);
  const layoutDirs = dirsByName(facts, ["layouts"]);
  const componentDirs = dirsByName(facts, ["components", "ui", "widgets", "shared", "styles"]);
  const routeFiles = routeExampleFiles(facts);
  if (screenDirs.length === 0 && layoutDirs.length === 0 && routeFiles.length === 0) return undefined;

  const relevantDirs = unique([...screenDirs, ...layoutDirs, ...componentDirs]);
  return candidate({
    id: "frontend-screen-layout-workflow",
    title: "Add screens using the repository layout workflow",
    suggestedName: "frontend-screen-layout-workflow",
    summary:
      "Capture how this repository creates screen/page files, applies layouts or shells, composes shared UI, updates navigation, and validates UI route changes.",
    confidence: score(0.69, relevantDirs.length + routeFiles.length, facts.packageScripts, ["React", "Next.js", "Vite"]),
    reasons: [
      "Frontend route/page/screen or layout signals were detected.",
      "New screen work is often a distinct project recipe involving route placement, layout composition, navigation data, metadata, and validation."
    ],
    evidence: [
      ...screenDirs.map((dir) => evidence("directory", dir.path, dir.reason, dir.confidence)),
      ...layoutDirs.map((dir) => evidence("directory", dir.path, dir.reason, dir.confidence)),
      ...componentDirs.slice(0, 5).map((dir) => evidence("directory", dir.path, dir.reason, dir.confidence)),
      ...routeFiles.slice(0, 8).map((file) => evidence("file", file, "Route/page example involved in screen creation.", 0.82)),
      ...scriptsEvidence(facts, ["dev", "build", "lint", "typecheck", "test"])
    ],
    relevantFiles: unique([
      ...routeFiles.slice(0, 12),
      ...relevantDirs.map((dir) => dir.path),
      ...facts.entryPoints,
      ...configFilesByKind(facts, ["typescript", "vite", "nextjs", "tailwind"]).map((config) => config.path)
    ]),
    review: {
      userTask: "Add a new screen/page following the repository's existing layout and navigation conventions.",
      expectedSkillUsage:
        "Codex should use the skill before creating screen/page files, choosing layout composition, touching navigation, or validating route-level UI work.",
      relevantFiles: unique([...routeFiles.slice(0, 8), ...relevantDirs.map((dir) => dir.path)]),
      expectedAgentBehavior: [
        "Inspect nearby screen/page examples and layout wrappers before adding files.",
        "Follow existing placement, naming, navigation, metadata, and component composition conventions.",
        "Run or recommend the closest UI validation command from package scripts."
      ],
      reviewerChecklist: [
        "The new screen starts from the same files and layout pattern as nearby screens.",
        "Navigation or metadata is updated only where this repository centralizes it.",
        "The validation command matches package scripts."
      ],
      validationCommands: validationCommands(facts)
    }
  });
}

function reactComponentCandidate(facts: RepoFacts): SkillCandidate | undefined {
  if (!facts.frameworks.includes("React")) return undefined;
  const componentDirs = facts.importantDirectories.filter((dir) =>
    ["components", "pages", "shared", "styles", "ui", "widgets"].includes(dir.path)
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

function frontendFeatureModuleCandidate(facts: RepoFacts): SkillCandidate | undefined {
  if (!hasFrontend(facts)) return undefined;

  const featureDirs = dirsByName(facts, ["features", "modules", "entities"]);
  if (featureDirs.length === 0) return undefined;

  const supportDirs = dirsByName(facts, ["components", "hooks", "types", "api", "services", "store", "stores", "state"]);
  const workflowDirs = unique([...featureDirs, ...supportDirs]);
  return candidate({
    id: "frontend-feature-module-workflow",
    title: "Add or extend frontend feature modules",
    suggestedName: "frontend-feature-module-workflow",
    summary:
      "Capture how this repository groups feature-level UI, hooks, API access, types, and state when adding or extending a product feature.",
    confidence: score(0.64, workflowDirs.length, facts.packageScripts, ["React", "TypeScript"]),
    reasons: [
      "Feature/module directories were detected in a frontend project.",
      "Feature work often cuts across local UI, hooks, API calls, shared types, and state, but should still follow a repository-specific folder boundary."
    ],
    evidence: [
      ...workflowDirs.map((dir) => evidence("directory", dir.path, dir.reason, dir.confidence)),
      ...configFilesByKind(facts, ["typescript", "vite", "nextjs", "eslint", "vitest"]).map((config) =>
        evidence("config", config.path, `Relevant ${config.kind} config for feature-module work.`, 0.72)
      ),
      ...scriptsEvidence(facts, ["build", "test", "lint", "typecheck"])
    ],
    relevantFiles: unique([
      ...workflowDirs.map((dir) => dir.path),
      ...configFilesByKind(facts, ["typescript", "vite", "nextjs", "vitest", "package manifest"]).map(
        (config) => config.path
      )
    ]),
    review: {
      userTask: "Add a feature using the repository's existing feature/module structure.",
      expectedSkillUsage:
        "Codex should use the skill before adding feature-scoped UI, hooks, API calls, state, shared types, or tests.",
      relevantFiles: workflowDirs.map((dir) => dir.path),
      expectedAgentBehavior: [
        "Inspect a nearby feature before choosing the file layout.",
        "Keep feature-local and shared code in the same boundaries already used by the repository.",
        "Update cross-layer wiring only where similar features do so."
      ],
      reviewerChecklist: [
        "The new feature follows the existing feature folder shape.",
        "Shared hooks, types, API calls, and state are not placed ad hoc.",
        "Validation commands match package scripts."
      ],
      validationCommands: validationCommands(facts)
    }
  });
}

function frontendApiClientCandidate(facts: RepoFacts): SkillCandidate | undefined {
  if (!hasFrontend(facts)) return undefined;

  const apiDirs = dirsByName(facts, ["api", "services", "clients", "client"]);
  if (apiDirs.length === 0) return undefined;

  const supportDirs = dirsByName(facts, ["hooks", "types", "schemas", "models", "shared", "lib"]);
  const workflowDirs = unique([...apiDirs, ...supportDirs]);
  return candidate({
    id: "frontend-api-client-workflow",
    title: "Wire frontend API client calls",
    suggestedName: "frontend-api-client-workflow",
    summary:
      "Capture how this repository adds frontend API/service calls, shared response types, request helpers, hooks, and error-handling conventions.",
    confidence: score(0.66, workflowDirs.length, facts.packageScripts, ["React", "TypeScript"]),
    reasons: [
      "Frontend API/client/service directories were detected.",
      "API-client work is repo-specific because projects differ in wrapper clients, typed response shapes, hooks, error handling, and where service calls are allowed."
    ],
    evidence: [
      ...apiDirs.map((dir) => evidence("directory", dir.path, dir.reason, dir.confidence)),
      ...supportDirs.map((dir) => evidence("directory", dir.path, dir.reason, dir.confidence)),
      ...scriptsEvidence(facts, ["build", "test", "lint", "typecheck"])
    ],
    relevantFiles: unique([
      ...workflowDirs.map((dir) => dir.path),
      ...configFilesByKind(facts, ["typescript", "vite", "nextjs", "package manifest"]).map((config) => config.path)
    ]),
    review: {
      userTask: "Add frontend data fetching for an existing screen or feature.",
      expectedSkillUsage:
        "Codex should use the skill before adding service/client methods, typed responses, request hooks, or frontend error handling.",
      relevantFiles: workflowDirs.map((dir) => dir.path),
      expectedAgentBehavior: [
        "Inspect existing API/client/service examples before adding calls.",
        "Reuse the repository's request helper, response typing, and error conventions.",
        "Connect data fetching through existing hooks or feature patterns when present."
      ],
      reviewerChecklist: [
        "API calls go through the repository's existing client/service abstraction.",
        "Types and errors follow nearby examples.",
        "Validation commands match package scripts."
      ],
      validationCommands: validationCommands(facts)
    }
  });
}

function frontendStateStoreCandidate(facts: RepoFacts): SkillCandidate | undefined {
  if (!hasFrontend(facts)) return undefined;

  const stateDirs = dirsByName(facts, ["store", "stores", "state", "slices"]);
  const featureDirs = dirsByName(facts, ["features", "modules"]);
  const hookDirs = dirsByName(facts, ["hooks"]);
  if (stateDirs.length === 0 && !(featureDirs.length > 0 && hookDirs.length > 0)) return undefined;

  const workflowDirs = unique([...stateDirs, ...featureDirs, ...hookDirs, ...dirsByName(facts, ["types"])]);
  return candidate({
    id: "frontend-state-store-workflow",
    title: "Update frontend store and state workflow",
    suggestedName: "frontend-state-store-workflow",
    summary:
      "Capture how this repository adds store/state/cache behavior, registers providers or slices, exposes selectors/hooks, and validates stateful UI changes.",
    confidence: score(stateDirs.length > 0 ? 0.67 : 0.61, workflowDirs.length, facts.packageScripts, [
      "React",
      "TypeScript"
    ]),
    reasons: [
      "Frontend state/store or feature-plus-hook signals were detected.",
      "State work is repo-specific because registration, selectors, providers, persistence, cache invalidation, and hook usage differ across repositories."
    ],
    evidence: [
      ...workflowDirs.map((dir) => evidence("directory", dir.path, dir.reason, dir.confidence)),
      ...scriptsEvidence(facts, ["build", "test", "lint", "typecheck"])
    ],
    relevantFiles: unique([
      ...workflowDirs.map((dir) => dir.path),
      ...configFilesByKind(facts, ["typescript", "vite", "nextjs", "package manifest"]).map((config) => config.path)
    ]),
    review: {
      userTask: "Add state for an existing frontend feature.",
      expectedSkillUsage:
        "Codex should use the skill before adding store modules, slices, selectors, providers, state hooks, or cache updates.",
      relevantFiles: workflowDirs.map((dir) => dir.path),
      expectedAgentBehavior: [
        "Inspect existing store/state registration before creating new state.",
        "Expose selectors/hooks using the repository's naming and placement conventions.",
        "Validate stateful UI through the closest build, typecheck, or test script."
      ],
      reviewerChecklist: [
        "New state is registered in the same place as existing state.",
        "Selectors/hooks follow existing naming and import patterns.",
        "Validation commands match package scripts."
      ],
      validationCommands: validationCommands(facts)
    }
  });
}

function formValidationCandidate(facts: RepoFacts): SkillCandidate | undefined {
  const formDirs = dirsByName(facts, ["forms", "validation", "validators", "schemas"]);
  if (formDirs.length === 0) return undefined;

  const supportDirs = dirsByName(facts, ["components", "features", "hooks", "types", "api", "services"]);
  const workflowDirs = unique([...formDirs, ...supportDirs]);
  return candidate({
    id: "form-validation-workflow",
    title: "Wire forms and validation",
    suggestedName: "form-validation-workflow",
    summary:
      "Capture how this repository structures forms, validation schemas, submit flows, API handoff, and field/error display conventions.",
    confidence: score(0.65, workflowDirs.length, facts.packageScripts, ["React", "TypeScript"]),
    reasons: [
      "Form, schema, or validation directories were detected.",
      "Form work is project-specific when schemas, submit handlers, server/client validation, and error display are wired through local helpers."
    ],
    evidence: [
      ...workflowDirs.map((dir) => evidence("directory", dir.path, dir.reason, dir.confidence)),
      ...scriptsEvidence(facts, ["build", "test", "lint", "typecheck"])
    ],
    relevantFiles: unique([
      ...workflowDirs.map((dir) => dir.path),
      ...configFilesByKind(facts, ["typescript", "vite", "nextjs", "package manifest"]).map((config) => config.path)
    ]),
    review: {
      userTask: "Add or change a form using the repository's validation and submit conventions.",
      expectedSkillUsage:
        "Codex should use the skill before changing form components, validation schemas, submit handlers, field errors, or API handoff.",
      relevantFiles: workflowDirs.map((dir) => dir.path),
      expectedAgentBehavior: [
        "Inspect similar forms and schemas before editing.",
        "Reuse the repository's validation, submit, and error-display patterns.",
        "Run or recommend the nearest validation command."
      ],
      reviewerChecklist: [
        "Schema and form field behavior follow similar forms.",
        "Submit/error handling uses existing helpers or conventions.",
        "Validation commands match package scripts."
      ],
      validationCommands: validationCommands(facts)
    }
  });
}

function authAccessCandidate(facts: RepoFacts): SkillCandidate | undefined {
  const authDirs = dirsByName(facts, ["auth", "middleware", "middlewares", "guards", "permissions"]);
  const authConfigs = configFilesByKind(facts, ["middleware"]);
  if (authDirs.length === 0 && authConfigs.length === 0) return undefined;

  const routeFiles = routeExampleFiles(facts);
  const workflowDirs = unique([...authDirs, ...dirsByName(facts, ["api", "routes", "controllers", "server"])]);
  return candidate({
    id: "auth-access-workflow",
    title: "Work with authentication and access control",
    suggestedName: "auth-access-workflow",
    summary:
      "Capture this repository's auth, middleware, guard, permission, route protection, and validation conventions.",
    confidence: score(0.66, workflowDirs.length + authConfigs.length, facts.packageScripts, [
      "Next.js",
      "Express",
      "Fastify",
      "NestJS"
    ]),
    reasons: [
      "Authentication, middleware, guard, or permission signals were detected.",
      "Auth and access-control work is high-risk and strongly repository-specific because route protection, user context, redirects, and error responses differ."
    ],
    evidence: [
      ...workflowDirs.map((dir) => evidence("directory", dir.path, dir.reason, dir.confidence)),
      ...authConfigs.map((config) => evidence("config", config.path, `Relevant ${config.kind} config for auth/access work.`, 0.78)),
      ...routeFiles.slice(0, 6).map((file) => evidence("file", file, "Route example that may participate in access control.", 0.7)),
      ...scriptsEvidence(facts, ["build", "test", "lint", "typecheck"])
    ],
    relevantFiles: unique([
      ...workflowDirs.map((dir) => dir.path),
      ...authConfigs.map((config) => config.path),
      ...routeFiles.slice(0, 8)
    ]),
    review: {
      userTask: "Add or modify access control for a protected route or API endpoint.",
      expectedSkillUsage:
        "Codex should use the skill before changing auth middleware, guards, permissions, route protection, user context, redirects, or unauthorized responses.",
      relevantFiles: unique([...workflowDirs.map((dir) => dir.path), ...authConfigs.map((config) => config.path)]),
      expectedAgentBehavior: [
        "Trace how existing routes or endpoints determine user access before editing.",
        "Reuse the repository's guard, middleware, redirect, and unauthorized-response conventions.",
        "Treat missing auth evidence as uncertainty instead of inventing a new scheme."
      ],
      reviewerChecklist: [
        "Protected routes or endpoints use the existing access-control path.",
        "Unauthorized behavior matches nearby examples.",
        "Validation commands match package scripts."
      ],
      validationCommands: validationCommands(facts)
    }
  });
}

function seoMetadataCandidate(facts: RepoFacts): SkillCandidate | undefined {
  const seoDirs = dirsByName(facts, ["seo", "content", "cms"]);
  const seoConfigs = configFilesByKind(facts, ["seo", "metadata"]);
  const nextRouteFiles = facts.routePatterns
    .filter((route) => route.kind === "next-app-router" || route.kind === "next-pages-router")
    .flatMap((route) => route.files);

  if (seoDirs.length === 0 && seoConfigs.length === 0 && nextRouteFiles.length === 0) return undefined;
  if (!facts.frameworks.includes("Next.js") && seoDirs.length === 0 && seoConfigs.length === 0) return undefined;

  return candidate({
    id: "seo-metadata-workflow",
    title: "Update SEO metadata and sitemap workflow",
    suggestedName: "seo-metadata-workflow",
    summary:
      "Capture how this repository manages page metadata, sitemap/robots files, manifest data, content-derived SEO fields, and validation for public routes.",
    confidence: score(0.62, seoDirs.length + seoConfigs.length + nextRouteFiles.length, facts.packageScripts, [
      "Next.js",
      "React"
    ]),
    reasons: [
      "SEO, metadata, sitemap, manifest, content, CMS, or Next.js route signals were detected.",
      "SEO changes are repo-specific when metadata is derived from routes, content models, static files, or framework-specific conventions."
    ],
    evidence: [
      ...seoDirs.map((dir) => evidence("directory", dir.path, dir.reason, dir.confidence)),
      ...seoConfigs.map((config) => evidence("config", config.path, `Relevant ${config.kind} file.`, 0.78)),
      ...nextRouteFiles.slice(0, 8).map((file) => evidence("file", file, "Public route example that may define metadata.", 0.72)),
      ...scriptsEvidence(facts, ["build", "test", "lint", "typecheck"])
    ],
    relevantFiles: unique([
      ...seoDirs.map((dir) => dir.path),
      ...seoConfigs.map((config) => config.path),
      ...nextRouteFiles.slice(0, 10)
    ]),
    review: {
      userTask: "Update metadata, sitemap, or route SEO behavior for a public page.",
      expectedSkillUsage:
        "Codex should use the skill before changing page metadata, sitemap/robots/manifest files, content-derived SEO fields, or public route indexing behavior.",
      relevantFiles: unique([...seoDirs.map((dir) => dir.path), ...seoConfigs.map((config) => config.path), ...nextRouteFiles.slice(0, 6)]),
      expectedAgentBehavior: [
        "Inspect existing route metadata and SEO files before editing.",
        "Keep content-derived metadata and route-level metadata consistent with nearby examples.",
        "Run or recommend a build/typecheck command when metadata is statically generated."
      ],
      reviewerChecklist: [
        "Metadata source matches existing route/content conventions.",
        "Sitemap, robots, or manifest changes are included only when the repository has those files.",
        "Validation commands match package scripts."
      ],
      validationCommands: validationCommands(facts)
    }
  });
}

function localizationCandidate(facts: RepoFacts): SkillCandidate | undefined {
  const localeDirs = dirsByName(facts, ["i18n", "locales", "locale", "messages", "translations"]);
  if (localeDirs.length === 0) return undefined;

  const routeFiles = routeExampleFiles(facts);
  return candidate({
    id: "localization-workflow",
    title: "Add localization using repository conventions",
    suggestedName: "localization-workflow",
    summary:
      "Capture how this repository stores translation messages, wires locale-aware routes/components, and validates localization changes.",
    confidence: score(0.65, localeDirs.length + routeFiles.length, facts.packageScripts, ["React", "Next.js", "TypeScript"]),
    reasons: [
      "Localization directories were detected.",
      "Localization work is repo-specific because message storage, key naming, locale routing, fallbacks, and component access patterns vary widely."
    ],
    evidence: [
      ...localeDirs.map((dir) => evidence("directory", dir.path, dir.reason, dir.confidence)),
      ...routeFiles.slice(0, 6).map((file) => evidence("file", file, "Route/component example that may be locale-aware.", 0.68)),
      ...scriptsEvidence(facts, ["build", "test", "lint", "typecheck"])
    ],
    relevantFiles: unique([...localeDirs.map((dir) => dir.path), ...routeFiles.slice(0, 8)]),
    review: {
      userTask: "Add translated UI text or a locale-aware page.",
      expectedSkillUsage:
        "Codex should use the skill before editing translation dictionaries, locale routing, localized metadata, or components that read localized messages.",
      relevantFiles: localeDirs.map((dir) => dir.path),
      expectedAgentBehavior: [
        "Inspect existing translation key naming and locale fallback patterns.",
        "Update every locale file required by similar examples.",
        "Validate with the closest build/typecheck/test command."
      ],
      reviewerChecklist: [
        "Translation keys follow existing naming.",
        "All required locale dictionaries are updated.",
        "Validation commands match package scripts."
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

function nodeCliWorkflowCandidate(facts: RepoFacts): SkillCandidate | undefined {
  if (!facts.frameworks.includes("Node.js")) return undefined;

  const cliDirs = dirsByName(facts, ["cli", "bin", "commands", "scripts"]);
  const entryPoints = facts.entryPoints.filter((file) => /(^|\/)(index|main)\.(t|j)sx?$/.test(file));
  if (facts.packageBins.length === 0 && cliDirs.length === 0) return undefined;

  const packageManifest = configFilesByKind(facts, ["package manifest"]);
  const relevantFiles = unique([
    ...entryPoints,
    ...cliDirs.map((dir) => dir.path),
    ...packageManifest.map((config) => config.path),
    ...configFilesByKind(facts, ["typescript"]).map((config) => config.path)
  ]);

  return candidate({
    id: "node-cli-workflow",
    title: "Work on the repository CLI entrypoint",
    suggestedName: "node-cli-workflow",
    summary:
      "Capture how this repository exposes a Node CLI, connects package bin entries to source entrypoints, parses arguments, runs commands, and validates builds.",
    confidence: score(0.68, facts.packageBins.length + cliDirs.length + entryPoints.length, facts.packageScripts, [
      "Node.js",
      "TypeScript"
    ]),
    reasons: [
      "A package bin or CLI-oriented directory was detected.",
      "CLI work is repo-specific because bin mapping, argument parsing, command orchestration, subprocess execution, and build output conventions differ."
    ],
    evidence: [
      ...facts.packageBins.map((bin) => evidence("config", "package.json", `Package bin points to ${bin}.`, 0.86)),
      ...entryPoints.map((file) => evidence("file", file, "Potential CLI source entrypoint.", 0.78)),
      ...cliDirs.map((dir) => evidence("directory", dir.path, dir.reason, dir.confidence)),
      ...scriptsEvidence(facts, ["dev", "start", "build", "typecheck", "test"])
    ],
    relevantFiles,
    review: {
      userTask: "Add or modify CLI behavior using this repository's existing command flow.",
      expectedSkillUsage:
        "Codex should use the skill before changing CLI argument parsing, package bin mapping, command orchestration, subprocess execution, or build output assumptions.",
      relevantFiles,
      expectedAgentBehavior: [
        "Trace package bin mapping to the source entrypoint before editing.",
        "Follow existing argument parsing, error handling, logging, and subprocess conventions.",
        "Run or recommend build/typecheck and a representative CLI invocation."
      ],
      reviewerChecklist: [
        "Package bin and source entrypoint remain consistent.",
        "CLI errors and output follow existing conventions.",
        "Validation commands match package scripts."
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
    confidence: facts.generatedFilePatterns.length > 0 ? 0.72 : 0.58,
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

function hasFrontend(facts: RepoFacts): boolean {
  return ["React", "Next.js", "Vite"].some((framework) => facts.frameworks.includes(framework));
}

function dirsByName(facts: RepoFacts, names: string[]): RepoFacts["importantDirectories"] {
  const nameSet = new Set(names);
  return facts.importantDirectories.filter((dir) => nameSet.has(dir.path));
}

function configFilesByKind(facts: RepoFacts, kinds: string[]): RepoFacts["configFiles"] {
  const kindSet = new Set(kinds);
  return facts.configFiles.filter((config) => kindSet.has(config.kind));
}

function routeExampleFiles(facts: RepoFacts): string[] {
  return unique(facts.routePatterns.flatMap((route) => route.files));
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
