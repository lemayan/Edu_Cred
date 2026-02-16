import Tesseract from 'tesseract.js';
import CryptoJS from 'crypto-js';

/**
 * Extract text from an image file using Tesseract.js OCR.
 * Runs entirely in the browser — nothing is uploaded.
 *
 * @param {File} file - Image file (PNG, JPG, WEBP)
 * @param {(progress: { status: string, progress: number }) => void} [onProgress] - Optional progress callback
 * @returns {Promise<string>} Raw extracted text
 */
export async function extractDocumentText(file, onProgress) {
    if (!file) throw new Error('No file provided');

    // Only process image files
    const imageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!imageTypes.includes(file.type)) {
        throw new Error('OCR only supports image files (PNG, JPG, WEBP). For PDFs, use the File Hash tab.');
    }

    // Convert file to object URL for Tesseract
    const imageUrl = URL.createObjectURL(file);

    try {
        const result = await Tesseract.recognize(imageUrl, 'eng', {
            logger: (info) => {
                if (onProgress && info.status && typeof info.progress === 'number') {
                    onProgress({
                        status: info.status,
                        progress: Math.round(info.progress * 100),
                    });
                }
            },
        });

        return result.data.text || '';
    } finally {
        URL.revokeObjectURL(imageUrl);
    }
}

/**
 * Normalize text for consistent hashing across different scans of the same document.
 * 
 * Pipeline:
 *   1. Convert to lowercase
 *   2. Replace all whitespace sequences (spaces, newlines, tabs) with a single space
 *   3. Remove non-alphanumeric characters (except spaces)
 *   4. Trim leading/trailing whitespace
 *
 * @param {string} text - Raw OCR text
 * @returns {string} Normalized text
 */
export function normalizeText(text) {
    return text
        .toLowerCase()
        .replace(/\s+/g, ' ')       // collapse all whitespace
        .replace(/[^a-z0-9 ]/g, '') // strip special chars
        .trim();
}

/**
 * Hash normalized document text with SHA-256.
 * 
 * @param {string} rawText - Raw OCR text (will be normalized first)
 * @returns {string} Hex-encoded SHA-256 hash of normalized text
 */
export function hashDocumentText(rawText) {
    const normalized = normalizeText(rawText);
    if (!normalized) throw new Error('No text content to hash — document may be blank or unreadable');
    return CryptoJS.SHA256(normalized).toString(CryptoJS.enc.Hex);
}
