/**
 * MediCard 医杀 — Question Loader (V5.2)
 * Lazy loading, caching, and deck generation
 */
(function() {
  const MediCard = window.MediCard || {};

  MediCard.QuestionLoader = {
    _cache: {},
    _loadedSubjects: new Set(),
    _selectedSubjects: new Set(),

    init(selectedSubjectIds) {
      this._selectedSubjects = new Set(selectedSubjectIds);
      this._loadSelected();
    },

    _loadSelected() {
      const bank = MediCard.QuestionBank || {};
      for (const id of this._selectedSubjects) {
        if (bank[id] && !this._loadedSubjects.has(id)) {
          this._cache[id] = bank[id];
          this._loadedSubjects.add(id);
        }
      }
    },

    loadSubject(subjectId) {
      if (this._cache[subjectId]) return this._cache[subjectId];
      const bank = MediCard.QuestionBank || {};
      if (bank[subjectId]) {
        this._cache[subjectId] = bank[subjectId];
        this._loadedSubjects.add(subjectId);
        return bank[subjectId];
      }
      return [];
    },

    getSubject(subjectId) {
      return this._cache[subjectId] || this.loadSubject(subjectId);
    },

    getQuestionsByDifficulty(subjectId, difficulty) {
      const questions = this.getSubject(subjectId);
      return questions.filter(q => q.difficulty === difficulty);
    },

    /**
     * Generate a 72-card basic deck from selected subjects
     * Uses CardData.generateBasicDeck() for the actual composition logic
     */
    generateDeck(cardCount) {
      var selectedIds = Array.from(this._selectedSubjects);
      if (selectedIds.length === 0) return [];
      return MediCard.CardData.generateBasicDeck(selectedIds, this);
    },

    getSelectionStats() {
      const stats = {
        total: 0,
        byDifficulty: { common: 0, rare: 0, epic: 0, legendary: 0 },
        bySubject: {}
      };

      for (const id of this._selectedSubjects) {
        const questions = this.getSubject(id);
        stats.total += questions.length;
        stats.bySubject[id] = questions.length;
        for (const q of questions) {
          stats.byDifficulty[q.difficulty] = (stats.byDifficulty[q.difficulty] || 0) + 1;
        }
      }

      return stats;
    },

    _shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }
  };

  window.MediCard = MediCard;
})();
