import { expect, test } from 'bun:test'
import { createAnvilNodeForConnectionMode } from '../../solidity/ts/testSupport/simulator/anvilNode'
import { deployTestnet } from './deploy-testnet.mts'
import { createCompleteDeploymentPlan } from './deployment-plan.mts'
import { SEPOLIA_NETWORK_PROFILE } from '../../ui/coreShared/ts/wallet/networkProfile'

test('deploys only Zoltar on a fresh local chain and skips verified contracts on rerun', async () => {
	const node = await createAnvilNodeForConnectionMode({ type: 'spawn-isolated', port: 0, rpcUrl: '' }, { context: 'Zoltar deployment', chainId: 11155111, hardfork: 'osaka', zeroFees: false })
	try {
		const parameters = {
			chainId: 11155111,
			// Public Anvil development account, never funded on a public network.
			privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const,
			rpcUrl: node.rpcUrl,
			log: () => undefined,
			writeGitHubSummary: false,
		}
		const expectedIds: Array<ReturnType<typeof createCompleteDeploymentPlan>[number]['id']> = ['proxyDeployer', 'deploymentStatusOracle', 'weth', 'reputationToken', 'multicall3', 'zoltarQuestionData', 'zoltar']
		expect(createCompleteDeploymentPlan(SEPOLIA_NETWORK_PROFILE).map(step => step.id)).toEqual(expectedIds)
		const first = await deployTestnet(parameters)
		expect(first.results).toHaveLength(expectedIds.length)
		expect(first.results.every(result => result.status === 'deployed')).toBe(true)
		const second = await deployTestnet(parameters)
		expect(second.results.every(result => result.status === 'skipped')).toBe(true)
	} finally {
		await node.dispose()
	}
}, 60000)
