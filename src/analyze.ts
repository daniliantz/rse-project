import { basename, dirname, extname, join } from "node:path";
import { readFile, stat } from "node:fs/promises";
import fg from "fast-glob";
import ignore from "ignore";
import { maskSecrets } from "./secrets.js";
import { readJsonIfExists, readTextIfExists } from "./fs.js";
import type {
  ApiPattern,
  CiPipeline,
  ConfigFile,
  DirectoryInfo,
  DocFile,
  PackageManager,
  RepoFacts,
  RoutePattern,
  TestPattern,
  WorkspaceInfo
} from "./types.js";

type PackageJson = {
  name?: string;
  bin?: string | Record<string, string>;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  workspaces?: string[] | { packages?: string[] };
};

const ALWAYS_IGNORE = [
  ".git",
  ".git/**",
  "node_modules",
  "node_modules/**",
  "dist",
  "dist/**",
  "build",
  "build/**",
  ".next",
  ".next/**",
  "out",
  "out/**",
  "coverage",
  "coverage/**",
  ".cache",
  ".cache/**",
  ".turbo",
  ".turbo/**",
  ".nx",
  ".nx/**",
  ".vercel",
  ".vercel/**",
  ".env",
  ".env.*",
  "*.pem",
  "*.key",
  "*.crt"
];

const IMPORTANT_DIRS: Record<string, string> = {
  app: "application routes or app-level source",
  pages: "route-level page components",
  screens: "screen-level UI modules",
  views: "view-level UI modules",
  layouts: "layout and shell components",
  src: "main source tree",
  components: "shared UI components",
  ui: "UI primitives and shared components",
  widgets: "composed UI widgets",
  features: "feature modules and state",
  modules: "feature or domain modules",
  entities: "domain entity modules",
  lib: "shared application utilities",
  shared: "shared adapters and utilities",
  hooks: "shared hooks",
  types: "shared type definitions",
  models: "domain or DTO models",
  schemas: "validation or data schemas",
  server: "server-side code",
  api: "API surface",
  clients: "API or integration clients",
  client: "API or integration client code",
  routes: "HTTP route definitions",
  controllers: "controller layer",
  services: "service layer",
  store: "state store modules",
  stores: "state store modules",
  state: "state management modules",
  slices: "state slices or reducers",
  forms: "form components and workflows",
  validation: "validation logic",
  validators: "validation helpers",
  auth: "authentication and authorization code",
  middleware: "request middleware",
  middlewares: "request middleware",
  guards: "route or permission guards",
  permissions: "permissions and access-control code",
  i18n: "localization and i18n code",
  locales: "locale dictionaries",
  locale: "locale dictionaries",
  messages: "translation messages",
  translations: "translation dictionaries",
  analytics: "analytics instrumentation",
  tracking: "tracking instrumentation",
  tests: "test suite",
  e2e: "end-to-end tests",
  apps: "monorepo applications",
  packages: "monorepo packages",
  docs: "project documentation",
  scripts: "project scripts and tooling",
  cli: "CLI command code",
  bin: "CLI entry points",
  commands: "CLI or task command modules",
  prisma: "Prisma schema and migrations",
  public: "static assets",
  styles: "global styles",
  seo: "SEO and metadata logic",
  cms: "CMS integration layer",
  content: "content data and content models",
  jobs: "background jobs",
  workers: "background workers"
};

