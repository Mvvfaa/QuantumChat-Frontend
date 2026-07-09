import { createContext, useContext, useState, useCallback } from 'react';
import client from '../api/client.js';
import { generateKeySet } from '../crypto/keys.js';
import { addKeySetToRing, hasKeyring, saveSession, getStoredUser, clearSession, getToken } from '../crypto/keyStorage.js';
import { connectSocket, disconnectSocket } from '../api/socket.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser());

  const register = useCallback(async ({ username, email, password }) => {
    const keySet = generateKeySet();
    const publicKeys = keySet.map((k) => k.publicKey);
    const { data } = await client.post('/auth/register', { username, email, password, publicKeys });
    const { token, user: newUser } = data.data;
    addKeySetToRing(newUser.id, keySet);
    saveSession(token, newUser);
    setUser(newUser);
    connectSocket();
    return newUser;
  }, []);

  // The 5-key pool is fixed at registration — login doesn't touch it. The
  // keyring generated at register time already has every key this account
  // will use; there's nothing new to add here.
  const login = useCallback(async ({ email, password }) => {
    const { data } = await client.post('/auth/login', { email, password });
    const { token, user: loggedInUser } = data.data;
    saveSession(token, loggedInUser);
    setUser(loggedInUser);
    connectSocket();
    return loggedInUser;
  }, []);

  // Generates a fresh 5-key pool, adds it to the local keyring, and
  // publishes it to the server. Only used to recover a missing keyring on a
  // new/wiped device — history encrypted under the prior keys stays
  // unreadable unless this device already held them, which is the expected
  // E2E tradeoff.
  const regenerateKeys = useCallback(async () => {
    if (!user) throw new Error('Not authenticated');
    const keySet = generateKeySet();
    const publicKeys = keySet.map((k) => k.publicKey);
    const { data } = await client.patch('/users/me/public-keys', { publicKeys });
    addKeySetToRing(user.id, keySet);
    saveSession(getToken(), data.data);
    setUser(data.data);
    return data.data;
  }, [user]);

  const logout = useCallback(() => {
    clearSession();
    disconnectSocket();
    setUser(null);
  }, []);

  const hasLocalKeyring = user ? hasKeyring(user.id) : false;

  return (
    <AuthContext.Provider value={{ user, register, login, logout, regenerateKeys, hasLocalKeyring }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
