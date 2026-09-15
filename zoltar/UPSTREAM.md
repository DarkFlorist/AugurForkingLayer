# Upstream provenance

- Source: https://github.com/AugurProject/zoltar
- Commit: `85fdf19f8962d17b6f1e0612df9a01b6c30398d4`
- License: [Unlicense](LICENSE), with vendor notices preserved beside the copied contracts.
- Import method: copied source, maintained locally; no submodule, subtree history, or upstream checkout is needed to build.
- Inventory: [import-manifest.json](import-manifest.json) records source SHA-256 hashes and original paths where retained, and distinguishes adapted files from unchanged copies. Local additions have no upstream source hash.

## Included

Zoltar's 19 production contract artifacts and source dependencies; core/Zoltar runtime packages; Zoltar UI and reusable UI packages; required build/compiler/browser tooling; Zoltar tests and test support; and locally adapted CI and deployment commands.

WETH9 and Multicall3 are neutral infrastructure in `solidity/contracts/infrastructure/` (relative to the Zoltar workspace). Production Solidity contents are preserved; infrastructure source paths are normalized.

## Intentional adaptations

- A single Bun workspace rooted here contains six packages. Build metadata and CLI application selection include only Zoltar.
- Shared UI generation no longer builds the other products. Runtime-neutral shared types, CSS, and dormant generic tooling branches are retained where useful to avoid unnecessary source churn; they introduce no excluded-package dependency.
- Full test typechecking exposed stale upstream fixture types. Fixtures were updated to current interfaces without changing production behavior. UI tests run with `--isolate` to prevent module mocks leaking across files.
- Shared CSS tests retain Zoltar assertions and omit assertions for excluded Trading/explorer stylesheets.
- GitHub workflow YAML files are in `.github/workflows/` and call into this directory. CI validates the extraction; tagged builds upload the static Zoltar UI. Testnet deployment is manually dispatched. Public hosting, IPFS publishing, and explorer source publication are not configured.
- Local protocol/operator documentation replaces the upstream multi-product documentation website; pinned links retain access to the detailed upstream references.

## Updating this copy

Choose a new source commit explicitly. Compare its changes to the recorded source hashes and local adaptations, import reviewed patches, and repeat validation. Refresh the manifest and artifact baseline only after reviewing the corresponding source and deployment-address changes. Do not overwrite local adaptations by recopying the upstream repository wholesale.

Renamed infrastructure and test fixtures retain their original source hashes in the inventory; those hashes identify their source at the pinned revision. The ETH rejection fixture contains only the behavior required by WETH tests. Unused routing, types, styles, and secondary compiler support have been removed.
