const IV_LENGTH = 12,
  algorithm = 'AES-GCM';
let importedKey: null | CryptoKey = null;

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

const base64ToArrayBuffer = (base64: string) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

const importSecretKey = async (secret: string) => {
  if (importedKey) {
    return importedKey;
  }
  const rawKey = new TextEncoder().encode(secret);

  importedKey = await window.crypto.subtle.importKey(
    'raw',
    rawKey,
    algorithm,
    true,
    ['encrypt', 'decrypt'],
  );

  return importedKey;
};

const encryptMessage = async (secret: string, message: string) => {
  const key = await importSecretKey(secret);
  const encoded = new TextEncoder().encode(message);

  // Generate a new IV for each encryption to ensure security
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const cipherText = await window.crypto.subtle.encrypt(
    { name: algorithm, iv: iv },
    key,
    encoded,
  );

  const ivEncoded = arrayBufferToBase64(iv);
  const cipherTextDecode = arrayBufferToBase64(cipherText);

  return ivEncoded + ':' + cipherTextDecode;
};

const decryptMessage = async (secret: string, cipherData: string) => {
  const key = await importSecretKey(secret);
  const data = cipherData.split(':');

  const iv = base64ToArrayBuffer(data[0]);
  const cipherText = base64ToArrayBuffer(data[1]);

  const textData = await window.crypto.subtle.decrypt(
    { name: algorithm, iv },
    key,
    cipherText,
  );

  return new TextDecoder().decode(textData);
};

export { importSecretKey, encryptMessage, decryptMessage };
