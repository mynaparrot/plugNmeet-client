const IV_LENGTH = 12,
  algorithm = 'AES-GCM';
let importedKey: null | CryptoKey = null;

export const arrayBufferToBase64 = (buffer: ArrayBufferLike) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

const base64ToUint8Array = (base64: string) => {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

/**
 * Derives a key from a user-provided secret (e.g., a password) by hashing it,
 * then imports it for use in encryption/decryption.
 * @param secret The user-provided secret string.
 */
export const importSecretKeyFromPlainText = async (secret: string) => {
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
  const keyMaterial = base64ToUint8Array(secretKeyBase64);
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

/**
 * Encrypts an ArrayBuffer and returns a Uint8Array.
 * @param data The ArrayBuffer to encrypt.
 * @returns A promise that resolves to the encrypted Uint8Array (IV + ciphertext).
 */
export const encryptDataToUint8Array = async (
  data: Uint8Array,
): Promise<Uint8Array> => {
  if (!importedKey) {
    throw new Error('E2EE key is not imported. Cannot encrypt.');
  }
  // Ensure we have a Uint8Array with a standard ArrayBuffer, not a SharedArrayBuffer.
  // This copy is necessary to satisfy the strict typing of the Web Crypto API.
  const dataToEncrypt = new Uint8Array(data);

  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const cipherText = await window.crypto.subtle.encrypt(
    { name: algorithm, iv: iv },
    importedKey,
    dataToEncrypt,
  );
  const result = new Uint8Array(iv.byteLength + cipherText.byteLength);
  result.set(iv);
  result.set(new Uint8Array(cipherText), iv.byteLength);
  return result;
};

export const encryptMessage = async (message: string): Promise<string> => {
  if (!importedKey) {
    return message;
  }
  const encoded = new TextEncoder().encode(message);
  const encrypted = await encryptDataToUint8Array(encoded);
  return arrayBufferToBase64(encrypted.buffer);
};

/**
 * Decrypts a Uint8Array into an ArrayBuffer.
 * @param encryptedData The Uint8Array containing the IV and ciphertext.
 * @returns A promise that resolves to the decrypted ArrayBuffer.
 */
export const decryptDataFromUint8Array = async (
  encryptedData: Uint8Array,
): Promise<Uint8Array> => {
  if (!importedKey) {
    throw new Error('E2EE key is not imported. Cannot decrypt.');
  }
  const iv = encryptedData.slice(0, IV_LENGTH);
  const cipherText = encryptedData.slice(IV_LENGTH);

  const decrypted = await window.crypto.subtle.decrypt(
    { name: algorithm, iv },
    importedKey,
    cipherText,
  );
  return new Uint8Array(decrypted);
};

export const decryptMessage = async (cipherData: string): Promise<string> => {
  if (!importedKey) {
    return cipherData;
  }
  const encryptedBytes = base64ToUint8Array(cipherData);
  const textData = await decryptDataFromUint8Array(encryptedBytes);
  return new TextDecoder().decode(textData);
};
