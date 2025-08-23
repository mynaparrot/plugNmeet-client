const IV_LENGTH = 12,
  algorithm = 'AES-GCM';
let importedKey: null | CryptoKey = null;

export const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

const base64ToArrayBuffer = (base64: string) => {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

/**
 * Derives a key from a user-provided secret (e.g., a password) by hashing it,
 * then imports it for use in encryption/decryption.
 * @param secret The user-provided secret string.
 */
const importSecretKeyFromPlainText = async (secret: string) => {
  if (importedKey) {
    return;
  }
  // Use SHA-256 to derive a 256-bit key from the secret string.
  // This ensures the key is always the correct length for AES-GCM.
  const keyMaterial = await window.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(secret),
  );
  importedKey = await window.crypto.subtle.importKey(
    'raw',
    keyMaterial,
    algorithm,
    false, // Make the key non-extractable for better security
    ['encrypt', 'decrypt'],
  );
};

/**
 * Imports a pre-existing, Base64-encoded cryptographic key.
 * This function does NOT hash the input; it assumes the input is the raw key material.
 * @param secretKeyBase64 The Base64-encoded 256-bit (32-byte) key.
 */
export const importSecretKeyFromMaterial = async (secretKeyBase64: string) => {
  if (importedKey) {
    return;
  }
  const keyMaterial = base64ToArrayBuffer(secretKeyBase64);
  if (keyMaterial.byteLength !== 32) {
    throw new Error(
      `Invalid key length. Expected 32 bytes for AES-256, but got ${keyMaterial.byteLength}`,
    );
  }
  importedKey = await window.crypto.subtle.importKey(
    'raw',
    keyMaterial,
    algorithm,
    false, // Make the key non-extractable for better security
    ['encrypt', 'decrypt'],
  );
};

const encryptMessage = async (message: string) => {
  if (!importedKey) {
    return message;
  }
  const encoded = new TextEncoder().encode(message);
  // Generate a new IV for each encryption to ensure security
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const cipherText = await window.crypto.subtle.encrypt(
    { name: algorithm, iv: iv },
    importedKey,
    encoded,
  );

  const arrayView = new Uint8Array(iv.byteLength + cipherText.byteLength);
  arrayView.set(iv);
  arrayView.set(new Uint8Array(cipherText), iv.byteLength);

  return arrayBufferToBase64(arrayView.buffer);
};

const decryptMessage = async (cipherData: string) => {
  if (!importedKey) {
    return cipherData;
  }
  const data = base64ToArrayBuffer(cipherData);
  const iv = data.slice(0, IV_LENGTH);
  const cipherText = data.slice(IV_LENGTH);

  const textData = await window.crypto.subtle.decrypt(
    { name: algorithm, iv },
    importedKey,
    cipherText,
  );

  return new TextDecoder().decode(textData);
};

export { importSecretKeyFromPlainText, encryptMessage, decryptMessage };
