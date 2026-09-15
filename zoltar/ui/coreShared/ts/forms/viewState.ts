export function resolveEnumValue<T extends string>(value: string | undefined, fallback: T, allowedValues: readonly T[]) {
	if (value !== undefined && allowedValues.includes(value as T)) return value as T
	return fallback
}
