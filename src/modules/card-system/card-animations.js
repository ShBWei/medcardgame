/**
 * MediCard Duel — Card Animations
 * JS-triggered animation sequences for card play/draw/discard
 */
(function() {
  var MediCard = window.MediCard || {};

  MediCard.CardAnimations = {
    /**
     * Animate playing a card from hand
     */
    playCard(cardElement, callback) {
      if (!cardElement) return;
      cardElement.classList.add('card-playing');

      // Screen shake for epic/legendary
      var rarity = cardElement.getAttribute('data-rarity');
      if (rarity === 'legendary') {
        MediCard.CardVisuals.screenFlash();
        setTimeout(function() { MediCard.CardVisuals.screenShake(); }, 100);
      } else if (rarity === 'epic') {
        MediCard.CardVisuals.screenShake();
      }

      cardElement.addEventListener('animationend', function handler() {
        cardElement.removeEventListener('animationend', handler);
        if (cardElement.parentNode) cardElement.parentNode.removeChild(cardElement);
        if (callback) callback();
      });
    },

    /**
     * Animate drawing a card
     */
    drawCard(cardElement) {
      if (!cardElement) return;
      cardElement.classList.add('card-drawing');
    },

    /**
     * Animate discarding a card
     */
    discardCard(cardElement) {
      if (!cardElement) return;
      cardElement.classList.add('card-discarding');
      cardElement.addEventListener('animationend', function handler() {
        cardElement.removeEventListener('animationend', handler);
        if (cardElement.parentNode) cardElement.parentNode.removeChild(cardElement);
      });
    },

    /**
     * Show question popup with animation
     */
    showQuestionPopup(questionData) {
      return MediCard.UI && MediCard.UI.showQuestionPopup ?
        MediCard.UI.showQuestionPopup(questionData) : null;
    }
  };

  window.MediCard = MediCard;
})();