const CONFIG_KIND_BY_FILE: Record<string, string> = {
  "package.json": "package manifest",
  "tsconfig.json": "typescript",
  "jsconfig.json": "javascript",
  "next.config.js": "nextjs",
  "next.config.mjs": "nextjs",
  "next.config.ts": "nextjs",
  "middleware.js": "middleware",
  "middleware.ts": "middleware",
  "sitemap.js": "seo",
  "sitemap.ts": "seo",
  "robots.js": "seo",
  "robots.ts": "seo",
  "manifest.js": "metadata",
  "manifest.ts": "metadata",
  "next-sitemap.config.js": "seo",
  "next-sitemap.config.mjs": "seo",
  "next-sitemap.config.ts": "seo",
  "vite.config.js": "vite",
  "vite.config.mjs": "vite",
  "vite.config.ts": "vite",
  "turbo.json": "turborepo",
  "nx.json": "nx",
  "eslint.config.js": "eslint",
  "eslint.config.mjs": "eslint",
  ".eslintrc": "eslint",
  ".eslintrc.json": "eslint",
  "biome.json": "biome",
  ".prettierrc": "prettier",
  ".prettierrc.json": "prettier",
  "prettier.config.js": "prettier",
  "tailwind.config.js": "tailwind",
  "tailwind.config.ts": "tailwind",
  "postcss.config.js": "postcss",
  "playwright.config.ts": "playwright",
  "playwright.config.js": "playwright",
  "vitest.config.ts": "vitest",
  "vitest.config.js": "vitest",
  "jest.config.ts": "jest",
  "jest.config.js": "jest",
  "cypress.config.ts": "cypress",
  "cypress.config.js": "cypress"
};

export async function analyzeRepository(repoRoot: string): Promise<RepoFacts> {
  const ignores = await buildIgnoreMatcher(repoRoot);
  const files = await listRepoFiles(repoRoot, ignores);
  const rootPackageJson = await readJsonIfExists<PackageJson>(join(repoRoot, "package.json"));
  const packageJsons = await readPackageJsons(repoRoot, files);
  const dependencies = collectDependencies(packageJsons);
  const packageManager = detectPackageManager(files);
  const packageScripts = await detectPackageScripts(repoRoot, files, rootPackageJson, packageManager);

  return {
    repoRoot,
    repoName: basename(repoRoot),
    packageManager,
    packageBins: detectPackageBins(rootPackageJson),
    languages: detectLanguages(files),
    frameworks: detectFrameworks(files, dependencies),
    packageScripts,
    workspaces: await detectWorkspaces(repoRoot, files, rootPackageJson),
    importantDirectories: detectImportantDirectories(files),
    entryPoints: detectEntryPoints(files),
    routePatterns: await detectRoutePatterns(repoRoot, files, dependencies),
    apiPatterns: detectApiPatterns(files, dependencies),
    testPatterns: detectTestPatterns(files, packageScripts, dependencies),
    ciPipelines: detectCiPipelines(files),
    docs: await detectDocs(repoRoot, files),
    configFiles: detectConfigFiles(files),
    generatedFilePatterns: detectGeneratedFilePatterns(files),
    doNotEditPatterns: detectDoNotEditPatterns(files),
    analyzedFileCount: files.length
  };
}

async function buildIgnoreMatcher(repoRoot: string) {
  const matcher = ignore().add(ALWAYS_IGNORE);
  const gitignore = await readTextIfExists(join(repoRoot, ".gitignore"));
  if (gitignore) {
    matcher.add(gitignore);
  }

  return matcher;
}

async function listRepoFiles(repoRoot: string, ignores: ReturnType<typeof ignore>): Promise<string[]> {
  const files = await fg(["**/*"], {
    cwd: repoRoot,
    dot: true,
    onlyFiles: true,
    followSymbolicLinks: false,
    unique: true
  });

  return files.filter((file) => !ignores.ignores(file)).sort();
}

async function readPackageJsons(repoRoot: string, files: string[]): Promise<PackageJson[]> {
  const packageFiles = files.filter((file) => basename(file) === "package.json");
  const packages = await Promise.all(
    packageFiles.map((file) => readJsonIfExists<PackageJson>(join(repoRoot, file)))
  );

  return packages.filter((pkg): pkg is PackageJson => Boolean(pkg));
}

function collectDependencies(packageJsons: PackageJson[]): Map<string, string> {
  const dependencies = new Map<string, string>();
  for (const pkg of packageJsons) {
    for (const section of [pkg.dependencies, pkg.devDependencies, pkg.peerDependencies]) {
      for (const [name, version] of Object.entries(section ?? {})) {
        dependencies.set(name, version);
      }
    }
  }

  return dependencies;
}

