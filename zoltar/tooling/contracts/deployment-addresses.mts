import { resolve } from 'node:path'
import { DEFAULT_PROTOCOL_CONFIG } from '@zoltar/core-shared/deployment/protocolConfig'
import { MAINNET_NETWORK_PROFILE, SEPOLIA_NETWORK_PROFILE, type NetworkProfile } from '../../ui/coreShared/ts/wallet/networkProfile.ts'
import { getDeploymentSteps } from '../../ui/zoltarShared/ts/protocol/deployment.ts'

export function createDeploymentAddressManifest(profile: NetworkProfile) {
	return {
		network: {
			chainId: profile.chain.id,
			chainIdHex: profile.chainIdHex,
			genesisRepTokenAddress: profile.genesisRepTokenAddress,
			id: profile.id,
			name: profile.displayName,
		},
		// These addresses describe the current build, not verified on-chain deployments.
		deploymentStatus: 'not-checked',
		protocolConfig: {
			forkBurnDivisor: DEFAULT_PROTOCOL_CONFIG.forkBurnDivisor.toString(),
			forkThresholdDivisor: DEFAULT_PROTOCOL_CONFIG.forkThresholdDivisor.toString(),
		},
		deploymentSteps: getDeploymentSteps(profile).map(({ id, label, address, dependencies }) => ({ id, label, address, dependencies })),
	}
}

if (import.meta.main) {
	const mode = process.argv[2]
	if (mode !== '--write' && mode !== '--check') throw new Error('Use --write or --check')
	for (const profile of [MAINNET_NETWORK_PROFILE, SEPOLIA_NETWORK_PROFILE]) {
		const path = resolve(import.meta.dir, '../../docs', `${profile.id}-deployment-addresses.json`)
		const manifest = createDeploymentAddressManifest(profile)
		const expected = JSON.stringify(manifest, null, '\t') + '\n'
		if (mode === '--write') {
			await Bun.write(path, expected)
			console.log(`Updated ${profile.id} deployment addresses`)
		} else {
			const file = Bun.file(path)
			if (!(await file.exists()) || JSON.stringify(await file.json()) !== JSON.stringify(manifest)) throw new Error(`${profile.id} deployment addresses are stale. Run bun run addresses:update and review the changes.`)
			console.log(`${profile.id} deployment addresses are current`)
		}
	}
}
