# Prompt for coding agent: Analyze project layers and generate project-specific skills

````md
# Task: Analyze the project by layers and generate useful project-specific skills

You need to analyze the current codebase as-is and create useful, project-specific Codex skills based on the actual architecture, code patterns, and recurring implementation workflows.

The goal is not to describe generic best practices or library documentation.
The goal is to extract reusable, non-obvious, project-specific knowledge that would help another coding agent work effectively in this exact repository.

Prefer several small, practical skills over one broad layer-level skill when the repository has separate repeatable workflows. For example, "how this project creates a new screen", "how this project wires API calls", and "how this project updates store/state" are usually better than one generic "frontend architecture" skill.

## Hard rules

- Do not modify application code.
- Do not refactor anything.
- Do not invent architecture that is not visible in the code.
- Do not create trivial skills like "How to use React", "How to call an API", "How Redux works", "How Next.js routing works", etc.
- Do not copy generic documentation from libraries.
- Every skill must be grounded in this project's actual code.
- Every claim must reference concrete files, directories, functions, configs, imports, scripts, or patterns.
- If something is uncertain, mark it as `Assumption`.
- If the project is large, analyze top-level structure first, then go deeper into important layers and flows.
- Do not collapse unrelated tasks into one mega-skill just because they belong to the same layer.
- Do not create a skill unless it would help with a realistic future task in this repository.

---

# Part 1: Analyze the project as-is

First, analyze the project and produce an architecture map. The map is evidence for skill selection, not the final product.

## 1. General project structure

Describe:

- main directories
- main entry points
- runtime flow
- build/deployment setup
- where application code starts
- where configuration lives
- where shared code lives
- where feature-specific code lives

Use concrete file paths.

## 2. Identify actual layers

Identify the real layers present in the codebase.

Possible layers include, but are not limited to:

- UI / screens / pages / routes
- layouts / shells / navigation
- reusable components
- feature modules
- hooks
- business logic
- API client / network layer
- server API / route handlers / controllers
- database / persistence
- authentication / authorization
- registration / onboarding
- forms / validation / schemas
- state management / store / cache
- configuration
- feature flags
- localization / i18n
- analytics / tracking
- error handling
- logging
- background jobs / workers
- scripts / tooling / CLI
- tests
- build / deployment / CI
- CMS / external content layer
- middleware / proxy / request routing
- SEO / metadata / sitemap
- permissions / access control
- assets / media / image transformation

If a layer does not exist, say `Not found`.

For each discovered layer, describe:

- layer name
- responsibility
- files and directories
- important modules
- external libraries used
- internal dependencies
- which layers depend on it
- boundary quality: `high`, `medium`, or `low`
- whether the layer is isolated or mixed with other concerns
- concrete examples from the code
- repeatable tasks visible in the layer

## 3. Identify important flows

Trace important flows through the code.

Examples:

- app startup
- route rendering
- creating a new screen/page
- layout composition
- data loading
- API request flow
- authentication flow
- registration flow
- form submission
- state update flow
- caching flow
- error handling flow
- localization flow
- metadata / SEO flow
- sitemap generation
- test execution
- deployment/build flow
- CLI command flow

For each flow, provide:

- start point
- ordered list of involved files
- involved layers
- key functions/modules
- where the flow ends
- unclear or risky parts
- whether the flow deserves its own skill

## 4. Create dependency map

Create a text-based dependency map using only real dependencies visible in the code.

Example format:

```txt
Routes / Pages
  -> Layouts
  -> Components
  -> Data Fetching
      -> API Client
      -> CMS Client
      -> Cache
  -> Metadata / SEO
```

Do not include dependencies that are only theoretical.

## 5. Identify architectural pain points

List concrete issues found in the code:

- mixed responsibilities
- API calls directly inside UI
- business logic inside components
- duplicated logic
- hidden coupling
- unclear naming
- weak boundaries
- hard-to-test code
- inconsistent patterns
- framework-specific traps
- unsafe assumptions
- environment-specific behavior
- caching risks
- SEO risks
- auth/security risks

Each issue must include:

- file path
- evidence
- why it matters
- affected layer
- severity: `low`, `medium`, or `high`

---

# Part 2: Generate project-specific skills

After analyzing the project, create useful skills for future coding agents.

A skill is useful only if it captures project-specific knowledge that is not obvious from generic documentation.

## What counts as a good skill

A good skill should help an agent do real work in this repository, for example:

- add a new screen/page using the existing route, layout, component, metadata, and navigation patterns
- add or modify a server API endpoint using the project's request validation, auth, response, and error conventions
- add or modify frontend API calls using the project's client/service/type conventions
- add or modify store/state/cache logic using the project's registration and selector/hook patterns
- add or modify a form using the project's schema, validation, submit, and error-display conventions
- add a feature module using the existing folder boundaries and cross-layer wiring
- modify an existing flow without breaking hidden assumptions
- safely work with project-specific routing, middleware, or guards
- use the project's API/CMS/data layer correctly
- avoid known traps in caching/static rendering/middleware
- follow established conventions for components, hooks, styles, tests, or configs
- update SEO/metadata/sitemap logic safely
- add a new content type or page type
- add localization support using existing patterns
- debug a recurring project-specific issue
- work with deployment/build/CLI constraints

## What does NOT count as a useful skill

Do not create skills that only say:

- "Use React components"
- "Use TypeScript types"
- "Use async/await"
- "Use Redux for state"
- "Use fetch for API calls"
- "Follow clean code"
- "Write tests"
- "Use Next.js App Router"
- "Read environment variables"
- "Use library X according to its documentation"

These are too generic.

A skill must explain how this project specifically uses those things.

---

# Skill selection rules

Select skills by repeatable task, not by broad layer name.

