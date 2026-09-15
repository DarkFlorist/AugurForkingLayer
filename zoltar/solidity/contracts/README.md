# Contract ownership

The root contracts and `vendor/authorization` implement Zoltar, questions, and reputation tokens. Production Solidity files are copied unchanged from the pinned upstream revision.

WETH9 and Multicall3 are neutral infrastructure in `solidity/contracts/infrastructure/` (relative to the Zoltar workspace). Production Solidity contents are preserved; infrastructure source paths are normalized.

`test/` contains test-only mocks. Production contracts must not import test sources. The compiler's `zoltar` target excludes these mocks; the aggregate test build includes them.
