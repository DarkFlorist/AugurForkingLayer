import type { QuestionFormState } from '../../../types/app.js'

export function getDefaultQuestionFormState(): QuestionFormState {
	return {
		answerUnit: '',
		categoricalOutcomes: ['Yes', 'No'],
		description: '',
		endTime: '',
		questionType: 'binary',
		scalarIncrement: '1',
		scalarMax: '100',
		scalarMin: '0',
		title: '',
		startTime: '',
	}
}