function detectPackageManager(files: string[]): PackageManager {
  if (files.includes("pnpm-lock.yaml")) return "pnpm";
  if (files.includes("yarn.lock")) return "yarn";
  if (files.includes("bun.lockb") || files.includes("bun.lock")) return "bun";
  if (files.includes("package-lock.json")) return "npm";
  if (files.some((file) => basename(file) === "pnpm-lock.yaml")) return "pnpm";
  if (files.some((file) => basename(file) === "yarn.lock")) return "yarn";
  if (files.some((file) => basename(file) === "bun.lockb" || basename(file) === "bun.lock")) return "bun";
  if (files.some((file) => basename(file) === "package-lock.json")) return "npm";
  return "unknown";
}

async function detectPackageScripts(
  repoRoot: string,
  files: string[],
  rootPackageJson: PackageJson | undefined,
  packageManager: PackageManager
): Promise<Record<string, string>> {
  const scripts: Record<string, string> = { ...(rootPackageJson?.scripts ?? {}) };
  const packageJsonFiles = files
    .filter((file) => basename(file) === "package.json")
    .filter((file) => file !== "package.json")
    .filter((file) => !file.includes("/node_modules/"))
    .filter((file) => file.split("/").length <= 3);

  for (const packageJsonFile of packageJsonFiles) {
    const pkg = await readJsonIfExists<PackageJson>(join(repoRoot, packageJsonFile));
    const packageDir = dirname(packageJsonFile);
    for (const scriptName of Object.keys(pkg?.scripts ?? {})) {
      scripts[`${packageDir}:${scriptName}`] = `cd ${packageDir} && ${packageRunCommand(packageManager, scriptName)}`;
    }
  }

  return scripts;
}

function packageRunCommand(packageManager: PackageManager, scriptName: string): string {
  if (packageManager === "yarn") return `yarn ${scriptName}`;
  if (packageManager === "pnpm") return `pnpm ${scriptName}`;
  if (packageManager === "bun") return `bun run ${scriptName}`;
  return `npm run ${scriptName}`;
}

function detectPackageBins(rootPackageJson?: PackageJson): string[] {
  const bin = rootPackageJson?.bin;
  if (!bin) return [];
  if (typeof bin === "string") return [bin];
  return Object.values(bin);
}

