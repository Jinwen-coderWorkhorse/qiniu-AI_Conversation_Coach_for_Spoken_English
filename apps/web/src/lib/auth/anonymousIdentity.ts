import { postAnonymousAuth } from "@/lib/api/endpoints";
import type { AnonymousAuthRequest } from "@/lib/api/contracts";

const STORAGE_KEYS = {
  anonymousId: "anonymous_id",
  anonymousSecret: "anonymous_secret",
  accessToken: "access_token",
} as const;

export type AnonymousCredentials = AnonymousAuthRequest;

export type AnonymousIdentity = AnonymousCredentials & {
  access_token: string;
};

let pendingAuthentication: Promise<AnonymousIdentity> | undefined;

export function readAnonymousIdentity(): AnonymousIdentity | undefined {
  const credentials = readAnonymousCredentials();
  const accessToken = readStorageValue(STORAGE_KEYS.accessToken);

  if (!credentials || !accessToken) {
    return undefined;
  }

  return {
    ...credentials,
    access_token: accessToken,
  };
}

export async function ensureAnonymousIdentity() {
  const storedIdentity = readAnonymousIdentity();

  if (storedIdentity) {
    return storedIdentity;
  }

  return authenticateAnonymousIdentity();
}

export function authenticateAnonymousIdentity() {
  pendingAuthentication ??= requestAnonymousIdentity().finally(() => {
    pendingAuthentication = undefined;
  });

  return pendingAuthentication;
}

export function clearAnonymousAccessToken() {
  removeStorageValue(STORAGE_KEYS.accessToken);
}

function readAnonymousCredentials(): AnonymousCredentials | undefined {
  const anonymousId = readStorageValue(STORAGE_KEYS.anonymousId);
  const anonymousSecret = readStorageValue(STORAGE_KEYS.anonymousSecret);

  if (!anonymousId || !anonymousSecret) {
    return undefined;
  }

  return {
    anonymous_id: anonymousId,
    anonymous_secret: anonymousSecret,
  };
}

async function requestAnonymousIdentity(): Promise<AnonymousIdentity> {
  const credentials = getOrCreateAnonymousCredentials();
  const response = await postAnonymousAuth(credentials);
  const identity = {
    ...credentials,
    access_token: response.access_token,
  };

  writeAnonymousIdentity(identity);

  return identity;
}

function getOrCreateAnonymousCredentials(): AnonymousCredentials {
  const storedCredentials = readAnonymousCredentials();

  if (storedCredentials) {
    return storedCredentials;
  }

  const credentials = {
    anonymous_id: createAnonymousId(),
    anonymous_secret: createAnonymousSecret(),
  };

  writeStorageValue(STORAGE_KEYS.anonymousId, credentials.anonymous_id);
  writeStorageValue(STORAGE_KEYS.anonymousSecret, credentials.anonymous_secret);
  removeStorageValue(STORAGE_KEYS.accessToken);

  return credentials;
}

function writeAnonymousIdentity(identity: AnonymousIdentity) {
  writeStorageValue(STORAGE_KEYS.anonymousId, identity.anonymous_id);
  writeStorageValue(STORAGE_KEYS.anonymousSecret, identity.anonymous_secret);
  writeStorageValue(STORAGE_KEYS.accessToken, identity.access_token);
}

function createAnonymousId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `anon-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createAnonymousSecret() {
  const bytes = new Uint8Array(32);

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function readStorageValue(key: string) {
  if (!canUseLocalStorage()) {
    return undefined;
  }

  try {
    return window.localStorage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}

function writeStorageValue(key: string, value: string) {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // The request can continue for this visit even if persistence is unavailable.
  }
}

function removeStorageValue(key: string) {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Best-effort cleanup only.
  }
}

function canUseLocalStorage() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return Boolean(window.localStorage);
  } catch {
    return false;
  }
}
