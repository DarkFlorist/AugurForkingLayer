interface KnownSourceMapCoverageGapContext {
	readonly maxPreviousLines: number
	readonly linePattern: RegExp
}

export interface KnownSourceMapCoverageGapLineRule {
	readonly currentSourceMatches: number
	readonly linePattern: RegExp
	readonly precededBy?: KnownSourceMapCoverageGapContext
}

interface KnownSourceMapCoverageGapFileRule {
	readonly sourcePath: string
	readonly lineRules: readonly KnownSourceMapCoverageGapLineRule[]
}

// No known source-map coverage exclusions for the retained contracts.
export const knownSourceMapCoverageGaps: readonly KnownSourceMapCoverageGapFileRule[] = []
