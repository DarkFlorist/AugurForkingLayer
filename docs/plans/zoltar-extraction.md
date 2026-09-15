# Zoltar extraction plan

## Recommendation

Copy Zoltar into a self-contained `zoltar/` directory, with its own Bun workspace, dependencies, contracts, UI, tooling, tests, and documentation. Keep GitHub Actions entrypoints in the repository-root `.github/`, with Zoltar-specific names and paths. Future AugurForkingLayer code should consume explicit Zoltar interfaces and package exports rather than importing application internals.

Implementation lives in `zoltar/`. See `zoltar/UPSTREAM.md` and `zoltar/docs/validation.md` for the delivered scope and validation. No public-chain deployment has been performed. Workflow YAML files are installed in `.github/workflows/`.

## Inspection baseline

- Target: this AugurForkingLayer checkout has no tracked files or initial commit at inspection time. Its configured origin is `https://github.com/DarkFlorist/AugurForkingLayer.git`. There is no existing target architecture to integrate with yet.
- Source: [AugurProject/zoltar](https://github.com/AugurProject/zoltar), inspected at commit [`85fdf19f8962d17b6f1e0612df9a01b6c30398d4`](https://github.com/AugurProject/zoltar/tree/85fdf19f8962d17b6f1e0612df9a01b6c30398d4).
- Zoltar's UI is already split into `ui/zoltar`, `ui/zoltarShared`, and `ui/coreShared`; runtime libraries include `shared/core` and `shared/zoltar`.
- Tooling uses Bun 1.4.2. The contracts package includes Solidity 0.8.35 and an aliased 0.8.28 compiler. Retain the compiler versions actually required by the selected source closure.
- Inspection was read-only in a temporary upstream clone. Dependencies were not installed and upstream builds/tests were not run; build independence remains an implementation acceptance criterion.

## Separation rules

1. `cd zoltar` is sufficient to install, build, test, and run Zoltar. No other AugurForkingLayer package is required.
2. Keep upstream internal directory names and `@zoltar/*` package names initially. Avoid mixing extraction with cosmetic moves or protocol redesign.
3. Zoltar owns its configuration, lockfiles, generated artifacts, network profiles, and release lifecycle. Do not introduce a repository-wide Bun workspace just to host it.
4. Other project components may consume Solidity interfaces, generated ABIs, documented deployment data, and exported runtime packages. They must not import UI application internals or private tooling.
5. Keep this as copied, locally maintained source, without a submodule or runtime dependency on the upstream checkout. Record upstream provenance and review later upstream updates explicitly.

## Proposed layout

```text
AugurForkingLayer/
  README.md
  docs/plans/zoltar-extraction.md
  .github/
    workflows/
      zoltar-ci.yml
      zoltar-browser-workflow.yml
      zoltar-deploy-testnet.yml
      zoltar-release.yml             # when publishing is configured
    actions/                        # only necessary adapted setup actions
  zoltar/
    README.md
    UPSTREAM.md                     # source SHA, mapping, exclusions, local changes
    LICENSE
    package.json
    bun.lock                        # plus package locks required by retained installer
    bunfig.toml
    tsconfig*.json
    solidity/
      contracts/
      ts/                           # compiler, deployment, test support, tests
    shared/
      core/
      zoltar/
    ui/
      coreShared/
      zoltarShared/
      zoltar/
      Dockerfile                    # if retained for publishing
    tooling/
      contracts/
      repo/
      testing/
      ui/
    docs/                           # Zoltar-specific protocol and operator docs
    testnetwork/                    # only the local-chain support Zoltar needs
```

Generated directories remain ignored and reproducible. The repository root may later add convenience commands that delegate into `zoltar/`, but these must not become prerequisites.

## Extraction inventory

| Source | Destination / treatment |
| --- | --- |
| `solidity/contracts/Zoltar.sol`, `ZoltarQuestionData.sol`, `ReputationToken.sol`, `GenesisReputationToken.sol`, `DeploymentStatusOracle.sol` | Preserve under `zoltar/solidity/contracts/`, along with all required imports, constants, token interfaces, and authorization vendor sources. |
| `solidity/ts/contractProjects.ts` | Use the existing Zoltar contract selection as the starting inventory, then verify production and test import closure. |
| `solidity/contracts/infrastructure/WETH9.sol` and `Multicall3.sol` | Upstream explicitly classifies these as neutral Zoltar infrastructure. Keep where required, initially retaining paths and source contents; the directory name alone is not grounds for exclusion. |
| `solidity/ts` | Copy Zoltar compiler, deployment, artifact schemas, test runner dependencies, helpers, tests, and relevant invariant/security coverage. Split helpers that currently deploy the entire protocol. |
| `shared/core`, `shared/zoltar`, shared TypeScript configs | Retain local packages and relevant tests; inspect network/deployment configuration for application-specific fields. |
| `ui/zoltar`, `ui/zoltarShared` | Retain application routes, assets, deployment/question/fork/migration operations, protocol helpers, and tests. |
| `ui/coreShared` | Retain the wallet, RPC, transaction, simulation, shell, and component support needed by Zoltar; remove or parameterize unrelated product requirements. |
| `tooling/repo`, `tooling/contracts`, `tooling/ui`, `tooling/testing` | Copy only the required dependency closure and adapt registries, generation, discovery, and build tasks to the retained projects. |
| Root package/config/lockfiles and `bun-test-setup*.ts` | Move necessary configuration under `zoltar/`, narrow package lists and scripts, and regenerate affected locks using the pinned Bun version. |
| `.github/workflows`, `.github/actions` | Adapt selected CI, browser, deployment, and publishing behavior into repository-root Zoltar workflows. |
| Protocol documentation and local-chain tooling | Retain Zoltar material and its referenced assets/runtime support; rewrite navigation and commands to match the extracted scope. |


## Known coupling that must be resolved

- **Shared UI build scripts:** `ui/coreShared/package.json` generates vendors and workers for all three applications. Scope these tasks to Zoltar.
- **Repository orchestration:** `tooling/repo/projects.ts`, test discovery, coverage policy, TypeScript references, lint configuration, and unused-code analysis describe the entire upstream repository. Reduce them together so no removed project remains a prerequisite.
- **Artifact generation:** upstream supports `build-app-contracts.mts zoltar`, but the full compiler/generator pipeline also produces aggregate artifacts. Make clean Zoltar generation sufficient for UI types, ABIs, simulation, deployment, and tests.
- **Deployment configuration:** inspect deterministic addresses, constructor arguments, bytecode hashes, proxy deployment, and network profiles. Preserve Solidity source-unit paths and compiler settings where practical. Compare artifacts before assuming relocation preserves deployment addresses.
- **Publishing:** upstream Docker and release workflows assume a multi-application repository. Change build contexts, artifact paths, image names, tags, workflow references, and output URLs together.

## Implementation sequence

### 1. Freeze scope and establish the baseline

- Pin the source commit above, or explicitly record a newer selected commit before extraction.
- Create an import manifest listing included files, source hashes, exceptions, and excluded components. Preserve the source license and relevant vendor notices.
- Trace Solidity imports, TypeScript imports/exports, workspace references, generators, fixtures, and deployment dependencies from the Zoltar entrypoints.
- Run the relevant upstream build/tests at the pinned commit and retain results and artifact hashes for comparison. Record pre-existing failures distinctly.

**Exit:** reviewed inventory and reproducible comparison baseline; no unresolved required dependency is silently omitted.

### 2. Import contracts and runtime packages

- Copy the selected source under `zoltar/`, preserving internal paths.
- Establish a local workspace containing only the retained packages and exact external versions.
- Adapt project metadata, compiler entrypoints, artifact generation, and test setup to Zoltar-only operation.
- Preserve existing package-install semantics initially; prune and regenerate locks after changing manifests, then verify frozen installation in a clean checkout.
- Port contract tests for questions, universes, reputation tokens, forks, migration, and relevant security/invariant behavior, including their mocks and fixtures.

**Exit:** clean installation, contract compilation, runtime typechecking, and retained contract tests pass without excluded packages.

### 3. Import the UI and user workflows

- Copy Zoltar UI packages and required shared UI support, assets, styles, workers, and simulation inputs.
- Scope artifact/vendor generation, production builds, route registries, deployment plans, and simulation setup to Zoltar.
- Preserve question creation, universe browsing, deployment, fork initiation, and REP migration flows supported by upstream Zoltar.
- Keep wallet/RPC configuration and REP pricing support where used. Preserve required pricing inputs rather than treating all Uniswap-related files as Trading functionality.
- Document the local-chain and walletless simulation startup commands.

**Exit:** production build and browser smoke pass; Zoltar boots from its own directory and core transaction flows work on the local chain.

### 4. Adapt CI and operational workflows

- Put workflow YAML in root `.github/workflows/`; nested workflow files under `zoltar/.github/` would not serve as repository workflows.
- Set shell working directories to `zoltar`; separately adapt checkout-relative action references, cache paths, artifact paths, and Docker contexts. Shell defaults do not relocate `uses:` action inputs.
- Run Zoltar CI on `zoltar/**`, its workflow/action changes, and any actual root integration inputs. Scope caches, artifact names, and concurrency groups to Zoltar. Ensure required checks do not remain pending on unrelated changes.
- Include frozen install, generation, typechecking, relevant tests, production build, browser smoke, boundary checks, and generated-output freshness. Keep long browser workflows separately runnable.
- Adapt testnet deployment to deploy only the retained contract plan. Retain chain and fee validation, explicit manual dispatch, and the existing authorization input.
- Document target environments and secrets such as `TESTNET_DEPLOYER_PRIVATE_KEY` and `ETHERSCAN_API_KEY`; repository settings and secrets are not copied with source.
- Use independent release tags such as `zoltar-v*`. Configure Zoltar-only publishing before enabling release/IPFS automation, with the selected host or registry documented.

**Exit:** CI runs in AugurForkingLayer with no upstream repository dependency; deployment is validated locally without broadcasting public-chain transactions.

### 5. Finish documentation and prove separation

- Add a short root README linking to Zoltar, and a complete `zoltar/README.md` for installation, local chain, UI, tests, builds, network configuration, and deployment.
- Record provenance and intentional divergence in `zoltar/UPSTREAM.md`. Future upstream updates should be explicit reviewed patches against the recorded baseline.
- Add boundary checks for imports escaping `zoltar/` and dependencies on removed projects, allowing only documented external packages and interfaces.
- Exercise the extracted project in a temporary directory without sibling project files. Repository-hosted CI wrappers are the only intended root-specific infrastructure.
- Review the final manifest against the imported files and report any behavior intentionally deferred.

**Exit:** a new contributor can use Zoltar independently, and future AugurForkingLayer work has a clear integration boundary.

## Acceptance checks

- A clean checkout installs from frozen lockfiles and generates all required artifacts without files from the temporary upstream clone.
- Contract ABI, creation/runtime bytecode, compiler settings, and deterministic deployment calculations are compared to the selected baseline; any difference is explained before release.
- Retained runtime/UI types and contract, unit, security, and invariant tests pass. Mixed upstream tests are split rather than discarded without replacement.
- Production UI boots, including workers and assets, at the intended hosting base path.
- Local-chain/browser coverage exercises question creation, fork initiation, child-universe creation, and REP migration, including rejected/failed transactions and recovery where supported.
- Walletless simulation and wallet/RPC connection work; desktop and narrow-screen checks cover relevant loading, pending, success, and failure states.
- CI discovers only retained suites, and excluded applications are neither installed nor built.
- Deployment tooling produces a Zoltar-only plan; publishing builds contain only Zoltar assets.
- Generated outputs follow an explicit tracked/untracked policy, and regeneration does not create unexplained tracked changes.
- Zoltar builds/tests outside the parent repository, and an unrelated sibling project is not needed.

## Delivery and deferred choices

Deliver in reviewable changes: (1) source inventory and contract/runtime import, (2) UI and workflow extraction, (3) CI/deployment wiring and documentation. Keep contract behavior changes separate from the migration. No target deployment or data migration is implied by copying source; source import can be reverted independently while it has no external deployment effects.

The working defaults are a `zoltar/` subtree, copied source with provenance, independent Bun workspace, and local-chain validation. Public deployment chain, signing configuration, production host, and release destination can be selected when preparing deployment; they do not block extraction. Do not promise an effort estimate until the dependency manifest and upstream baseline checks are complete.
