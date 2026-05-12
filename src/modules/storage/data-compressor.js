/**
 * MediCard Duel — Data Compressor
 * LZ-string wrapper for question bank compression
 */
(function() {
  const MediCard = window.MediCard || {};

  MediCard.Compressor = {
    compress(data) {
      if (typeof LZString === 'undefined') {
        // LZString not available
        return JSON.stringify(data);
      }
      return LZString.compressToUTF16(JSON.stringify(data));
    },

    decompress(str) {
      if (typeof LZString === 'undefined') {
        return JSON.parse(str);
      }
      try {
        if (str.startsWith('[') || str.startsWith('{')) {
          return JSON.parse(str);
        }
        const decompressed = LZString.decompressFromUTF16(str);
        return JSON.parse(decompressed);
      } catch (e) {
        // Decompression fallback
        try { return JSON.parse(str); } catch (e2) { return []; }
      }
    },

    getSizeStats(data) {
      const raw = JSON.stringify(data);
      const compressed = this.compress(data);
      return {
        rawBytes: raw.length,
        compressedBytes: compressed.length,
        ratio: raw.length > 0 ? ((1 - compressed.length / raw.length) * 100).toFixed(1) : 0
      };
    }
  };

  window.MediCard = MediCard;
})();
