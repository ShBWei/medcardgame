/**
 * MediCard Duel — Identity UI
 * Identity badge and reveal display
 */
(function() {
  var MediCard = window.MediCard || {};

  MediCard.IdentityUI = {
    /**
     * Create identity badge element
     */
    createBadge(identity, revealed) {
      var el = document.createElement('span');
      el.className = 'opponent-identity';

      if (!revealed) {
        el.textContent = '???';
        el.className += ' hidden';
        return el;
      }

      var info = MediCard.IdentityData.getIdentityInfo(identity);
      if (info) {
        el.textContent = info.icon + ' ' + info.name;
        el.classList.add(identity);
      }
      return el;
    },

    /**
     * Create identity reveal animation
     */
    revealIdentity(containerId, identity) {
      var container = document.getElementById(containerId);
      if (!container) return;

      var info = MediCard.IdentityData.getIdentityInfo(identity);
      if (!info) return;

      var reveal = document.createElement('div');
      reveal.style.cssText = 'text-align:center;animation:bounceIn 500ms ease-out;padding:20px;';
      reveal.innerHTML = '<div style="font-size:48px;">' + info.icon + '</div>' +
        '<div style="font-size:24px;font-weight:800;color:' + info.color + ';margin-top:8px;">' + info.name + '</div>' +
        '<div style="font-size:14px;color:var(--text-muted);margin-top:4px;">' + info.description + '</div>';

      container.innerHTML = '';
      container.appendChild(reveal);
    },

    /**
     * Get identity display name
     */
    getName(identity) {
      var info = MediCard.IdentityData.getIdentityInfo(identity);
      return info ? info.name : '未知';
    }
  };

  window.MediCard = MediCard;
})();
