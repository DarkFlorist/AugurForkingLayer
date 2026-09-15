# Zoltar

Zoltar is a forkable oracle with a question registry, universes, and reputation-token migration.

## Setup

Use Bun **1.4.2** (pinned in `packageManager`) and Node.js 20+.

```sh
cd zoltar
bun run setup
```

The local workspace has one frozen `bun.lock`. Setup installs dependencies and builds the UI, runtime packages, contract artifacts, and simulation worker. No parent workspace or sibling checkout is required. Anvil is installed as a pinned dependency for local tests.

## Run the UI

```sh
bun run app:serve:zoltar
```

Open `http://localhost:4153/?simulate=1` for a walletless browser simulation, or `http://localhost:4153/?simulate=1&simScenario=deployed` for predeployed contracts. Use `bun run app:watch:zoltar` for rebuilds.

For an external local chain, run `bun run anvil` in another terminal. The local chain uses Sepolia chain ID `11155111`; select `?network=sepolia&rpcUrl=http://127.0.0.1:8545` and configure your wallet for that local RPC. The integration tests start isolated Anvil processes automatically and require no persistent chain.

Select Sepolia with `?network=sepolia`. Override RPC with `?rpcUrl=...` or the UI settings. Running the UI does not deploy contracts or migrate onchain state.

## Validate

```sh
bun run build:prod
bun run compile-contracts
bun run check
bun run test
bun run check:artifacts
bun run knip
bun run test:browser
```

- `check`: TypeScript, import boundaries, formatting, lint, and both Knip modes. CI runs this command.
- `test`: contract tests, isolated UI/runtime tests, deployment and boundary tests. UI tests use file isolation to prevent mock leakage.
- `check:artifacts`: compares all 19 production ABIs and creation/runtime bytecodes against the recorded contract baseline. Intentional future protocol changes require reviewing and updating that baseline.
- `test:browser`: runs desktop/mobile smoke checks and the full browser workflow against production assets. CI runs this command on pull requests. Set `CHROMIUM_PATH` if Chromium is not auto-detected.
- `test:browser:smoke` and `test:browser:workflow`: run the smoke checks or the question creation, fork approval, forking, and migration workflow separately.

Normal validation is deterministic and does not depend on a public RPC. Contract tests cover the fork threshold/burn rules, child universe creation, nested forks, migration balances, token authorizations, and question encoding guards.

## Build and release

Workflow YAML files are in `.github/workflows/`; their setup action is in `.github/actions/setup-zoltar/`.

`bun run build:prod` writes the static application to `ui/zoltar/dist/`, including worker and vendor assets. Serve the entire directory. Once activated, GitHub CI uploads this output as `zoltar-ui`; `zoltar-v*` tags build independently named release artifacts. Hosting, IPFS publication, and a public release destination are not configured.

Generated JS, ABI/contract TypeScript modules, Solidity JSON artifacts, and production bundles are ignored. Always regenerate them from source. The tracked artifact baseline is a verification fixture, not a deployable build output.

## Testnet deployment

```sh
bun run deploy:testnet -- --help
```

The deployment command requires `RPC_URL` and `PRIVATE_KEY`; `CHAIN_ID` defaults to Sepolia (`11155111`). `MAX_FEE_PER_GAS_GWEI` and `MAX_TOTAL_COST_ETH` bound spending. Load the signing key through your local secret-management mechanism.

Once activated, the **Zoltar Testnet Deployment** workflow runs manually from `main`, requires the `DEPLOY` input, and uses the `zoltar-testnet` environment with `TESTNET_DEPLOYER_PRIVATE_KEY`. Configure that environment before use. The workflow deploys only the deterministic proxy, deployment-status oracle, WETH, genesis REP, Multicall3, question registry, and Zoltar. It validates chain capabilities, fees, dependencies, receipts, and runtime code, and is safe to rerun against already-verified contracts.

Runtime verification is included. Explorer source publication is not configured; no Etherscan secret is required. REP pricing uses configured external quote infrastructure; this deployment does not deploy Uniswap or seed liquidity.

## Integration boundary

Other AugurForkingLayer components may consume `shared/core` and `shared/zoltar` package exports, contract interfaces/ABIs, and documented addresses. Keep application bootstrap, routes, private UI modules, and build tooling private to Zoltar. Zoltar must never import code from a sibling component.

WETH9 and Multicall3 are neutral infrastructure in `solidity/contracts/infrastructure/` (relative to the Zoltar workspace). Production Solidity contents are preserved; infrastructure source paths are normalized.

See [protocol and operator notes](docs/protocol.md) and the [contract baseline](import-manifest.json).

## Unused-code checks

`knip.json` defines the workspace configuration for unused-code checks. It declares UI, worker, contract, test, and spawned build entrypoints and maps package imports to source files. The normal check includes tests; production checking excludes test roots. Selected internal exports remain available for contract fixtures and regression tests.

Dependency exceptions cover packages loaded by the vendor/bundler scripts, shared workspace runtime dependencies, and the automatically selected `better-typescript-lib` definitions. Bun preload and compiler-command exceptions account for commands resolved from the workspace root. Review these exceptions when changing build tooling.

To refresh the root README screenshots after a production build, run `bun tooling/ui/run-browser.mts --screenshots`. This captures question creation, forking after REP approval, and completed REP migration from the local browser simulation into `../docs/images/`.
