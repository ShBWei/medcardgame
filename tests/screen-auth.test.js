import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('ScreenAuth login', () => {
  beforeEach(async () => {
    vi.resetModules();

    window.MediCard = {
      Crypto: {
        verifyPassword: vi.fn((password, hash, cb) => cb(true)),
        validatePassword: vi.fn(() => true),
        hashPassword: vi.fn(),
        sanitize: (value) => value,
        escapeHtml: (value) => value
      },
      Storage: {
        setCurrentUser: vi.fn(),
        syncAccountToServer: vi.fn()
      },
      GameState: {
        goToScreen: vi.fn()
      },
      Audio: {
        playButtonClick: vi.fn()
      },
      CloudAPI: {
        init: vi.fn(),
        login: vi.fn().mockResolvedValue()
      }
    };

    await import('../src/modules/ui-system/screen-auth.js');
  });

  it('uses stored username when logging in via CloudAPI', async () => {
    const { MediCard } = window;
    const user = { id: 'user-1', username: 'alice', passwordHash: 'hash' };

    MediCard.ScreenAuth._doLogin(user, 'secret', null);

    await Promise.resolve();

    expect(MediCard.CloudAPI.login).toHaveBeenCalledWith('alice', 'secret');
  });
});
