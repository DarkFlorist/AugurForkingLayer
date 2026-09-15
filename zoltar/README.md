# Zoltar

Zoltar is a forkable oracle with a question registry, universes, and reputation-token migration. This directory is an independent copy of the Zoltar portion of AugurProject/zoltar. It does not install or build Statoblast, Trading, bots, or the explorer.

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

The default real-network profile and deterministic addresses are inherited from upstream. Select Sepolia with `?network=sepolia`. Override RPC with `?rpcUrl=...` or the UI settings. Copying the code does not deploy new contracts or migrate onchain state.

## Validate

```sh
bun run build:prod
bun run compile-contracts
bun run check
bun run test
bun run check:artifacts
bun run test:browser
bun run test:browser:workflow
```

- `check`: full TypeScript checking (including tests and tooling), plus import boundaries.
- `test`: contract tests, isolated UI/runtime tests, deployment and boundary tests. UI tests use file isolation to prevent mock leakage.
- `check:artifacts`: compares all 19 production ABIs and creation/runtime bytecodes against the pinned upstream baseline. Intentional future protocol changes require reviewing and updating that baseline.
- `test:browser`: serves production assets temporarily and checks desktop/mobile boot in Chromium. Set `CHROMIUM_PATH` if Chromium is not auto-detected.
- `test:browser:workflow`: exercises question creation, fork approval, forking, and migration in the production browser simulation.

Live-mainnet quote tests remain opt-in; normal validation is deterministic and does not depend on a public RPC. Contract tests cover the fork threshold/burn rules, child universe creation, nested forks, migration balances, token authorizations, and question encoding guards.

## Build and release

Workflow YAML files are staged in the repository-root `workflow/` directory and are inactive until moved to `.github/workflows/`. The setup action remains in `.github/actions/setup-zoltar/`. The workflow paths and action references already target their final locations.

`bun run build:prod` writes the static application to `ui/zoltar/dist/`, including worker and vendor assets. Serve the entire directory. Once activated, GitHub CI uploads this output as `zoltar-ui`; `zoltar-v*` tags build independently named release artifacts. Hosting, IPFS publication, and a public release destination are not configured by this extraction.

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

Internal package names and source paths are preserved to minimize divergence. `ui/coreShared` retains generic types and styling used upstream by several products, but has no dependency on those products. The two production files under `solidity/contracts/statoblast/` are WETH9 and Multicall3, which upstream classifies as neutral infrastructure.

See [protocol and operator notes](docs/protocol.md), [provenance](UPSTREAM.md), and the [validation record](docs/validation.md).
