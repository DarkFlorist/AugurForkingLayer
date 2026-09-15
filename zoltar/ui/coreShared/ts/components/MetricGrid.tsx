import { DataGrid } from './DataGrid.js'
import type { MetricGridProps } from '../types/components.js'

function getMetricGridVariantClassName(variant: MetricGridProps['variant'] = 'default') {
	switch (variant) {
		case 'default':
			return 'workflow-metric-grid'
		case 'question':
			return 'question-summary-grid'
		default:
			return 'workflow-metric-grid'
	}
}

export function MetricGrid({ children, className = '', columns = 'auto', dense = false, variant = 'default' }: MetricGridProps) {
	const classes = [getMetricGridVariantClassName(variant), className].filter(Boolean).join(' ')

	return (
		<DataGrid className={classes} columns={columns} dense={dense}>
			{children}
		</DataGrid>
	)
}
