import { isContractProjectSource, parseContractProject, type ContractProject } from './contractProjects.js'
import { createHash } from 'crypto'
import { promises as fs } from 'fs'
import * as path from 'path'
import solc from 'solc'
import * as funtypes from 'funtypes'
import * as url from 'url'

const directoryOfThisFile = path.dirname(url.fileURLToPath(import.meta.url))
const CONTRACT_PATH_APP = path.join(directoryOfThisFile, '..', 'ts', 'types', 'contractArtifact.ts')
// Importers (such as the explorer verification tooling) carry their own CLI
// arguments; only an actual compile invocation selects a contract project.
const selectedProject = import.meta.main && process.argv[2] !== undefined ? parseContractProject(process.argv[2]) : undefined
const HASH_CACHE_PATH = path.join(process.cwd(), ...(selectedProject === undefined ? [] : ['artifacts', selectedProject]), '.contract-hash.json')
const ARTIFACTS_DIR = path.join(process.cwd(), 'artifacts', ...(selectedProject === undefined ? [] : [selectedProject]))
const ARTIFACTS_JSON = path.join(ARTIFACTS_DIR, 'Contracts.json')
const allowedImmutableContractWarnings = [
	{
		sourcePath: 'contracts/infrastructure/Multicall3.sol',
		message: 'Since the VM version paris, "difficulty" was replaced by "prevrandao"',
	},
	{
		sourcePath: 'contracts/infrastructure/WETH9.sol',
		message: "'transfer' is deprecated and scheduled for removal",
	},
]

const CompileError = funtypes.ReadonlyObject({
	severity: funtypes.String,
	formattedMessage: funtypes.String,
})

const AbiParameter: funtypes.Runtype<{
	readonly name?: string
	readonly type?: string
	readonly internalType?: string
	readonly indexed?: boolean
	readonly components?: readonly unknown[]
}> = funtypes.Lazy(() =>
	funtypes.ReadonlyPartial({
		name: funtypes.String,
		type: funtypes.String,
		internalType: funtypes.String,
		indexed: funtypes.Boolean,
		components: funtypes.ReadonlyArray(AbiParameter),
	}),
)

const AbiEntry = funtypes.ReadonlyPartial({
	type: funtypes.String,
	name: funtypes.String,
	stateMutability: funtypes.String,
	anonymous: funtypes.Boolean,
	inputs: funtypes.ReadonlyArray(AbiParameter),
	outputs: funtypes.ReadonlyArray(AbiParameter),
})

const ContractData = funtypes.ReadonlyPartial({
	abi: funtypes.ReadonlyArray(AbiEntry),
	evm: funtypes.ReadonlyPartial({
		bytecode: funtypes.ReadonlyPartial({
			object: funtypes.String,
			opcodes: funtypes.String,
			sourceMap: funtypes.String,
			immutableReferences: funtypes.Unknown,
			linkReferences: funtypes.Unknown,
		}),
		deployedBytecode: funtypes.ReadonlyPartial({
			object: funtypes.String,
			opcodes: funtypes.String,
			sourceMap: funtypes.String,
			immutableReferences: funtypes.Unknown,
			linkReferences: funtypes.Unknown,
		}),
	}),
	storageLayout: funtypes.Unknown,
})

const CompileResult = funtypes.ReadonlyObject({
	contracts: funtypes.Union(funtypes.Record(funtypes.String, funtypes.Record(funtypes.String, ContractData)), funtypes.Undefined),
	sources: funtypes.Union(funtypes.Unknown, funtypes.Undefined),
	errors: funtypes.Union(funtypes.ReadonlyArray(CompileError), funtypes.Undefined),
	compilerProfiles: funtypes.Union(funtypes.Unknown, funtypes.Undefined),
})

const HashCache = funtypes.ReadonlyPartial({
	hash: funtypes.String,
})

export const mainCompilerSettings = {
	viaIR: true,
	evmVersion: 'osaka',
	optimizer: {
		enabled: true,
		// The protocol favors deployability of the immutable coordination contracts.
		// Their lifecycle paths are infrequent compared with deployment, so the
		// size-oriented profile is the safer tradeoff as bounded claim accounting grows.
		runs: 0,
	},
	metadata: {
		// Deployment manifests already bind the compiler settings and complete
		// bytecode, so an appended metadata trailer adds size without adding trust.
		appendCBOR: false,
		bytecodeHash: 'none',
	},
	outputSelection: {
		'*': {
			'*': [
				'abi',
				'evm.bytecode.object',
				'evm.bytecode.opcodes',
				'evm.bytecode.sourceMap',
				'evm.bytecode.immutableReferences',
				'evm.bytecode.linkReferences',
				'evm.deployedBytecode.object',
				'evm.deployedBytecode.opcodes',
				'evm.deployedBytecode.sourceMap',
				'evm.deployedBytecode.immutableReferences',
				'evm.deployedBytecode.linkReferences',
				'storageLayout',
			],
		},
	},
}

