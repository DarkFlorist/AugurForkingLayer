export type ContractProject = 'zoltar'

export function isContractProjectSource(sourcePath: string, _project: ContractProject) {
	return sourcePath.startsWith('contracts/') && !sourcePath.startsWith('contracts/test/')
}

export function parseContractProject(value: string): ContractProject {
	if (value !== 'zoltar') throw new Error(`Unknown contract project: ${value}`)
	return value
}
