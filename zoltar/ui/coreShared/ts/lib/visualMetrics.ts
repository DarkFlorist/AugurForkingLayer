import { bigintToSafeNumber } from '@zoltar/core-shared/evm/ethereum'

const VISUAL_RATIO_SCALE = 1_000_000n

export function getVisualRatio({ value, maxValue }: { value: bigint | undefined; maxValue: bigint | undefined }) {
	if (value === undefined || maxValue === undefined || maxValue <= 0n) return undefined
	if (value <= 0n) return 0
	if (value >= maxValue) return 1

	const scaledRatio = (value * VISUAL_RATIO_SCALE) / maxValue
	return bigintToSafeNumber(scaledRatio, 'Visual ratio') / 1_000_000
}