function detectLanguages(files: string[]): string[] {
  const counts = new Map<string, number>();
  const languageByExt: Record<string, string> = {
    ".ts": "TypeScript",
    ".tsx": "TypeScript React",
    ".js": "JavaScript",
    ".jsx": "JavaScript React",
    ".mjs": "JavaScript",
    ".cjs": "JavaScript",
    ".json": "JSON",
    ".md": "Markdown",
    ".css": "CSS",
    ".scss": "SCSS",
    ".py": "Python",
    ".go": "Go",
    ".java": "Java",
    ".rs": "Rust"
  };

  for (const file of files) {
    const language = languageByExt[extname(file)];
    if (language) {
      counts.set(language, (counts.get(language) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([language]) => language);
}

function detectFrameworks(files: string[], dependencies: Map<string, string>): string[] {
  const frameworks = new Set<string>();

  if (hasNextSignals(files, dependencies)) {
    frameworks.add("Next.js");
  }
  if (dependencies.has("react") || dependencies.has("react-dom")) frameworks.add("React");
  if (dependencies.has("vite") || files.some((file) => basename(file).startsWith("vite.config"))) {
    frameworks.add("Vite");
  }
  if (dependencies.has("express")) frameworks.add("Express");
  if (dependencies.has("fastify")) frameworks.add("Fastify");
  if (dependencies.has("@nestjs/core")) frameworks.add("NestJS");
  if (dependencies.has("typescript") || files.some((file) => extname(file) === ".ts")) {
    frameworks.add("TypeScript");
  }
  if (dependencies.has("tailwindcss") || files.some((file) => basename(file).startsWith("tailwind.config"))) {
    frameworks.add("Tailwind CSS");
  }
  if (files.includes("turbo.json")) frameworks.add("Turborepo");
  if (files.includes("nx.json")) frameworks.add("Nx");
  if (files.some((file) => basename(file) === "package.json")) frameworks.add("Node.js");

  return [...frameworks];
}

async function detectWorkspaces(
  repoRoot: string,
  files: string[],
  rootPackageJson?: PackageJson
): Promise<WorkspaceInfo[]> {
  const workspacePatterns = normalizeWorkspacePatterns(rootPackageJson?.workspaces);
  const packageJsonPaths = new Set<string>();

  for (const pattern of workspacePatterns) {
    const matches = await fg(`${pattern.replace(/\/$/, "")}/package.json`, {
      cwd: repoRoot,
      onlyFiles: true,
      dot: false
    });
    for (const match of matches) {
      packageJsonPaths.add(match);
    }
  }

  for (const file of files) {
    if (/^(apps|packages)\/[^/]+\/package\.json$/.test(file)) {
      packageJsonPaths.add(file);
    }
  }

  const workspaces: WorkspaceInfo[] = [];
  for (const packageJsonPath of [...packageJsonPaths].sort()) {
    const pkg = await readJsonIfExists<PackageJson>(join(repoRoot, packageJsonPath));
    workspaces.push({
      name: pkg?.name ?? basename(dirname(packageJsonPath)),
      path: dirname(packageJsonPath),
      packageJsonPath
    });
  }

  return workspaces;
}

function normalizeWorkspacePatterns(workspaces?: PackageJson["workspaces"]): string[] {
  if (Array.isArray(workspaces)) {
    return workspaces;
  }
  return workspaces?.packages ?? [];
}

function detectImportantDirectories(files: string[]): DirectoryInfo[] {
  const dirs = new Map<string, number>();
  for (const file of files) {
    for (const segment of new Set(file.split("/"))) {
      if (IMPORTANT_DIRS[segment]) {
        dirs.set(segment, (dirs.get(segment) ?? 0) + 1);
      }
    }
  }

  return [...dirs.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([dir, count]) => ({
      path: dir,
      reason: `${IMPORTANT_DIRS[dir]} (${count} detected files)`,
      confidence: Math.min(0.95, 0.55 + count / 30)
    }));
}

function detectEntryPoints(files: string[]): string[] {
  const candidates = [
    "src/main.ts",
    "src/main.tsx",
    "src/index.ts",
    "src/index.tsx",
    "src/App.tsx",
    "app/layout.tsx",
    "app/page.tsx",
    "pages/_app.tsx",
    "server.ts",
    "src/server.ts",
    "index.ts",
    "main.ts"
  ];

  return candidates.filter((candidate) => files.includes(candidate));
}

async function detectRoutePatterns(
  repoRoot: string,
  files: string[],
  dependencies: Map<string, string>
): Promise<RoutePattern[]> {
  const patterns: RoutePattern[] = [];
  const nextSignals = hasNextSignals(files, dependencies);
  const nextAppPages = nextSignals
    ? files.filter((file) => /(^|\/)app\/(?:.*\/)?page\.(t|j)sx?$/.test(file))
    : [];
  const nextPages = nextSignals
    ? files.filter((file) => /(^|\/)pages\/.+\.(t|j)sx?$/.test(file) && !/(^|\/)pages\/api\//.test(file))
    : [];
  const nestControllers = files.filter((file) => file.endsWith(".controller.ts"));
  const sourceTextMatches = await findSourceTextMatches(repoRoot, files);

  if (nextAppPages.length > 0) {
    patterns.push({
      kind: "next-app-router",
      files: nextAppPages.slice(0, 20),
      summary: "Next.js App Router pages are present.",
      confidence: 0.9
    });
  }

  if (nextPages.length > 0) {
    patterns.push({
      kind: "next-pages-router",
      files: nextPages.slice(0, 20),
      summary: "Next.js Pages Router pages are present.",
      confidence: 0.82
    });
  }

  if (sourceTextMatches.reactRouter.length > 0) {
    patterns.push({
      kind: "react-router",
      files: sourceTextMatches.reactRouter.slice(0, 20),
      summary: dependencies.has("vite")
        ? "Vite/React Router route setup was detected in source files."
        : "React Router route setup was detected in source files.",
      confidence: dependencies.has("react-router-dom") ? 0.84 : 0.78
    });
  }

  if (dependencies.has("express") || sourceTextMatches.express.length > 0) {
    patterns.push({
      kind: "express",
      files: sourceTextMatches.express.slice(0, 20),
      summary: "Express route or app setup was detected.",
      confidence: dependencies.has("express") ? 0.8 : 0.68
    });
  }

  if (dependencies.has("fastify") || sourceTextMatches.fastify.length > 0) {
    patterns.push({
      kind: "fastify",
      files: sourceTextMatches.fastify.slice(0, 20),
      summary: "Fastify server or route setup was detected.",
      confidence: dependencies.has("fastify") ? 0.8 : 0.68
    });
  }

  if (dependencies.has("@nestjs/core") || nestControllers.length > 0) {
    patterns.push({
      kind: "nestjs",
      files: nestControllers.slice(0, 20),
      summary: "NestJS controllers/modules are present.",
      confidence: dependencies.has("@nestjs/core") ? 0.84 : 0.72
    });
  }

  return patterns;
}

function detectApiPatterns(files: string[], dependencies: Map<string, string>): ApiPattern[] {
  const patterns: ApiPattern[] = [];
  const nextSignals = hasNextSignals(files, dependencies);
  const nextRouteHandlers = nextSignals
    ? files.filter((file) => /(^|\/)app\/api\/.+\/route\.(t|j)s$/.test(file))
    : [];
  const pagesApi = nextSignals ? files.filter((file) => /(^|\/)pages\/api\/.+\.(t|j)s$/.test(file)) : [];
  const routeFiles = files.filter((file) => /(^|\/)(routes|controllers)\/.+\.(t|j)s$/.test(file));

  if (nextRouteHandlers.length > 0) {
    patterns.push({
      kind: "next-app-api-routes",
      files: nextRouteHandlers.slice(0, 20),
      summary: "Next.js App Router API route handlers are present.",
      confidence: 0.9
    });
  }

  if (pagesApi.length > 0) {
    patterns.push({
      kind: "next-pages-api-routes",
      files: pagesApi.slice(0, 20),
      summary: "Next.js Pages Router API routes are present.",
      confidence: 0.82
    });
  }

  if (routeFiles.length > 0 || dependencies.has("express") || dependencies.has("fastify")) {
    patterns.push({
      kind: dependencies.has("fastify") ? "fastify-routes" : "node-http-routes",
      files: routeFiles.slice(0, 20),
      summary: "Node HTTP routing files or dependencies were detected.",
      confidence: routeFiles.length > 1 ? 0.78 : 0.65
    });
  }

  return patterns;
}

function hasNextSignals(files: string[], dependencies: Map<string, string>): boolean {
  return dependencies.has("next") || files.some((file) => /^(.+\/)?next\.config\.(js|mjs|ts)$/.test(file));
}

function detectTestPatterns(
  files: string[],
  packageScripts: Record<string, string>,
  dependencies: Map<string, string>
): TestPattern[] {
  const testFiles = files.filter((file) =>
    /(\.|\/)(test|spec)\.(t|j)sx?$/.test(file) || /(^|\/)(__tests__|tests|e2e)\//.test(file)
  );
  const commands = Object.entries(packageScripts)
    .filter(([name, command]) => /test|spec|e2e|check/i.test(name) || /vitest|jest|playwright|cypress/i.test(command))
    .map(([name, command]) => `${name}: ${command}`);

  const patterns: TestPattern[] = [];
  const add = (tool: TestPattern["tool"], confidence: number) => {
    patterns.push({ tool, files: testFiles.slice(0, 25), commands, confidence });
  };

  if (dependencies.has("vitest") || commands.some((command) => command.includes("vitest"))) add("vitest", 0.86);
  if (dependencies.has("jest") || commands.some((command) => command.includes("jest"))) add("jest", 0.82);
  if (dependencies.has("@playwright/test") || commands.some((command) => command.includes("playwright"))) {
    add("playwright", 0.86);
  }
  if (dependencies.has("cypress") || commands.some((command) => command.includes("cypress"))) add("cypress", 0.82);
  if (dependencies.has("@testing-library/react")) add("testing-library", 0.76);

  if (patterns.length === 0 && (testFiles.length > 0 || commands.length > 0)) {
    add("unknown", 0.62);
  }

  return patterns;
}

function detectCiPipelines(files: string[]): CiPipeline[] {
  const pipelines: CiPipeline[] = [];
  const githubActions = files.filter((file) => /^\.github\/workflows\/.+\.ya?ml$/.test(file));
  if (githubActions.length > 0) {
    pipelines.push({ provider: "github-actions", files: githubActions });
  }
  if (files.includes(".gitlab-ci.yml")) {
    pipelines.push({ provider: "gitlab-ci", files: [".gitlab-ci.yml"] });
  }
  if (files.includes(".circleci/config.yml")) {
    pipelines.push({ provider: "circleci", files: [".circleci/config.yml"] });
  }

  return pipelines;
}

async function detectDocs(repoRoot: string, files: string[]): Promise<DocFile[]> {
  const docFiles = files
    .filter((file) => {
      const name = basename(file).toLowerCase();
      return name.startsWith("readme") || file.startsWith("docs/") || name === "agents.md";
    })
    .filter((file) => /\.(md|mdx|txt)$/i.test(file))
    .slice(0, 50);

  const docs: DocFile[] = [];
  for (const file of docFiles) {
    const text = await readSmallText(join(repoRoot, file));
    const safeText = maskSecrets(text);
    const title = safeText.match(/^#\s+(.+)$/m)?.[1]?.trim();
    docs.push({
      path: file,
      title,
      summary: safeText.split(/\r?\n/).find((line) => line.trim() && !line.startsWith("#"))?.trim()
    });
  }

  return docs;
}

function detectConfigFiles(files: string[]): ConfigFile[] {
  const configs: ConfigFile[] = [];
  for (const file of files) {
    const name = basename(file);
    const kind = CONFIG_KIND_BY_FILE[name];
    if (kind) {
      configs.push({ path: file, kind });
    }
  }

  return configs;
}

function detectGeneratedFilePatterns(files: string[]): string[] {
  const patterns = new Set<string>();
  if (files.some((file) => /(^|\/)__generated__\//.test(file))) patterns.add("**/__generated__/**");
  if (files.some((file) => /(^|\/)generated\//.test(file))) patterns.add("**/generated/**");
  if (files.some((file) => /\.generated\./.test(file))) patterns.add("**/*.generated.*");
  if (files.some((file) => /\.gen\./.test(file))) patterns.add("**/*.gen.*");
  if (files.some((file) => file.includes("openapi") || file.includes("swagger"))) patterns.add("*openapi* / *swagger*");
  return [...patterns];
}

function detectDoNotEditPatterns(files: string[]): string[] {
  const patterns = new Set<string>();
  for (const lockFile of ["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lock", "bun.lockb"]) {
    if (files.includes(lockFile)) {
      patterns.add(lockFile);
    }
  }

  for (const generated of detectGeneratedFilePatterns(files)) {
    patterns.add(generated);
  }

  return [...patterns];
}

async function findSourceTextMatches(repoRoot: string, files: string[]) {
  const sourceFiles = files
    .filter((file) => /\.(t|j)sx?$/.test(file))
    .filter((file) => !file.endsWith(".d.ts"))
    .slice(0, 800);
  const matches = {
    reactRouter: [] as string[],
    express: [] as string[],
    fastify: [] as string[]
  };

  for (const file of sourceFiles) {
    const text = await readSmallText(join(repoRoot, file));
    const hasReactRouterImport =
      /import\s+.+\s+from\s+["']react-router(?:-dom)?["']|require\(["']react-router(?:-dom)?["']\)/.test(text);
    const hasReactRouterJsx = /\.(t|j)sx$/.test(file) && /<Routes\b|<Route\b/.test(text);
    if (hasReactRouterImport || hasReactRouterJsx) {
      matches.reactRouter.push(file);
    }
    if (/from ["']express["']|require\(["']express["']\)|express\(\)|Router\(\)|app\.(get|post|put|patch|delete)\(/.test(text)) {
      matches.express.push(file);
    }
    if (/from ["']fastify["']|require\(["']fastify["']\)|fastify\(|\.route\(\{/.test(text)) {
      matches.fastify.push(file);
    }
  }

  return matches;
}

async function readSmallText(filePath: string): Promise<string> {
  const stats = await stat(filePath).catch(() => undefined);
  if (!stats || stats.size > 250_000) {
    return "";
  }

  return readFile(filePath, "utf8").catch(() => "");
}
