export const sharedPackages = [
	{ id: 'shared-core', path: 'shared/core', name: '@zoltar/core-shared', dependencies: [] },
	{ id: 'shared-zoltar', path: 'shared/zoltar', name: '@zoltar/zoltar-shared', dependencies: ['shared-core'] },
] as const

export function sharedPackageClosure(ids: readonly string[]) {
	const selected = new Set(ids)
	for (const entry of [...sharedPackages].reverse()) {
		if (selected.has(entry.id)) for (const dependency of entry.dependencies) selected.add(dependency)
	}
	return sharedPackages.filter(entry => selected.has(entry.id))
}

export const appSharedPackages = {
	zoltar: ['shared-zoltar'],
} as const
