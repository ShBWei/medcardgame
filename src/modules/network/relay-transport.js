/**
 * MediCard — Relay Transport (WebSocket fallback for P2P)
 * Provides guaranteed TCP connectivity when WebRTC DataChannel fails.
 * Mimics PeerJS DataConnection API: open/close events, send(data), on('data')
 */
(function() {
  var MediCard = window.MediCard || {};

  MediCard.RelayTransport = {
    _ws: null,
    _room: null,
    _clientId: null,
    _open: false,
    _reconnecting: false,
    _reconnectTimer: null,
    _handlers: { open: [], data: [], close: [], error: [], peerJoin: [], peerLeave: [] },
    _sendQueue: [],

    connect(roomCode, clientId) {
      if (this._ws && (this._ws.readyState === 0 || this._ws.readyState === 1)) {
        this._ws.close();
      }
      this._room = String(roomCode).toUpperCase();
      this._clientId = clientId;
      this._open = false;
      this._reconnecting = false;

      var cfg = MediCard.Config.peerjs;
      var protocol = cfg.secure ? 'wss:' : 'ws:';
      var url = protocol + '//' + cfg.host + ':' + cfg.port + '/relay';

      console.log('[Relay] Connecting to', url, 'room:', this._room);
      try {
        this._ws = new WebSocket(url);
      } catch(e) {
        console.error('[Relay] WebSocket creation failed:', e.message);
        this._emit('error', e);
        return;
      }

      this._ws.onopen = function() {
        console.log('[Relay] WebSocket connected, joining room:', this._room);
        this._ws.send(JSON.stringify({
          type: 'relay_join',
          room: this._room,
          clientId: this._clientId
        }));
      }.bind(this);

      this._ws.onmessage = function(event) {
        var msg;
        try { msg = JSON.parse(event.data); } catch(e) { return; }
        switch (msg.type) {
          case 'relay_joined':
            this._open = true;
            this._reconnecting = false;
            // Flush queued messages
            while (this._sendQueue.length > 0) {
              this._ws.send(JSON.stringify(this._sendQueue.shift()));
            }
            this._emit('open', { clients: msg.clients, hostId: msg.hostId });
            break;
          case 'relay_client_joined':
            this._emit('peerJoin', { clientId: msg.clientId });
            break;
          case 'relay_client_left':
            this._emit('peerLeave', { clientId: msg.clientId });
            break;
          case 'relay_data':
            this._emit('data', { from: msg.from, payload: msg.payload });
            break;
          case 'relay_error':
            console.error('[Relay] Server error:', msg.error);
            this._emit('error', new Error(msg.error));
            break;
        }
      }.bind(this);

      this._ws.onclose = function(event) {
        console.warn('[Relay] WebSocket closed:', event.code, event.reason);
        var wasOpen = this._open;
        this._open = false;
        if (wasOpen) this._emit('close', { code: event.code, reason: event.reason });
        // Auto-reconnect if we were connected
        if (wasOpen && !this._reconnecting) {
          this._scheduleReconnect();
        }
      }.bind(this);

      this._ws.onerror = function(err) {
        console.error('[Relay] WebSocket error');
        if (!this._open) {
          this._emit('error', new Error('Relay WebSocket connection failed'));
        }
      }.bind(this);
    },

    send(data) {
      if (!this._room || !this._clientId) return;
      var msg = JSON.stringify({
        type: 'relay_data',
        room: this._room,
        target: 'broadcast',
        payload: data
      });
      if (this._ws && this._ws.readyState === 1) {
        this._ws.send(msg);
      } else {
        // Queue until connected
        this._sendQueue.push({
          type: 'relay_data',
          room: this._room,
          target: 'broadcast',
          payload: data
        });
      }
    },

    sendTo(targetId, data) {
      if (!this._room || !this._clientId) return;
      var msg = {
        type: 'relay_data',
        room: this._room,
        target: targetId,
        payload: data
      };
      if (this._ws && this._ws.readyState === 1) {
        this._ws.send(JSON.stringify(msg));
      } else {
        this._sendQueue.push(msg);
      }
    },

    on(event, handler) {
      if (this._handlers[event]) this._handlers[event].push(handler);
      return this;
    },

    _emit(event, data) {
      (this._handlers[event] || []).forEach(function(fn) { fn(data); });
    },

    isOpen() { return this._open; },

    close() {
      this._reconnecting = false;
      if (this._reconnectTimer) { clearTimeout(this._reconnectTimer); this._reconnectTimer = null; }
      if (this._ws) {
        try { this._ws.send(JSON.stringify({ type: 'relay_leave', room: this._room })); } catch(e) {}
        this._ws.close();
        this._ws = null;
      }
      this._open = false;
      this._sendQueue = [];
    },

    _scheduleReconnect() {
      if (this._reconnectTimer) return;
      this._reconnecting = true;
      this._reconnectTimer = setTimeout(function() {
        this._reconnectTimer = null;
        if (this._reconnecting && !this._open) {
          console.log('[Relay] Attempting reconnect...');
          this.connect(this._room, this._clientId);
        }
      }.bind(this), 3000);
    }
  };

  window.MediCard = MediCard;
})();
