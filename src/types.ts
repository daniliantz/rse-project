export type PackageManager = "npm" | "yarn" | "pnpm" | "bun" | "unknown";

export type EvidenceKind =
  | "file"
  | "directory"
  | "script"
  | "dependency"
  | "config"
  | "doc"
  | "pattern";

export type RouteKind =
  | "next-app-router"
  | "next-pages-router"
  | "react-router"
  | "express"
  | "fastify"
  | "nestjs"
  | "unknown";

export interface WorkspaceInfo {
  name: string;
  path: string;
  packageJsonPath?: string;
}

export interface DirectoryInfo {
  path: string;
  reason: string;
  confidence: number;
}

export interface RoutePattern {
  kind: RouteKind;
  files: string[];
  summary: string;
  confidence: number;
}

export interface ApiPattern {
  kind: string;
  files: string[];
  summary: string;
  confidence: number;
}

export interface TestPattern {
  tool:
    | "vitest"
    | "jest"
    | "playwright"
    | "cypress"
    | "testing-library"
    | "unknown";
  files: string[];
  commands: string[];
  confidence: number;
}

export interface CiPipeline {
  provider: "github-actions" | "gitlab-ci" | "circleci" | "unknown";
  files: string[];
}

export interface DocFile {
  path: string;
  title?: string;
  summary?: string;
}

export interface ConfigFile {
  path: string;
  kind: string;
}

export interface RepoFacts {
  repoRoot: string;
  repoName: string;
  packageManager: PackageManager;
  languages: string[];
  frameworks: string[];
  packageScripts: Record<string, string>;
  workspaces: WorkspaceInfo[];
  importantDirectories: DirectoryInfo[];
  entryPoints: string[];
  routePatterns: RoutePattern[];
  apiPatterns: ApiPattern[];
  testPatterns: TestPattern[];
  ciPipelines: CiPipeline[];
  docs: DocFile[];
  configFiles: ConfigFile[];
  generatedFilePatterns: string[];
  doNotEditPatterns: string[];
  analyzedFileCount: number;
}

export interface EvidenceItem {
  kind: EvidenceKind;
  path?: string;
  value?: string;
  reason: string;
  confidence: number;
}

export interface ReviewExample {
  userTask: string;
  expectedSkillUsage: string;
  relevantFiles: string[];
  expectedAgentBehavior: string[];
  reviewerChecklist: string[];
  validationCommands: string[];
}

export interface SkillCandidate {
  id: string;
  title: string;
  suggestedName: string;
  summary: string;
  confidence: number;
  reasons: string[];
  evidence: EvidenceItem[];
  relevantFiles: string[];
  suggestedReviewExample: ReviewExample;
  rejected?: boolean;
  rejectionReason?: string;
}

export interface ExtractionRun {
  tool: "rse-project";
  generatedAt: string;
  baseBranch: string;
  skillBranch: string;
  facts: RepoFacts;
  candidates: SkillCandidate[];
  rejectedCandidates: SkillCandidate[];
}