type SolcCompiler = {
	compile(input: string): string
	version(): string
}

class CompilationError extends Error {
	errors: string[]

	constructor(errors: string[]) {
		super('compilation error')
		this.name = 'CompilationError'
		this.errors = errors
	}

	override toString() {
		const unescape = (str: string) => str.replace(/\\n/g, '\n').replace(/\\t/g, '\t')
		return `${this.name}: ${this.message}\n errors:\n${this.errors.map((error, index) => `  [${index}] ${unescape(error)}`).join('\n')}`
	}
}

async function exists(filePath: string) {
	try {
		await fs.stat(filePath)
		return true
	} catch (error) {
		if (hasNodeErrorCode(error, 'ENOENT')) return false
		throw error
	}
}

function hasNodeErrorCode(error: unknown, code: string): boolean {
	return isObjectRecord(error) && error['code'] === code
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

function normalizeSoliditySourceLineEndings(source: string): string {
	return source.replace(/\r\n?/g, '\n')
}

function isCompileError(value: unknown): value is { severity: string; formattedMessage: string } {
	return isObjectRecord(value) && typeof value['severity'] === 'string' && typeof value['formattedMessage'] === 'string'
}

function isAllowedImmutableContractWarning(formattedMessage: string): boolean {
	return allowedImmutableContractWarnings.some(({ sourcePath, message }) => formattedMessage.includes(message) && formattedMessage.includes(sourcePath))
}

function isFuntypesValidationError(error: unknown): error is Error {
	return error instanceof Error && error.name === 'ValidationError'
}

function getCompilerVersion(compiler: SolcCompiler): string {
	return compiler.version()
}

export function getMainCompilerVersion(): string {
	return getCompilerVersion(solc)
}

async function computeContractHash(sourceFiles: Map<string, string>): Promise<string> {
	const hasher = createHash('sha256')
	hasher.update(getMainCompilerVersion())
	hasher.update(JSON.stringify(mainCompilerSettings))
	for (const [sourcePath, source] of [...sourceFiles].sort(([a], [b]) => a.localeCompare(b))) {
		hasher.update(sourcePath)
		hasher.update(source)
	}
	return hasher.digest('hex')
}

async function loadHashCache(): Promise<{ hash: string | undefined }> {
	try {
		if (await exists(HASH_CACHE_PATH)) {
			const data = await fs.readFile(HASH_CACHE_PATH, 'utf8')
			const parsed = HashCache.parse(JSON.parse(data))
			return { hash: parsed.hash }
		}
	} catch (error) {
		if (error instanceof SyntaxError || hasNodeErrorCode(error, 'ENOENT') || isFuntypesValidationError(error)) return { hash: undefined }
		throw error
	}

	return { hash: undefined }
}

async function saveHashCache(contractHash: string): Promise<void> {
	await fs.mkdir(path.dirname(HASH_CACHE_PATH), { recursive: true })
	await fs.writeFile(HASH_CACHE_PATH, JSON.stringify({ hash: contractHash, updated: Date.now() }))
}

const getAllFiles = async (dirPath: string, baseDir?: string, fileList: string[] = [], visited?: Set<string>): Promise<string[]> => {
	if (!baseDir) baseDir = await fs.realpath(dirPath)
	const visitedSet = visited ?? new Set<string>()
	const canonicalDir = await fs.realpath(dirPath)
	if (visitedSet.has(canonicalDir)) return fileList
	visitedSet.add(canonicalDir)

	const files = await fs.readdir(dirPath, { withFileTypes: true })
	for (const file of files) {
		const filePath = path.join(dirPath, file.name)

		let targetPath = filePath
		if (file.isSymbolicLink()) {
			targetPath = await fs.realpath(filePath)
		}

		const relative = path.relative(baseDir, targetPath)
		if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`Path traversal detected: ${filePath} resolves outside allowed directory`)

		if (file.isDirectory() || (file.isSymbolicLink() && (await fs.stat(targetPath)).isDirectory())) {
			await getAllFiles(targetPath, baseDir, fileList, visitedSet)
			continue
		}

		fileList.push(filePath)
	}

	return fileList
}

