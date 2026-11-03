# ResumeFlow — Codex repository instructions

## Collaboration and repository workflow

- Start new work from a GitHub Issue with a concrete goal, acceptance criteria and dependencies. Search for an existing matching Issue before creating one. The current roadmap is `ROADMAP.md` / parent Issue #4. The CLI MVP implementation is complete; require a new Issue for additional scope.
- Work on a dedicated branch per feature or coherent task, preferably `codex/issue-<number>-<feature>`. Link the Issue from its PR. Do not accumulate unrelated features in one branch.
- Use `Closes #<number>` only when the PR fully resolves that Issue; use `Refs #<number>` for partial work. After the required implementation, tests and CI succeed, record the PR and evidence and close resolved Issues as appropriate. Do not close unresolved dependencies or a parent roadmap merely because work has started. Record whether the linked PR is merged or awaiting integration.
- Develop in the current chat and workspace. Do not open or launch local VS Code unless the user explicitly asks. The offline CLI is the primary entry point; editor adapters are optional.
- Run type checks, unit tests and builds here. Run Extension Development Host integration tests headlessly in GitHub Actions using Xvfb; do not launch local GUI tests.
- The user has requested GitHub version control. Development-time Git initialization, branches, commits and pushes for this project are authorized. The ban on Git mutations below applies to the extension's runtime behavior, not to development-time repository management.
- The user requires a separate branch for each feature. Before editing for a new feature or implementation slice, create or reuse its dedicated `codex/<feature>` branch; do not commit feature work directly to `main`. Keep each branch and pull request focused on one feature. Publish its PR and report its CI results before integration.
- The user requires frequent commits. Commit each small, coherent, validated step: one behavior's test and GREEN implementation, a separate completed refactor, or a focused documentation/configuration update. Keep actual RED evidence in the development log, commit a behavior after its focused and regression checks pass, and avoid accumulating several finished slices in one large commit.
- Keep the repository private unless the user requests a visibility change. Commit source, specifications and TDD evidence; exclude dependencies, generated build output, test profiles, checkpoint data and credentials.
- The user explicitly requires E2E testing. Follow `E2E_PLAN.md` and its release gates. Keep pure unit, Node filesystem I/O, real Git integration, CLI process E2E, Extension Host API, and real UI E2E results separate. A direct service/API call is not a UI E2E test.
- Add the applicable real command-palette/input/confirmation journeys as each user-facing feature becomes usable. Do not add future product features solely to make an E2E case pass. Unimplemented journeys remain documented as pending, never silently skipped or reported as passing.
- Run real VS Code UI E2E only in GitHub Actions / Xvfb with isolated test profiles and synthetic workspaces. Save screenshots and logs, fail on skipped or zero-test suites, and investigate flaky tests without automatically retrying them into a green result.

## Read first

- `ROADMAP.md` defines the Issue order. `CLI_SPEC.md` defines the CLI contract (Issue #5). `SPEC.md` and `TEST_PLAN.md` retain the S0–S3 baseline and original optional VS Code flow.
- Prioritize **offline local use through CLI or Codex without requiring an editor**. Preserve the shared core and keep editor adapters optional. The choice of additional editors is on hold. Do not require an AI API, server, cloud sync, or telemetry for the core product.
- Work only on the agreed Issue / phase / test IDs. Do not silently implement future features or treat roadmap commands as already implemented.
- If a requirement is ambiguous, prefer the smallest **safe and testable** behavior and document the assumption.

## Non-negotiable TDD workflow

For **each individual observable behavior**:

1. **RED**: Write a focused automated test **before** the production implementation. Run the smallest relevant test. Verify failure is due to the expected behavior (failed assertion), not a test-runner or import error. If needed, first add only a type/interface and minimal stub.
2. **GREEN**: Implement the smallest production change that makes that test pass. Run the focused test, then existing unit tests.
3. **REFACTOR**: Improve naming, separation, duplication, and error handling without changing behavior. Rerun all relevant tests.
4. Record evidence in the final response: test ID, red command/failure, green command/result, refactor, tests run, and next case.

### Never

- Implement multiple functions first and generate tests afterward.
- Skip the RED run or fake/redact test output to make the cycle appear complete.
- Change an expected assertion just to match an incorrect implementation.
- Combine many unrelated test cases into one oversized TDD cycle.
- Declare an unexecuted test successful. If GUI integration tests are blocked by the environment, explain why and provide the exact command for a developer machine.

## Architecture boundaries

- TypeScript shared core, Node CLI and optional editor adapters; VS Code runtime dependencies stay in thin adapters.
- Unit tests: **Vitest**. Unit-test the schema, business rules, Git status parsing, comparisons, and storage via fake interfaces; do not require VS Code UI or a live Git process.
- Extension integration tests: `@vscode/test-cli` + `@vscode/test-electron` (runs inside Extension Development Host; Mocha-based toolchain).
- Inject dependencies for `clock`, `idGenerator`, `storage`, `gitRunner`, `editorSnapshot`, and `ui` where practical.
- Keep command registration (`extension.ts`), editor capture, Git capture/parsing, persistence, and restore logic separate.
- Add positive, negative, and cancellation tests. Use dedicated temporary storage and fake repositories in tests; never touch a developer's real workspace state.
- Use CLI_SPEC.md for the agreed CLI contract. Original VS Code S4–S9 are optional future scope, not automatically authorized by CLI completion.

## Security and data constraints

- Never execute Git mutations (`checkout`, `reset`, `stash`, `commit`, etc.) from the extension's runtime code.
- Never read/persist file bodies, unsaved buffer contents, secrets, terminal history, clipboard, or environment variables.
- CLI Git execution requires explicit --allow-git. Editor integrations must also respect workspace trust. Validate non-execution at the injected process boundary.
- Use fixed Git argument arrays (no shell interpolation) and never treat saved URI/path strings as commands.
- Do not overwrite/delete user source files on resume. Do not overwrite corrupted checkpoint data on load failure.
- Keep checkpoint records in application-local storage, not automatically in the repo. Test with dedicated explicit data directories only. Editor integrations retain extension-local storage.

## Quality and commands

- Include these scripts (names fixed for CI and reviewer):
  - `npm run test:unit`
  - `npm run test:node:io`
  - `npm run test:node:integration`
  - `npm run test:cli:e2e`
  - `npm run test:tools`
  - `npm run test:unit:watch`
  - `npm run test:coverage`
  - `npm run test:integration`
  - `npm run test:e2e` (GitHub Actions only)
  - `npm run test:e2e:package` (package check without GUI)
  - `npm run typecheck`
  - `npm run build`
- Include `npm test` or `npm run verify` that runs at least typecheck, unit tests and build.
- Test setup, VS Code downloads, and npm installs are setup prerequisites; they are not a completed RED/GREEN cycle for a product behavior.
- Aim for >=80% unit-test statement and branch coverage of core logic once Phase 1 is complete; do not weaken meaningful assertions to improve the percentage.
- Update README with setup, running tests, manual validation, saved data handling, and known limitations.

## Reporting after every requested slice

```text
Implemented: [test IDs and requirements]
RED: [actual command, meaningful failed assertion]
GREEN: [actual command, pass summary]
REFACTOR: [changes, regression result]
Verification: [typecheck/build/unit/integration status; explicit not-run reasons]
Changed files: [...]
Next: [next test ID and remaining issues]
```
