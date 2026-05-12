/**
 * MediCard Duel — Question Validator
 * Validates question object schema and data integrity
 */
(function() {
  const MediCard = window.MediCard || {};

  MediCard.QuestionValidator = {
    DIFFICULTIES: ['common', 'rare', 'epic', 'legendary'],
    QUESTION_TYPES: ['single', 'multiple', 'truefalse'],
    CARD_TYPES: ['attack', 'defense', 'heal', 'buff', 'debuff', 'special'],

    validate(question) {
      const errors = [];

      if (!question.id || typeof question.id !== 'string') errors.push('Missing/invalid id');
      if (!question.subject) errors.push('Missing subject name');
      if (!question.subjectId) errors.push('Missing subjectId');
      if (!this.DIFFICULTIES.includes(question.difficulty)) errors.push('Invalid difficulty: ' + question.difficulty);
      if (!question.question || typeof question.question !== 'string') errors.push('Missing/invalid question text');
      if (!Array.isArray(question.options) || question.options.length < 2) errors.push('Need at least 2 options');
      if (!Array.isArray(question.correctAnswers) || question.correctAnswers.length === 0) errors.push('Need at least 1 correct answer');

      // Validate correct answers are in options
      if (question.options && question.correctAnswers) {
        for (const ans of question.correctAnswers) {
          const prefix = ans.charAt(0).toUpperCase();
          if (!question.options.some(opt => opt.startsWith(prefix + '.') || opt.startsWith(prefix + ' '))) {
            errors.push('Answer ' + ans + ' not found in options');
          }
        }
      }

      if (!question.explanation) errors.push('Missing explanation');

      return {
        valid: errors.length === 0,
        errors
      };
    },

    validateBatch(questions) {
      const results = { valid: 0, invalid: 0, errors: [] };
      const seenIds = new Set();

      for (const q of questions) {
        if (seenIds.has(q.id)) {
          results.invalid++;
          results.errors.push('Duplicate id: ' + q.id);
          continue;
        }
        seenIds.add(q.id);

        const result = this.validate(q);
        if (result.valid) {
          results.valid++;
        } else {
          results.invalid++;
          results.errors.push({ id: q.id, errors: result.errors });
        }
      }

      return results;
    },

    getStats(questions) {
      return {
        total: questions.length,
        byDifficulty: {
          common: questions.filter(q => q.difficulty === 'common').length,
          rare: questions.filter(q => q.difficulty === 'rare').length,
          epic: questions.filter(q => q.difficulty === 'epic').length,
          legendary: questions.filter(q => q.difficulty === 'legendary').length
        },
        byType: {
          single: questions.filter(q => q.questionType === 'single').length,
          multiple: questions.filter(q => q.questionType === 'multiple').length,
          truefalse: questions.filter(q => q.questionType === 'truefalse').length
        }
      };
    }
  };

  window.MediCard = MediCard;
})();
