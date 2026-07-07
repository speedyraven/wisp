import sodium from "libsodium-wrappers";

const readyPromise = sodium.ready;

async function ensureReady() {
  await readyPromise;
  return sodium;
}

export async function generateKeyPair() {
  const s = await ensureReady();
  const keyPair = s.crypto_box_keypair();
  return {
    publicKey: s.to_base64(keyPair.publicKey),
    privateKey: s.to_base64(keyPair.privateKey),
  };
}

export async function encryptText(plainText, otherPublicKeyB64, myPrivateKeyB64) {
  const s = await ensureReady();
  const nonce = s.randombytes_buf(s.crypto_box_NONCEBYTES);
  const message = s.from_string(plainText);
  const otherPublicKey = s.from_base64(otherPublicKeyB64);
  const myPrivateKey = s.from_base64(myPrivateKeyB64);
  const ciphertext = s.crypto_box_easy(message, nonce, otherPublicKey, myPrivateKey);
  return {
    ciphertext: s.to_base64(ciphertext),
    nonce: s.to_base64(nonce),
  };
}

export async function decryptText(ciphertextB64, nonceB64, otherPublicKeyB64, myPrivateKeyB64) {
  const s = await ensureReady();
  const ciphertext = s.from_base64(ciphertextB64);
  const nonce = s.from_base64(nonceB64);
  const otherPublicKey = s.from_base64(otherPublicKeyB64);
  const myPrivateKey = s.from_base64(myPrivateKeyB64);
  const decrypted = s.crypto_box_open_easy(ciphertext, nonce, otherPublicKey, myPrivateKey);
  return s.to_string(decrypted);
}

export function getStoredPrivateKey(uid) {
  return localStorage.getItem(`wisp_sk_${uid}`);
}

export function storePrivateKey(uid, privateKeyB64) {
  localStorage.setItem(`wisp_sk_${uid}`, privateKeyB64);
}