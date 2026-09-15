import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
const root = resolve(import.meta.dir, '../..')
const baseline = await Bun.file(resolve(import.meta.dir, 'upstream-artifacts.json')).json()
const output = await Bun.file(resolve(root, 'solidity/artifacts/zoltar/Contracts.json')).json()
const hashes: Record<string, { abi: string; creation: string; runtime: string }> = {}
const hash = (text: string) => createHash('sha256').update(text).digest('hex')
for (const [file, contracts] of Object.entries(output.contracts)) {
	if (typeof contracts !== 'object' || contracts === null) throw new Error(`Invalid artifact ${file}`)
	for (const [name, contract] of Object.entries(contracts)) hashes[`${file}:${name}`] = { abi: hash(JSON.stringify(contract.abi)), creation: hash(contract.evm.bytecode.object), runtime: hash(contract.evm.deployedBytecode.object) }
}
if (JSON.stringify(hashes) !== JSON.stringify(baseline)) throw new Error('Production artifacts differ from the recorded contract baseline. Review ABI, bytecode and deployment-address changes before updating the baseline.')
console.log(`${Object.keys(hashes).length} production contract ABIs and bytecodes match the recorded baseline`)
