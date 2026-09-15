# Extraction validation

Source baseline: `85fdf19f8962d17b6f1e0612df9a01b6c30398d4`.

## Results

- Frozen installation with Bun 1.4.2; Zoltar development and production builds.
- A fresh source-only copy in `/tmp/zoltar-clean-validation`, with no parent repository or generated files, passed frozen install, production build, and artifact verification.
- Full TypeScript check, Biome formatting/lint checks, and import-boundary checks.
- 101 contract tests passed. The same selected upstream contract suite also passed 101 tests.
- 971 UI/runtime tests passed; 10 opt-in live-network tests skipped. Isolated test execution prevents upstream module-mock leakage.
- 36 tooling tests passed, including 34 retained deployment checks, a fresh local-chain deployment/idempotence check, and import-boundary tests.
- All 19 production ABIs and creation/runtime bytecodes match the upstream Zoltar target exactly.
- Chromium production smoke at 1440×900 and 390×844 using `?simulate=1&simScenario=deployed#/zoltar`.
- Production Chromium workflow: empty question form guard, question creation, REP approval, universe fork, outcome selection, child-universe deployment through REP splitting, and rendered migrated balance.

UI tests and contract tests cover failure/recovery cases. Browser workflow validation uses the real production bundle and simulation worker; it does not broadcast public-chain transactions. Browser screenshots were captured locally at `/tmp/zoltar-desktop.png` and `/tmp/zoltar-mobile.png` and are not committed build inputs.

## Baseline findings

Running the upstream selected UI tests in one process caused module-mock leakage. Isolated execution resolved those failures. Upstream's app-scoped build did not generate the aggregate contract-test artifact, so tests importing Solidity test support required that separate generation step. The extracted commands make this prerequisite explicit.

## External configuration

GitHub-hosted CI and public publishing/deployment have not run as part of local validation. Workflow YAML files are installed in `.github/workflows/`. The testnet workflow also requires a configured `zoltar-testnet` environment and signing secret. Hosting and explorer source publication remain configuration work for a future release.
