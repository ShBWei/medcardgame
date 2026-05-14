/**
 * MediCard Duel — Sync Protocol
 * Message types and serialization for P2P game sync
 */
(function() {
  var MediCard = window.MediCard || {};

  MediCard.SyncProtocol = {
    MessageType: {
      JOIN_REQUEST: 'join_req',
      JOIN_ACCEPT: 'join_acc',
      JOIN_REJECT: 'join_rej',
      PLAYER_READY: 'player_ready',
      PLAY_CARD: 'play_card',
      ANSWER_QUESTION: 'answer_q',
      END_TURN: 'end_turn',
      FULL_STATE: 'full_state',
      DELTA_STATE: 'delta_state',
      GAME_START: 'game_start',
      GAME_OVER: 'game_over',
      PING: 'ping',
      PONG: 'pong',
      PLAYER_DISCONNECT: 'player_dc',
      DEFEND_QUESTION: 'defend_q',
      DEFEND_ANSWER: 'defend_a',
      SURRENDER: 'surrender',
      TIME_EXTEND_VOTE: 'time_ext_vote',
      TIME_EXTEND_GRANTED: 'time_ext_granted'
    },

    pack(type, data) {
      return JSON.stringify({ t: type, d: data, ts: Date.now() });
    },

    unpack(message) {
      try {
        return JSON.parse(message);
      } catch (e) {
        return null;
      }
    }
  };

  window.MediCard = MediCard;
})();
