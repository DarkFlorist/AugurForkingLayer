# Upstream provenance

- Source: https://github.com/AugurProject/zoltar
- Commit: `85fdf19f8962d17b6f1e0612df9a01b6c30398d4`
- License: [Unlicense](LICENSE), with vendor notices preserved beside the copied contracts.
- Import method: copied source, maintained locally; no submodule, subtree history, or upstream checkout is needed to build.
- Inventory: [import-manifest.json](import-manifest.json) records original paths and SHA-256 hashes, and distinguishes adapted files from unchanged copies. Local additions have no upstream source hash.

## Included

Zoltar's 19 production contract artifacts and source dependencies; core/Zoltar runtime packages; Zoltar UI and reusable UI packages; required build/compiler/browser tooling; Zoltar tests and test support; and locally adapted CI and deployment commands.

All production Solidity sources retain their original paths and contents. ABI, creation bytecode, and runtime bytecode match the upstream Zoltar compiler target exactly. WETH9 and Multicall3 remain under `solidity/contracts/statoblast/` because upstream classifies them as neutral infrastructure.

## Intentional adaptations

- A single Bun workspace rooted here contains six packages. Build metadata and CLI application selection include only Zoltar.
- Shared UI generation no longer builds the other products. Runtime-neutral shared types, CSS, and dormant generic tooling branches are retained where useful to avoid unnecessary source churn; they introduce no excluded-package dependency.
- Contract test helpers use Zoltar's question-data address directly, without deploying Statoblast infrastructure. The false-returning token mock is preserved. The WETH rejecting-receiver fixture is reduced to the relevant ETH behavior from the upstream mixed OpenOracle harness.
- Full test typechecking exposed stale upstream fixture types. Fixtures were updated to current interfaces without changing production behavior. UI tests run with `--isolate` to prevent module mocks leaking across files.
- Shared CSS tests retain Zoltar assertions and omit assertions for excluded Trading/explorer stylesheets.
- Testnet deployment retains upstream input, fee, chain, receipt, and runtime-verification checks while removing Statoblast, Uniswap deployment, and bootstrap-descendant steps. A local-chain test verifies fresh deployment and idempotent reruns.
- GitHub workflow YAML files are staged in repository-root `workflow/` for the maintainer to move to `.github/workflows/`. They remain inactive until moved and call into this directory. CI validates the extraction; tagged builds upload the static Zoltar UI. Testnet deployment is manually dispatched. Public hosting, IPFS publishing, and explorer source publication are not configured.
- Local protocol/operator documentation replaces the upstream multi-product documentation website; pinned links retain access to the detailed upstream references.

## Excluded

Statoblast/Trading domain contracts and packages, OpenOracle application functionality, bots, explorer/indexer, Reth infrastructure, multi-product documentation-site tooling, review/agent automation, upstream release destinations, and generated bundles. Existing external network profiles and pricing endpoints are configuration, not newly deployed infrastructure.

## Updating this copy

Choose a new source commit explicitly. Compare its changes to the recorded source hashes and local adaptations, import reviewed patches, and repeat validation. Refresh the manifest and artifact baseline only after reviewing the corresponding source and deployment-address changes. Do not overwrite local adaptations by recopying the upstream repository wholesale.
