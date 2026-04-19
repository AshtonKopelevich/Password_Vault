/**
 * Cryptographic utilities for Password Vault
 * Handles PBKDF2 key derivation and encoding/decoding
 */

/**
 * Convert an ArrayBuffer to a hex string
 * @param buffer - The buffer to convert
 * @returns Hex-encoded string (lowercase)
 */
export function bufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

/**
 * Convert a hex string to a Uint8Array
 * @param hex - Hex-encoded string (lowercase or uppercase)
 * @returns Uint8Array
 */
export function hexToBuffer(hex: string): Uint8Array {
    if (hex.length % 2 !== 0) {
        throw new Error("Invalid hex string: odd length");
    }
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
}

/**
 * Generate a cryptographically random 16-byte salt
 * @returns 16-byte salt as Uint8Array
 */
export function generateRandomSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Derive master keys (authKey + encryptionKey) from password and salt using PBKDF2
 *
 * @param password - User's master password
 * @param salt - Cryptographic salt (Uint8Array, 16 bytes)
 * @returns Object with authKey (32 bytes) and encryptionKey (32 bytes)
 *
 * Security notes:
 * - authKey: Sent to backend as-is (backend hashes with bcrypt)
 * - encryptionKey: Never leaves browser, used to encrypt vault entries
 * - PBKDF2 iterations: 600000 for high security (frontend), 100000 acceptable (legacy login)
 */
export async function deriveMasterKeys(
    password: string,
    salt: Uint8Array,
    iterations: number = 600000
): Promise<{ authKey: ArrayBuffer; encryptionKey: ArrayBuffer }> {
    // Import the raw password as a PBKDF2 key material
    const rawKey = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveBits"]
    );

    // Derive 512 bits (64 bytes) using PBKDF2
    const bits = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: iterations,
            hash: "SHA-256",
        },
        rawKey,
        512
    );

    return {
        authKey: bits.slice(0, 32),    // First 32 bytes: sent to backend (hashed with bcrypt)
        encryptionKey: bits.slice(32), // Last 32 bytes: used locally to encrypt vault entries
    };
}

/**
 * Derive encryption key only from password and salt (used for re-encryption)
 * @param password - User's master password
 * @param salt - Cryptographic salt (Uint8Array, 16 bytes)
 * @returns Encryption key (32 bytes)
 */
export async function deriveEncryptionKeyOnly(
    password: string,
    salt: Uint8Array,
    iterations: number = 600000
): Promise<ArrayBuffer> {
    const { encryptionKey } = await deriveMasterKeys(password, salt, iterations);
    return encryptionKey;
}
