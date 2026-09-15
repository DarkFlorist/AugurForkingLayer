import { getCreate2Address, type Address, type Hex } from '@zoltar/core-shared/evm/ethereum'

type DeploymentStatusOracleAddressConfig = {
	deploymentStatusOracleBytecode: () => Hex
	proxyDeployerAddress: Address
	zeroSalt: Hex
}

export function getProxyDeployerCreate2Address(proxyDeployerAddress: Address, zeroSalt: Hex, bytecode: Hex) {
	return getCreate2Address({
		bytecode,
		from: proxyDeployerAddress,
		salt: zeroSalt,
	})
}

export function createDeploymentStatusOracleAddressHelper(config: DeploymentStatusOracleAddressConfig) {
	const getDeploymentStatusOracleAddress = () => getProxyDeployerCreate2Address(config.proxyDeployerAddress, config.zeroSalt, config.deploymentStatusOracleBytecode())

	return {
		getDeploymentStatusOracleAddress,
	}
}
