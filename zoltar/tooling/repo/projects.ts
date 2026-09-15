// Zoltar-local package graph. Applications are dependency leaves.
export const projects = [
	{ id: 'ui-core', path: 'ui/coreShared', dependencies: [] },
	{ id: 'ui-zoltar-shared', path: 'ui/zoltarShared', dependencies: ['ui-core'] },
	{ id: 'ui-zoltar', path: 'ui/zoltar', dependencies: ['ui-core', 'ui-zoltar-shared'] },
]
export function projectDependencyClosure(ids: readonly string[]) {
	const selected = new Set(ids)
	for (const project of [...projects].reverse()) {
		if (selected.has(project.id)) for (const dependency of project.dependencies) selected.add(dependency)
	}
	return projects.filter(project => selected.has(project.id))
}
