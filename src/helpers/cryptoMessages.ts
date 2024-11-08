const IV_LENGTH = 12,
  algorithm = 'AES-GCM';
let importedKey: null | CryptoKey = null;

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
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

const importSecretKey = async (secret: string) => {
  if (importedKey) {
    return;
  }
  const rawKey = new TextEncoder().encode(secret);
  importedKey = await window.crypto.subtle.importKey(
    'raw',
    rawKey,
    algorithm,
    true,
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

export { importSecretKey, encryptMessage, decryptMessage };
