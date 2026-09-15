# Contract ownership

The root contracts and `vendor/authorization` implement Zoltar, questions, and reputation tokens. Production Solidity files are copied unchanged from the pinned upstream revision.

`statoblast/WETH9.sol` and `statoblast/Multicall3.sol` are neutral infrastructure retained at their upstream paths to preserve source-unit identity. No Statoblast application contracts are included.

`test/` contains test-only mocks. Production contracts must not import test sources. The compiler's `zoltar` target excludes these mocks; the aggregate test build includes them.
