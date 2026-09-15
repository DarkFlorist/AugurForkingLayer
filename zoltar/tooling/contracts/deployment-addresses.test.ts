import { expect, test } from 'bun:test'
import { MAINNET_NETWORK_PROFILE, SEPOLIA_NETWORK_PROFILE } from '../../ui/coreShared/ts/wallet/networkProfile.ts'
import { createDeploymentAddressManifest } from './deployment-addresses.mts'

test('address manifests cover both networks with their own genesis REP and deployment dependencies', () => {
	const mainnet = createDeploymentAddressManifest(MAINNET_NETWORK_PROFILE)
	const sepolia = createDeploymentAddressManifest(SEPOLIA_NETWORK_PROFILE)
	expect(mainnet.network.chainId).toBe(1)
	expect(sepolia.network.chainId).toBe(11155111)
	expect(mainnet.network.genesisRepTokenAddress).not.toBe(sepolia.network.genesisRepTokenAddress)
	expect(mainnet.deploymentSteps.some(step => step.id === 'reputationToken')).toBe(false)
	expect(sepolia.deploymentSteps.find(step => step.id === 'reputationToken')?.address).toBe(sepolia.network.genesisRepTokenAddress)
	for (const manifest of [mainnet, sepolia]) {
		const ids = new Set(manifest.deploymentSteps.map(step => step.id))
		expect(ids.has('zoltar')).toBe(true)
		expect(ids.has('zoltarQuestionData')).toBe(true)
		expect(ids.has('multicall3')).toBe(true)
		for (const step of manifest.deploymentSteps) {
			expect(step.address).toMatch(/^0x[0-9a-fA-F]{40}$/)
			for (const dependency of step.dependencies) expect(ids.has(dependency)).toBe(true)
		}
	}
	expect(mainnet.deploymentSteps.find(step => step.id === 'zoltar')?.address).not.toBe(sepolia.deploymentSteps.find(step => step.id === 'zoltar')?.address)
})
