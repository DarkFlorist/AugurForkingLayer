/// <reference types="bun-types" />

import { describe, expect, test } from 'bun:test'
import { resolveEnumValue } from '../forms/viewState.js'

void describe('view state helpers', () => {
	void test('resolveEnumValue returns the matching enum value or the fallback', () => {
		expect(resolveEnumValue<'browse' | 'create'>('create', 'browse', ['browse', 'create'])).toBe('create')
		expect(resolveEnumValue<'browse' | 'create'>('invalid', 'browse', ['browse', 'create'])).toBe('browse')
		expect(resolveEnumValue<'browse' | 'create'>(undefined, 'browse', ['browse', 'create'])).toBe('browse')
	})
})
