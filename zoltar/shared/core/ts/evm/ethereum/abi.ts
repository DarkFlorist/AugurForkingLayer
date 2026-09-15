export { MULTICALL3_ABI, normalizeCodecArguments, getNamedFunctionAbi, getContractMethod, decodeFunctionOutput, encodeAbiParameters, encodeFunctionData, encodeDeployData } from './abi/codec.js'
/** @internal Used by contract fixtures and regression tests. */
export { formatAbiItem, decodeFunctionData } from './abi/codec.js'
export { decodeEventLog } from './abi/events.js'
/** @internal Used by contract fixtures and regression tests. */
export { parseAbiParameters, parseAbiItem } from './abi/parser.js'

/** @internal Test-only raw codec entry points. */
export { decodeFunctionResult } from './abi/codec.js'
export { encodeEventTopics } from './abi/events.js'
