/**
 * MediCard Duel — Card Component
 * Reusable card UI component for hand/deck display
 */
(function() {
  var MediCard = window.MediCard || {};

  MediCard.CardComponent = {
    /**
     * Render a card as a clickable DOM element
     */
    render(cardData, options) {
      options = options || {};
      var el = MediCard.CardVisuals.createCardElement(cardData, options.showBack);

      if (options.onClick) {
        el.addEventListener('click', function(e) {
          e.stopPropagation();
          options.onClick(cardData, el);
        });
      }

      if (options.selected) {
        el.style.transform = 'translateY(-20px) scale(1.05)';
        el.style.zIndex = '20';
        el.style.boxShadow = '0 0 15px rgba(6,182,212,0.4)';
      }

      return el;
    },

    /**
     * Render a small card preview (for deck builder, etc.)
     */
    renderMini(cardData) {
      var el = document.createElement('div');
      el.style.cssText = 'width:60px;height:90px;border-radius:6px;font-size:8px;padding:4px;' +
        'display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;' +
        'border:1px solid rgba(100,116,139,0.3);background:var(--bg-secondary);';

      var meta = MediCard.Config.subjectMeta[cardData.subjectId];
      var icon = document.createElement('div');
      icon.style.fontSize = '20px';
      icon.textContent = meta ? meta.icon : '📚';
      el.appendChild(icon);

      var name = document.createElement('div');
      name.style.fontSize = '8px';
      name.style.textAlign = 'center';
      name.style.lineHeight = '1.2';
      name.style.overflow = 'hidden';
      name.textContent = cardData.cardName || '';
      el.appendChild(name);

      return el;
    }
  };

  window.MediCard = MediCard;
})();
