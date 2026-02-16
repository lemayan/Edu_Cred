import CryptoJS from 'crypto-js';

/**
 * Reads a File object and returns its SHA-256 hash as a hex string.
 * All hashing happens entirely in the browser — nothing is uploaded.
 *
 * @param {File} file - The file to hash (PDF, image, etc.)
 * @returns {Promise<string>} Hex-encoded SHA-256 digest
 */
export function hashFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided'));
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const wordArray = CryptoJS.lib.WordArray.create(event.target.result);
        const hash = CryptoJS.SHA256(wordArray).toString(CryptoJS.enc.Hex);
        resolve(hash);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
}
