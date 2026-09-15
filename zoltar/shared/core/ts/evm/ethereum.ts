export {
	type Hex,
	type Address,
	type Hash,
	type AbiParameter,
	type Abi,
	type ContractFunctionParameters,
	type Chain,
	type EIP1193Provider,
	type TransactionReceipt,
	type ReplacementReason,
	type BlockTransaction,
	type Account,
	type Transport,
	type MulticallReturnType,
	type WalletClient,
	type PublicActions,
} from './ethereum/types.js'
export { RpcError } from './ethereum/errors.js'
export { zeroAddress, maxUint256, mainnet, defineChain } from './ethereum/chains.js'
/** @internal Used by contract fixtures and regression tests. */
export { zeroHash } from './ethereum/chains.js'
export { bigintToSafeNumber, getAddress, isAddress, isHex, bytesToHex, hexToBytes, toHex, keccak256, parseUnits, formatUnits, formatEther } from './ethereum/encoding.js'
/** @internal Used by contract fixtures and regression tests. */
export { concatHex } from './ethereum/encoding.js'
export { encodeAbiParameters, encodeFunctionData, encodeDeployData } from './ethereum/abi.js'
/** @internal Used by contract fixtures and regression tests. */
export { formatAbiItem, decodeFunctionData, decodeEventLog, parseAbiParameters, parseAbiItem } from './ethereum/abi.js'
export { http, custom } from './ethereum/transport.js'
/** @internal Used by contract fixtures and regression tests. */
export { requestRpc } from './ethereum/transport.js'
export { publicActions, createPublicClient, createWalletClient } from './ethereum/clients.js'
export { parseTransaction, recoverTransactionAddress, privateKeyToAccount, getCreateAddress, getCreate2Address } from './ethereum/accounts.js'

/** @internal Used by tests that construct or decode raw RPC evidence. */
export { decodeFunctionResult, encodeEventTopics } from './ethereum/abi.js'
