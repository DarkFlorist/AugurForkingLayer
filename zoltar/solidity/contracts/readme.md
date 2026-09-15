# Contract ownership

The root contracts and `vendor/authorization` implement Zoltar, questions, and reputation tokens.

Multicall3 is read-batching infrastructure in `solidity/contracts/infrastructure/` (relative to the Zoltar workspace).

`test/` contains test-only mocks. Production contracts must not import test sources. The compiler's `zoltar` target excludes these mocks; the aggregate test build includes them.

`IZoltar.sol` declares the complete public Zoltar interface, including events and the `Universe` struct. `Zoltar` implements it with explicit overrides. A tooling test compares their compiled ABIs so new public functions cannot silently be omitted from the interface.
