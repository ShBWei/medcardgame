import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const modulePath = resolve(__dirname, '..', 'src', 'modules', 'ui-system', 'screen-auth.js');

function loadScreenAuth() {
  const code = readFileSync(modulePath, 'utf8');
  new Function(code)();
}

describe('ScreenAuth login', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.MediCard = {
      Crypto: {
        verifyPassword: (password, hash, cb) => cb(true)
      },
      Storage: {
        setCurrentUser: vi.fn(),
        syncAccountToServer: vi.fn()
      },
      CloudAPI: {
        init: vi.fn(),
        login: vi.fn(() => Promise.resolve())
      },
      GameState: { goToScreen: vi.fn() },
      Audio: { playButtonClick: vi.fn() }
    };
    loadScreenAuth();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('uses user username when syncing CloudAPI login', () => {
    const user = { id: 'u1', username: 'alice', passwordHash: 'hash' };
    window.MediCard.ScreenAuth._doLogin(user, 'pw', null);
    expect(window.MediCard.CloudAPI.login).toHaveBeenCalledWith('alice', 'pw');
  });
});