export async function loadContractSources(project: ContractProject | undefined = undefined): Promise<Map<string, string>> {
	const solidityRoot = path.join(directoryOfThisFile, '..')
	const files = (await getAllFiles(path.join(solidityRoot, 'contracts'))).filter(file => path.extname(file) === '.sol')
	const sources = new Map<string, string>()
	for (const file of files) {
		const relativePath = path.relative(solidityRoot, file).replace(/\\/g, '/')
		if (project === undefined || isContractProjectSource(relativePath, project)) sources.set(relativePath, normalizeSoliditySourceLineEndings(await fs.readFile(file, 'utf8')))
	}
	return sources
}

const copySolidityContractArtifact = async (contractLocation: string) => {
	const solidityContract = CompileResult.parse(JSON.parse(await fs.readFile(contractLocation, 'utf8')))
	if (!solidityContract.contracts) throw new Error('No contracts compiled')
	const contracts = Object.entries(solidityContract.contracts).flatMap(([filename, contract]) => {
		if (!isObjectRecord(contract)) throw new Error('missing contract')
		return Object.entries(contract).map(([contractName, contractData]) => ({
			contractName: `${filename
				.replace('contracts/', '')
				.replace(/-/g, '')
				.replace(/\//g, '_')
				.replace(/\\/g, '_')
				.replace(/\.sol$/, '')}_${contractName}`,
			contractData: {
				abi: isObjectRecord(contractData) ? contractData['abi'] : undefined,
				evm: isObjectRecord(contractData) ? contractData['evm'] : undefined,
			},
		}))
	})
	if (new Set(contracts.map(contract => contract.contractName)).size !== contracts.length) throw new Error('duplicated contract name!')
	const typescriptString = contracts.map(contract => `export const ${contract.contractName} = ${JSON.stringify(contract.contractData, null, 4)} as const`).join('\r\n\r\n')
	await fs.writeFile(CONTRACT_PATH_APP, typescriptString)
}

function buildSourceObject(sources: Map<string, string>) {
	const sourceObject: { [key: string]: { content: string } } = {}
	for (const [sourcePath, content] of sources) {
		sourceObject[sourcePath] = { content }
	}
	return sourceObject
}

function compileSourceMap(label: string, compiler: SolcCompiler, sources: Map<string, string>, settings: Record<string, unknown>) {
	const input = {
		language: 'Solidity',
		sources: buildSourceObject(sources),
		settings,
	}

	console.time(`${label} compilation`)
	const output = compiler.compile(JSON.stringify(input))
	console.timeEnd(`${label} compilation`)

	const result = CompileResult.parse(JSON.parse(output))
	const diagnostics = Array.isArray(result.errors) ? result.errors : []
	const errors: string[] = []

	for (const diagnostic of diagnostics) {
		if (!isCompileError(diagnostic)) continue
		if (diagnostic.severity === 'error') errors.push(diagnostic.formattedMessage)
		if (diagnostic.severity === 'warning' && !isAllowedImmutableContractWarning(diagnostic.formattedMessage)) errors.push(diagnostic.formattedMessage)
	}

	if (errors.length > 0) throw new CompilationError(errors.map(error => `${label}: ${error}`))

	return result
}

const compileContracts = async () => {
	console.log('Computing contract hash...')

	const sources = await loadContractSources(selectedProject)

	const currentContractHash = await computeContractHash(sources)
	const cache = await loadHashCache()
	let needsRecompilation = !(cache.hash === currentContractHash && (await exists(ARTIFACTS_JSON)))

	if (!needsRecompilation) {
		console.log('No changes detected in Solidity contracts. Skipping recompilation.')
		try {
			const artifactContent = await fs.readFile(ARTIFACTS_JSON, 'utf8')
			CompileResult.parse(JSON.parse(artifactContent))
		} catch (error) {
			if (!(error instanceof SyntaxError) && !hasNodeErrorCode(error, 'ENOENT') && !isFuntypesValidationError(error)) throw error
			console.log('Artifact file is missing, inaccessible, or corrupted, recompiling...')
			needsRecompilation = true
		}
	}

	if (needsRecompilation) {
		console.log('Changes detected or first run. Compiling Solidity contracts...')
		const mainResult = compileSourceMap('main contracts', solc, sources, mainCompilerSettings)

		if (!(await exists(ARTIFACTS_DIR))) await fs.mkdir(ARTIFACTS_DIR, { recursive: true })
		await fs.writeFile(ARTIFACTS_JSON, JSON.stringify(mainResult))
		await saveHashCache(currentContractHash)
		console.log('Compilation complete. Hash cache updated.')
	}

	if (selectedProject === undefined) await copySolidityContractArtifact(ARTIFACTS_JSON)
	console.log('TypeScript artifact generated.')
}

if (import.meta.main) {
	compileContracts().catch((error: unknown) => {
		if (error instanceof CompilationError) {
			console.error(error.toString())
		} else {
			console.error(error)
		}
		process.exit(1)
	})
}