For each discovered layer and flow, ask:

- What would a future coding agent be asked to change here?
- Is there a repeated project-specific recipe for doing that task?
- Which files must be inspected first?
- Which files usually change together?
- What validation command or review check proves the change is safe?
- What mistakes would a new agent make if it only knew the generic framework?

## Granularity rules

Prefer smaller skills when each skill has a distinct trigger and workflow.

Split skills when any of these differ:

- user task or trigger phrase
- starting files/directories to inspect
- files usually edited
- hidden assumptions or common traps
- validation commands
- reviewer checklist

Merge skills only when they would have nearly identical triggers, files, workflow, traps, and validation.

Good narrow skills may include:

- `add-project-screen` - create a new screen/page using this project's layout and navigation conventions
- `wire-project-api-client` - add frontend API access using this project's client/services/types
- `add-project-api-endpoint` - add server route/controller/handler using this project's API conventions
- `update-project-store` - add state/store/cache behavior using this project's registration and hook patterns
- `wire-project-form-validation` - add or change a form using this project's schema and submit conventions
- `update-project-seo-metadata` - update metadata/sitemap/robots using this project's SEO flow
- `add-project-localization` - add translation keys and locale routing using this project's i18n flow
- `extend-project-tests` - add tests using this project's helpers, placement, and commands

Bad broad skills:

- `frontend-architecture`
- `react-best-practices`
- `api-and-state-and-ui`
- `project-development`
- `testing-guidelines`

## Recommended number

These are targets, not quotas. Reject shallow skills, but do not reject a good skill just because it is small.

- small project: 4-8 skills
- medium project: 8-16 skills
- large project: 12-24 skills

If a layer is simple or generic, mark it as:

```txt
No skill created: layer is too generic / not enough project-specific logic.
```

If a broad layer has several concrete workflows, create several smaller skills and explain the split.

---

# Required skill format

Create each skill as a separate Markdown section. Draft it as if it will become `.agents/skills/<skill-name>/SKILL.md`.

Each skill must use this structure:

~~~md
# Skill: <short practical name>

Suggested path: `.agents/skills/<skill-name>/SKILL.md`

```yaml
---
name: short-kebab-case-name
description: Trigger-focused description naming the exact repository workflow. Include when to use it and when not to use it, because frontmatter drives skill activation.
---
```

## Skill purpose

Explain what task this skill helps with in this repository.

## When to use

Use this skill when the agent needs to:

- ...
- ...
- ...

## When not to use

Do not use this skill when:

- the task is only generic framework/library work
- there is no evidence that this repository has a project-specific pattern for the task
- another more specific skill covers the task

## Repository-specific context

Summarize only the essential project facts needed to do the task. Keep this concise.

## Workflow

Give a practical workflow an agent can follow.

Example:

1. Start from ...
2. Inspect ...
3. Update ...
4. Validate ...
5. Watch out for ...

## Files and directories

- `path/to/file.ts` - why it matters
- `path/to/file.tsx` - why it matters
- `path/to/config.ts` - why it matters

## Project-specific rules

List the actual rules/conventions found in this codebase.

These must be specific to this project, not generic framework advice.

## Common mistakes

List mistakes that are likely in this project.

Each mistake should reference real code or patterns.

## Validation

List concrete commands and checks before considering the task done.

Example:

- [ ] New route is included in the correct routing layer
- [ ] Data fetching uses the existing client/helper
- [ ] Caching behavior matches existing pattern
- [ ] Metadata/sitemap behavior is not broken
- [ ] Types are updated in the correct shared location

## Example task this skill supports

Give one realistic task that this skill would help solve.

## Confidence

High / Medium / Low

## Evidence

List the files/functions/patterns that justify this skill.
~~~

Keep `SKILL.md` concise. Put detailed evidence and review examples into references when actual files are created.

---

# Skill quality bar

Before finalizing each skill, evaluate it.

A skill should be kept only if it passes at least 5 of these checks:

- It is specific to this repository.
- It references concrete files.
- It explains non-obvious project behavior.
- It helps perform a realistic coding task.
- It warns about real project-specific traps.
- It connects multiple files or layers.
- It has a distinct trigger from the other skills.
- It has a distinct workflow from the other skills.
- It would save time for a new developer or coding agent.
- It is not just documentation for a library.
- It is not just a general best practice.

If a skill does not pass the quality bar, delete it.

Additional anti-generic filter:

Before creating any skill, ask:

"Would this skill still be useful if the project used a different framework or library and had a different file layout?"

If the answer is mostly yes, the skill is probably too generic.

A good skill should depend on this repository's actual structure, naming, flows, constraints, and historical decisions.

---

# Output format

Produce the result in Markdown.

The final output must contain:

## 1. Architecture overview

Short summary of the project structure and main layers.

## 2. Layer table

Create this table:

| Layer | Location | Responsibility | Main dependencies | Boundary quality | Repeatable tasks | Skill created? |
|---|---|---|---|---|---|---|

## 3. Important flows

Describe the main flows with file paths.

## 4. Dependency map

Text-based dependency map.

## 5. Skill candidates considered

Create this table:

| Candidate skill | Related workflow/layer | Keep / Reject | Split / Merge decision | Reason |
|---|---|---|---|---|

Reject weak/generic skills explicitly.

## 6. Final skills

Create only the final high-quality skills using the required skill format.

## 7. Suggested file output

At the end, suggest where these skills should be saved.

Use this format:

```txt
.agents/
  skills/
    <skill-name-1>/
      SKILL.md
      references/
        evidence.md
        review-example.md
    <skill-name-2>/
      SKILL.md
      references/
        evidence.md
        review-example.md
```

Do not actually create files unless explicitly asked.
````
