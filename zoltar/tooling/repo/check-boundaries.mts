import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import ts from 'typescript'
import { repositoryRoot } from './root.mts'

const localPackages = new Set(['core-shared', 'zoltar-shared', 'ui-core-shared', 'ui-zoltar-shared', 'ui-zoltar', 'contracts'])
export function checkImportBoundary(file: string, specifier: string, root = repositoryRoot): string | undefined {
	if (specifier.startsWith('@zoltar/') && !localPackages.has(specifier.split('/')[1] ?? '')) return `${file}: excluded product import ${specifier}`
	if (path.isAbsolute(specifier)) return `${file}: absolute filesystem import ${specifier}`
	if (specifier.startsWith('.')) {
		const relative = path.relative(root, path.resolve(path.dirname(file), specifier))
		const source = path.relative(root, file).split(path.sep).join('/')
		if (source.startsWith('solidity/contracts/') && !source.startsWith('solidity/contracts/test/') && relative.split(path.sep).join('/').startsWith('solidity/contracts/test/')) return `${file}: production contract imports test source ${specifier}`
		if (relative === '..' || relative.startsWith(`..${path.sep}`)) return `${file}: import escapes Zoltar: ${specifier}`
	}
	return undefined
}

export async function checkBoundaries(root = repositoryRoot) {
	const failures: string[] = []
	async function visit(directory: string): Promise<void> {
		for (const entry of await readdir(directory, { withFileTypes: true })) {
			if (['node_modules', 'js', 'dist', 'artifacts', '.git'].includes(entry.name)) continue
			if (entry.name === 'vendor' && path.relative(root, directory).startsWith('ui')) continue
			const file = path.join(directory, entry.name)
			if (entry.isDirectory()) {
				await visit(file)
				continue
			}
			if (entry.name === 'package.json') {
				const manifest = JSON.parse(await readFile(file, 'utf8'))
				for (const name of Object.keys({ ...manifest.dependencies, ...manifest.devDependencies })) {
					const failure = checkImportBoundary(file, name, root)
					if (failure) failures.push(failure)
				}
			}
			if (/\.(?:ts|tsx|mts)$/.test(file) && !/contractArtifact\.ts$/.test(file)) {
				const source = ts.createSourceFile(file, await readFile(file, 'utf8'), ts.ScriptTarget.Latest, true)
				function inspect(node: ts.Node) {
					let literal: ts.Node | undefined
					if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) literal = node.moduleSpecifier
					else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) literal = node.arguments[0]
					if (literal && ts.isStringLiteral(literal)) {
						const failure = checkImportBoundary(file, literal.text, root)
						if (failure) failures.push(failure)
					}
					ts.forEachChild(node, inspect)
				}
				inspect(source)
			}
			if (file.endsWith('.sol')) {
				for (const match of (await readFile(file, 'utf8')).matchAll(/\bimport\s+(?:[^'"]*?from\s+)?['"]([^'"]+)['"]/g)) {
					if (!match[1]) continue
					const failure = checkImportBoundary(file, match[1], root)
					if (failure) failures.push(failure)
				}
			}
		}
	}
	await visit(root)
	if (failures.length) throw new Error(failures.join('\n'))
	console.log('Zoltar import boundaries passed')
}
if (import.meta.main) await checkBoundaries()
