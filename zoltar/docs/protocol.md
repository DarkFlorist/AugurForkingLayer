# Zoltar protocol and operator workflow

## Components

- `ZoltarQuestionData.sol` registers reusable questions, validates categorical/scalar outcome encodings, and exposes question pagination.
- `Zoltar.sol` manages universes, fork thresholds, child-universe creation, and migration accounting.
- `GenesisReputationToken.sol` provides genesis REP; `ReputationToken.sol` implements child REP and authorization behavior.
- `DeploymentStatusOracle.sol` reports the installed infrastructure. Multicall3 provides read batching.

## UI workflow

1. Choose a network or start browser simulation, connect a wallet when using a real network, and inspect deployment status.
2. Open **Create Question**, set a title, outcome type, and resolution time, and submit the transaction. The registry is shared across universes.
3. Select **Use for fork** for a question and inspect the universe's REP threshold and permanent burn. Approve REP if required, then fork.
4. Inspect the fork question and outcomes. Prepare/split REP into the selected child outcome universes using the migration controls.
5. Open a child universe to inspect its REP balance and fork state. Preserve the universe ID when integrating a consumer; balances from different universes are distinct.

Use the transaction tray to inspect submitted transactions and failures. The simulation supports repeating these flows without a wallet or external RPC. Forking and migration on a real chain have economic effects; the UI exposes the relevant threshold and amount before submission.

## Reference sources

Additional protocol references:

- [Zoltar explanation](https://github.com/AugurProject/zoltar/blob/85fdf19f8962d17b6f1e0612df9a01b6c30398d4/docs/explanation/zoltar.html)
- [Zoltar contract reference](https://github.com/AugurProject/zoltar/blob/85fdf19f8962d17b6f1e0612df9a01b6c30398d4/docs/reference/contracts/zoltar.html)
- [Question registry reference](https://github.com/AugurProject/zoltar/blob/85fdf19f8962d17b6f1e0612df9a01b6c30398d4/docs/reference/contracts/zoltarquestiondata.html)

The local contract source, tests, and generated ABI define the behavior of this project.
