/**
 * Simple encryption wrapper for PIN storage.
 * Uses Web Crypto API (AES-GCM) with a device-derived key.
 * Data never leaves the device — stored only in localStorage.
 * 
 * Note: This is not military-grade security. The goal is
 * to prevent casual reading of PINs from browser storage.
 * It protects against someone who borrows your laptop,
 * not against a determined attacker with full device access.
 */
const Encryption = (() => {
  const STORAGE_KEY = 'freeze_pin_salt';
  
  /**
   * Generate or retrieve a salt for key derivation.
   * The salt is stored in localStorage but used only to
   * derive the encryption key — it's not the key itself.
   */
  async function getSalt() {
    let salt = localStorage.getItem(STORAGE_KEY);
    if (!salt) {
      const saltBytes = crypto.getRandomValues(new Uint8Array(16));
      salt = btoa(String.fromCharCode(...saltBytes));
      localStorage.setItem(STORAGE_KEY, salt);
    }
    return atob(salt);
  }
  
  /**
   * Derive an encryption key from the salt + a constant purpose string.
   */
  async function deriveKey(salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(salt + 'credit-freeze-guide-pin-protection-v1'),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: enc.encode(salt),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }
  
  /**
   * Encrypt a string value.
   * @param {string} plaintext - The value to encrypt
   * @returns {Promise<string>} Base64-encoded ciphertext with IV prepended
   */
  async function encrypt(plaintext) {
    if (!plaintext) return '';
    const salt = await getSalt();
    const key = await deriveKey(salt);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(plaintext)
    );
    
    // Combine IV + ciphertext for storage
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  }
  
  /**
   * Decrypt a base64-encoded value.
   * @param {string} ciphertext - Base64-encoded ciphertext with IV prepended
   * @returns {Promise<string>} Decrypted plaintext
   */
  async function decrypt(ciphertext) {
    if (!ciphertext) return '';
    const salt = await getSalt();
    const key = await deriveKey(salt);
    
    const combined = new Uint8Array(
      atob(ciphertext).split('').map(c => c.charCodeAt(0))
    );
    
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    return new TextDecoder().decode(decrypted);
  }
  
  /**
   * Save an encrypted PIN.
   * @param {string} bureau - Bureau name: 'equifax', 'experian', or 'transunion'
   * @param {string} pin - The PIN value to encrypt and save
   */
  async function savePin(bureau, pin) {
    if (!bureau || !pin) return false;
    try {
      const encrypted = await encrypt(pin);
      localStorage.setItem(`pin_${bureau}`, encrypted);
      return true;
    } catch (e) {
      console.error('Failed to save PIN:', e);
      return false;
    }
  }
  
  /**
   * Retrieve a decrypted PIN.
   * @param {string} bureau - Bureau name
   * @returns {Promise<string>} The decrypted PIN, or empty string if not found
   */
  async function getPin(bureau) {
    try {
      const encrypted = localStorage.getItem(`pin_${bureau}`);
      if (!encrypted) return '';
      return await decrypt(encrypted);
    } catch (e) {
      console.error('Failed to retrieve PIN:', e);
      return '';
    }
  }
  
  /**
   * Delete a saved PIN.
   * @param {string} bureau - Bureau name
   */
  function deletePin(bureau) {
    localStorage.removeItem(`pin_${bureau}`);
  }
  
  /**
   * Check if a PIN is saved for a bureau.
   * @param {string} bureau - Bureau name
   * @returns {Promise<boolean>}
   */
  async function hasPin(bureau) {
    return localStorage.getItem(`pin_${bureau}`) !== null;
  }
  
  return {
    encrypt,
    decrypt,
    savePin,
    getPin,
    deletePin,
    hasPin
  };
})();
