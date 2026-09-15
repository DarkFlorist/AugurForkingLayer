import * as path from 'node:path'
import { isContractProjectSource, type ContractProject } from '../../solidity/ts/contractProjects.ts'

export function isWatchedContractSource(filePath: string, repositoryRootPath: string, project: ContractProject) {
	const sourcePath = path.relative(path.join(repositoryRootPath, 'solidity'), filePath).replaceAll('\\', '/')
	// A rename can report the neutral infrastructure directory.
	if (sourcePath === 'contracts/infrastructure') return true
	return isContractProjectSource(sourcePath.endsWith('.sol') ? sourcePath : `${sourcePath}/`, project)
}
