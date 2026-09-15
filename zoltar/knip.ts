import type { KnipConfig } from 'knip'

// Test helpers are audited normally; production mode excludes test-only code.
const isProduction = process.argv.includes('--production')

export default {
	workspaces: {
		'.': {
			entry: [
				'tooling/**/*.test.ts',
				'bun-test-setup*.ts',
				'tooling/contracts/{build-app-contracts,deploy-testnet,deployment-plan,run-deploy-testnet}.mts!',
				'tooling/ui/projectArtifacts.mts!',
				'tooling/contracts/check-artifacts.mts!',
				'tooling/repo/build-shared.mts!',
				'tooling/repo/check-boundaries.mts!',
				'tooling/ui/apps.mts!',
				'tooling/ui/browserSmoke.mts!',
				'tooling/ui/dev-server.ts!',
				'tooling/ui/production.mts!',
				'tooling/ui/run-browser.mts!',
				'tooling/ui/watch.mts!',
				'tooling/ui/{vendor,workers}.mts!',
			],
			project: ['tooling/**/*.{ts,mts}!', 'bun-test-setup*.ts'],
			// Vendor copying and bundler aliases resolve these packages dynamically.
			ignoreDependencies: ['@preact/signals', '@tevm/memory-client', '@tevm/common', '@zoltar/core-shared', '@preact/signals-core', '@noble/hashes', '@noble/curves', '@scure/base', 'micro-eth-signer', 'micro-packed', 'pino'],
			paths: {
				'@zoltar/core-shared/*': ['shared/core/ts/*'],
				'@zoltar/zoltar-shared/*': ['shared/zoltar/ts/*'],
			},
		},
		'ui/coreShared': {
			ignore: isProduction ? ['ts/tests/**'] : [],
			entry: ['ts/tests/**/*.{ts,tsx}'],
			includeEntryExports: true,
			project: ['ts/**/*.{ts,tsx}!', '!ts/tests/**!'],
			paths: {
				'@zoltar/ui-core-shared/*': ['./ts/*'],
				'@zoltar/core-shared/*': ['../../shared/core/ts/*'],
				'@zoltar/zoltar-shared/*': ['../../shared/zoltar/ts/*'],
			},
		},
		'ui/zoltarShared': {
			entry: [],
			includeEntryExports: true,
			project: ['ts/**/*.{ts,tsx}!'],
			paths: {
				'@zoltar/ui-core-shared/*': ['../coreShared/ts/*'],
				'@zoltar/ui-zoltar-shared/*': ['./ts/*'],
				'@zoltar/core-shared/*': ['../../shared/core/ts/*'],
				'@zoltar/zoltar-shared/*': ['../../shared/zoltar/ts/*'],
			},
		},
		'ui/zoltar': {
			entry: ['ts/tests/**/*.{ts,tsx}', 'ts/index.ts!', 'ts/index.dev.ts!', 'ts/simulation/tevmWorker.ts!'],
			project: ['ts/**/*.{ts,tsx}!'],
			paths: {
				'@zoltar/ui-core-shared/*': ['../coreShared/ts/*'],
				'@zoltar/ui-zoltar-shared/*': ['../zoltarShared/ts/*'],
				'@zoltar/ui-zoltar/*': ['./ts/*'],
				'@zoltar/core-shared/*': ['../../shared/core/ts/*'],
				'@zoltar/zoltar-shared/*': ['../../shared/zoltar/ts/*'],
			},
		},
		solidity: {
			entry: ['ts/compile.ts!', 'ts/abi/abis.ts!', 'ts/tests/**/*.ts', 'ts/types/*.d.ts'],
			project: ['ts/**/*.{ts,mts}!', '!ts/testSupport/**!', '!ts/tests/**!'],
			paths: {
				'@zoltar/core-shared/*': ['../shared/core/ts/*'],
				'@zoltar/zoltar-shared/*': ['../shared/zoltar/ts/*'],
			},
			ignoreDependencies: [],
		},
		'shared/core': {
			entry: ['ts/**/*.test.ts'],
			includeEntryExports: true,
			project: ['ts/**/*.ts!'],
			paths: {
				'@zoltar/core-shared/*': ['ts/*'],
				'@zoltar/zoltar-shared/*': ['../zoltar/ts/*'],
			},
			ignoreDependencies: [],
		},
		'shared/zoltar': {
			ignore: isProduction ? ['ts/testing/**'] : [],
			entry: ['ts/**/*.test.ts'],
			includeEntryExports: true,
			project: ['ts/**/*.ts!', '!ts/testing/**!'],
			paths: {
				'@zoltar/core-shared/*': ['../core/ts/*'],
				'@zoltar/zoltar-shared/*': ['ts/*'],
			},
			ignoreDependencies: [],
		},
	},
	// TypeScript discovers its replacement standard libraries without source imports.
	ignoreDependencies: ['better-typescript-lib'],
	// Knip resolves the inherited root test preload relative to each child workspace.
	ignoreUnresolved: ['./bun-test-setup-ui.ts'],
	// Knip treats the script path after `cd solidity && bun` as an external binary.
	ignoreBinaries: ['ts/compile.ts'],
} satisfies KnipConfig
