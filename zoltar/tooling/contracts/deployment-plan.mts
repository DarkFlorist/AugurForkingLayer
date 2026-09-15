import { EXPECTED_SEPOLIA_DEPLOYMENT_RUNTIME_CODE_HASHES, getDeploymentSteps } from '../../ui/zoltarShared/ts/protocol/deployment.ts'
import type { NetworkProfile } from '../../ui/coreShared/ts/wallet/networkProfile.ts'

export function createCompleteDeploymentPlan(profile: NetworkProfile) {
	return getDeploymentSteps(profile).map(step => {
		const expectedRuntimeCodeHash = EXPECTED_SEPOLIA_DEPLOYMENT_RUNTIME_CODE_HASHES[step.id]
		if (expectedRuntimeCodeHash === undefined) throw new Error(`Missing runtime hash for ${step.id}`)
		return { ...step, expectedRuntimeCodeHash }
	})
}
