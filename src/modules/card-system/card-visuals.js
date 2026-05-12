/**
 * MediCard Duel — Card Visuals
 * DOM creation and rendering for cards
 */
(function() {
  var MediCard = window.MediCard || {};

  MediCard.CardVisuals = {
    /**
     * Create a card DOM element
     * @param {Object} cardData - Card data object
     * @param {Boolean} showBack - Whether to show the back face
     * @returns {HTMLElement}
     */
    createCardElement(cardData, showBack) {
      var card = document.createElement('div');
      card.className = 'card';
      card.setAttribute('data-rarity', cardData.rarity || 'common');
      card.setAttribute('data-subject', cardData.subjectId || '');
      card.setAttribute('data-card-id', cardData.id);
      card.setAttribute('data-card-type', cardData.cardType || '');
      card.setAttribute('title', (cardData.cardName || '') + ': ' + (cardData.cardEffect || ''));
      if (cardData.rarity === 'legendary') card.classList.add('legendary');

      var inner = document.createElement('div');
      inner.className = 'card-inner';

      // Front face
      var front = this._createFrontFace(cardData);
      // Back face
      var back = this._createBackFace();

      inner.appendChild(front);
      inner.appendChild(back);
      card.appendChild(inner);

      if (showBack) {
        card.classList.add('flipped');
      }

      return card;
    },

    _createFrontFace(cardData) {
      var front = document.createElement('div');
      front.className = 'card-front';

      // Type-specific background tint
      var typeColors = {
        attack: 'rgba(239,68,68,0.08)', defense: 'rgba(59,130,246,0.08)',
        heal: 'rgba(16,185,129,0.08)', tactic: 'rgba(168,85,247,0.08)',
        equipment: 'rgba(16,185,129,0.06)', delayed: 'rgba(249,115,22,0.08)'
      };
      if (typeColors[cardData.cardType]) {
        front.style.background = 'linear-gradient(135deg, ' + typeColors[cardData.cardType] + ' 0%, rgba(15,23,42,0.95) 100%)';
      }

      // Subtle top border based on type
      var typeBorderColors = {
        attack: '#ef4444', defense: '#3b82f6', heal: '#10b981',
        tactic: '#a855f7', equipment: '#10b981', delayed: '#f97316'
      };
      if (typeBorderColors[cardData.cardType]) {
        front.style.borderTop = '2px solid ' + typeBorderColors[cardData.cardType];
      }

      // Rarity gem
      var gem = document.createElement('div');
      gem.className = 'card-gem';
      front.appendChild(gem);

      // Border animation for epic/legendary
      if (cardData.rarity === 'epic' || cardData.rarity === 'legendary') {
        var borderAnim = document.createElement('div');
        borderAnim.className = 'card-border-anim';
        front.appendChild(borderAnim);
      }

      // Glow layer
      var glow = document.createElement('div');
      glow.className = 'card-glow';
      front.appendChild(glow);

      // Card type icon
      var cost = document.createElement('div');
      cost.className = 'card-cost';
      var typeInfo = (MediCard.CardData && MediCard.CardData.getTypeInfo(cardData.cardType));
      cost.textContent = typeInfo ? typeInfo.icon : '⚔️';
      // Color the cost circle based on type
      if (typeBorderColors[cardData.cardType]) {
        cost.style.borderColor = typeBorderColors[cardData.cardType];
        cost.style.color = typeBorderColors[cardData.cardType];
        cost.style.background = typeBorderColors[cardData.cardType] + '22';
      }
      front.appendChild(cost);

      // Type badge
      var badge = document.createElement('div');
      badge.className = 'card-type-badge ' + (cardData.cardType || 'attack');
      badge.textContent = (MediCard.CardData && MediCard.CardData.getTypeInfo(cardData.cardType)) ?
        MediCard.CardData.getTypeInfo(cardData.cardType).name : (cardData.cardType || 'ATTACK');
      front.appendChild(badge);

      // Art area — show subject icon + card subtype icon
      var art = document.createElement('div');
      art.className = 'card-art';
      var meta = (MediCard.Config && MediCard.Config.subjectMeta) ? MediCard.Config.subjectMeta[cardData.subjectId] : null;
      var artIcon = meta ? meta.icon : '📚';
      // For special cards, add subtype-specific icon overlay
      var subtypeIcon = this._getSubtypeIcon(cardData);
      art.textContent = artIcon;
      if (subtypeIcon && subtypeIcon !== artIcon) {
        var overlay = document.createElement('span');
        overlay.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:20px;opacity:0.6;pointer-events:none;';
        overlay.textContent = subtypeIcon;
        art.style.position = 'relative';
        art.appendChild(overlay);
      }
      front.appendChild(art);

      // Card name
      var name = document.createElement('div');
      name.className = 'card-name';
      name.textContent = cardData.cardName || '卡牌';
      if (typeBorderColors[cardData.cardType]) {
        name.style.color = typeBorderColors[cardData.cardType];
      }
      front.appendChild(name);

      // Card effect description
      var effect = document.createElement('div');
      effect.className = 'card-effect';
      effect.textContent = cardData.cardEffect || '';
      front.appendChild(effect);

      // Subject icon
      var subIcon = document.createElement('div');
      subIcon.className = 'card-subject-icon';
      subIcon.textContent = meta ? meta.icon : '';
      front.appendChild(subIcon);

      // Rarity label
      var rarityLabel = document.createElement('div');
      rarityLabel.className = 'card-rarity-label';
      var rarityInfo = MediCard.CardData ? MediCard.CardData.getRarityInfo(cardData.rarity) : null;
      rarityLabel.textContent = rarityInfo ? rarityInfo.name : (cardData.rarity || '');
      front.appendChild(rarityLabel);

      return front;
    },

    /** Get subtype-specific icon for card art overlay */
    _getSubtypeIcon(cardData) {
      if (cardData.cardType === 'tactic' || cardData.cardType === 'equipment' || cardData.cardType === 'delayed') {
        var defs = null;
        if (cardData.cardType === 'tactic') defs = MediCard.Config.tacticDefs;
        else if (cardData.cardType === 'equipment') defs = MediCard.Config.equipmentDefs;
        else if (cardData.cardType === 'delayed') defs = MediCard.Config.delayedDefs;
        if (defs && defs[cardData.cardSubtype]) return defs[cardData.cardSubtype].icon;
      }
      var typeIcons = { attack: '⚔️', defense: '🛡️', heal: '💚' };
      return typeIcons[cardData.cardType] || null;
    },

    _createBackFace() {
      var back = document.createElement('div');
      back.className = 'card-back';

      var pattern = document.createElement('div');
      pattern.className = 'card-back-pattern';
      back.appendChild(pattern);

      var logo = document.createElement('div');
      logo.className = 'card-back-logo';
      logo.textContent = 'MEDICARD';
      back.appendChild(logo);

      return back;
    },

    /**
     * Render hand cards in fan layout
     * @param {String} containerId - DOM container ID
     * @param {Array} cards - Array of card data objects
     * @param {Function} onClick - Click handler for each card
     */
    renderHandCards(containerId, cards, onClick) {
      var container = document.getElementById(containerId);
      if (!container) return;

      container.innerHTML = '';
      container.className = 'hand-cards';

      var count = cards.length;
      var totalAngle = Math.min(count * 4, 30); // Max 30 degrees total fan
      var startAngle = -totalAngle / 2;
      var angleStep = count > 1 ? totalAngle / (count - 1) : 0;

      cards.forEach(function(card, index) {
        var cardEl = this.createCardElement(card);
        var angle = startAngle + angleStep * index;
        var translateY = Math.abs(angle) * 2;

        cardEl.style.transform = 'rotate(' + angle + 'deg) translateY(' + translateY + 'px)';
        cardEl.style.zIndex = index + 1;

        if (onClick) {
          cardEl.addEventListener('click', function(e) {
            onClick(card, index, e);
          });
        }

        container.appendChild(cardEl);
      }.bind(this));
    },

    /**
     * Show damage number animation
     */
    showDamageNumber(container, x, y, value, type) {
      var el = document.createElement('span');
      el.className = 'damage-number';
      if (type === 'critical') el.classList.add('critical');
      if (type === 'heal') el.classList.add('heal');
      if (type === 'shield') el.classList.add('shield');
      el.textContent = (type === 'heal' ? '+' : '-') + Math.abs(value);
      el.style.left = x + 'px';
      el.style.top = y + 'px';

      (typeof container === 'string' ? document.getElementById(container) : container).appendChild(el);

      el.addEventListener('animationend', function() {
        el.remove();
      });
    },

    /**
     * Spawn particle burst effect
     */
    spawnParticles(container, x, y, color, count) {
      count = count || 12;
      var c = typeof container === 'string' ? document.getElementById(container) : container;
      if (!c) return;

      for (var i = 0; i < count; i++) {
        var particle = document.createElement('span');
        particle.className = 'particle';
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.setProperty('--tx', (Math.random() - 0.5) * 200 + 'px');
        particle.style.setProperty('--ty', (Math.random() - 0.5) * 200 + 'px');
        particle.style.width = (Math.random() * 8 + 4) + 'px';
        particle.style.height = particle.style.width;
        particle.style.animationDuration = (Math.random() * 1 + 1) + 's';
        particle.style.background = color || '#06b6d4';
        particle.style.boxShadow = '0 0 6px ' + (color || '#06b6d4');

        c.appendChild(particle);

        particle.addEventListener('animationend', function() {
          particle.remove();
        });
      }
    },

    /**
     * Trigger screen shake
     */
    screenShake() {
      var app = document.getElementById('app');
      if (!app) return;
      app.classList.add('screen-shake');
      setTimeout(function() {
        app.classList.remove('screen-shake');
      }, 400);
    },

    /**
     * Trigger screen flash (for legendary cards)
     */
    screenFlash() {
      var flash = document.createElement('div');
      flash.className = 'screen-flash';
      document.body.appendChild(flash);
      setTimeout(function() {
        flash.remove();
      }, 600);
    }
  };

  window.MediCard = MediCard;
})();
