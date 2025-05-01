import { useRouter } from 'next/router';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';

// --- Configuration ---
const SALT_LENGTH = 16; // bytes
const IV_LENGTH = 12; // bytes - Recommended for AES-GCM
const KEY_LENGTH = 256; // bits for AES-256
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_HASH = 'SHA-512'; // Hash algorithm for PBKDF2
const ENCRYPTION_ALGORITHM = 'AES-GCM';

// --- Helper Functions (Web Crypto API) ---

// Convert ArrayBuffer to Hex String
const bufferToHex = (buffer: ArrayBuffer): string => {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// Convert Hex String to ArrayBuffer
const hexToBuffer = (hexString: string): ArrayBuffer => {
  const bytes = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
  }
  return bytes.buffer;
};

// Generate random bytes (for salt and IV)
const generateRandomBytes = (length: number): Uint8Array => {
  if (typeof window !== 'undefined' && typeof window.crypto !== 'undefined') {
    return window.crypto.getRandomValues(new Uint8Array(length));
  } else {
    throw new Error("window.crypto is not available");
  }
};

// Derive key from password and salt using PBKDF2
const deriveKey = async (
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> => {
  try {
    const passwordBuffer = new TextEncoder().encode(password);
    const baseKey = await window.crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: PBKDF2_ITERATIONS,
        hash: PBKDF2_HASH,
      },
      baseKey,
      { name: ENCRYPTION_ALGORITHM, length: KEY_LENGTH },
      true,
      ['encrypt', 'decrypt']
    );
  } catch (error) {
    console.error('Web Crypto API Derive Key failed:', error);
    throw error;
  }
};

// Encrypt text using AES-GCM
const encrypt = async (
  text: string,
  password: string
): Promise<{ encryptedData: string; salt: string; iv: string; tag: string } | null> => {
  try {
    const salt = generateRandomBytes(SALT_LENGTH);
    const iv = generateRandomBytes(IV_LENGTH);
    const key = await deriveKey(password, salt);
    const textEncoder = new TextEncoder();
    const encodedText = textEncoder.encode(text);

    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: ENCRYPTION_ALGORITHM,
        iv: iv,
      },
      key,
      encodedText
    );

    const tagLengthBytes = 16;
    const cipherTextBuffer = encryptedBuffer.slice(0, encryptedBuffer.byteLength - tagLengthBytes);
    const tagBuffer = encryptedBuffer.slice(encryptedBuffer.byteLength - tagLengthBytes);

    return {
      encryptedData: bufferToHex(cipherTextBuffer),
      salt: bufferToHex(salt),
      iv: bufferToHex(iv),
      tag: bufferToHex(tagBuffer),
    };
  } catch (error) {
    console.error('Web Crypto API Encryption failed:', error);
    return null;
  }
};

// Decrypt text using AES-GCM
const decrypt = async (
  encryptedHex: string,
  password: string,
  saltHex: string,
  ivHex: string,
  tagHex: string
): Promise<string | null> => {
  try {
    const salt = new Uint8Array(hexToBuffer(saltHex));
    const iv = new Uint8Array(hexToBuffer(ivHex));
    const tag = hexToBuffer(tagHex);
    const encryptedData = hexToBuffer(encryptedHex);
    const key = await deriveKey(password, salt);

    const combinedBuffer = new Uint8Array(encryptedData.byteLength + tag.byteLength);
    combinedBuffer.set(new Uint8Array(encryptedData), 0);
    combinedBuffer.set(new Uint8Array(tag), encryptedData.byteLength);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: ENCRYPTION_ALGORITHM,
        iv: iv,
      },
      key,
      combinedBuffer.buffer
    );

    const textDecoder = new TextDecoder();
    return textDecoder.decode(decryptedBuffer);
  } catch (error) {
    console.error('Web Crypto API Decryption failed:', error);
    return null;
  }
};

const NotePage: React.FC = () => {
  const router = useRouter();
  const { noteName: noteNameQuery } = router.query;
  const noteName = Array.isArray(noteNameQuery) ? noteNameQuery[0] : noteNameQuery;

  const [noteContent, setNoteContent] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [noteExists, setNoteExists] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [isDecrypted, setIsDecrypted] = useState(false);

  const isMountedRef = useRef(true);
  const fetchedNoteDataRef = useRef<any>(null);

  const fetchNote = useCallback(async () => {
    if (!noteName) return;
    setIsLoading(true);
    setErrorMessage(null);
    setNoteExists(null);
    setShowPasswordPrompt(false);
    setIsDecrypted(false);
    fetchedNoteDataRef.current = null;

    try {
      const response = await fetch(`/api/note/${encodeURIComponent(noteName)}`);
      if (response.ok) {
        const data = await response.json();
        fetchedNoteDataRef.current = data.note;
        setNoteExists(true);
        setShowPasswordPrompt(true);
      } else if (response.status === 404) {
        setNoteExists(false);
        setShowPasswordPrompt(true);
      } else {
        const data = await response.json();
        setErrorMessage(data.message || 'Failed to load note status.');
        console.error('Error loading note status:', data.message);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setErrorMessage('An error occurred while checking the note.');
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [noteName]);

  useEffect(() => {
    isMountedRef.current = true;
    if (noteName) {
      fetchNote();
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [noteName, fetchNote]);

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!password || !noteName) return;

    setIsLoading(true);
    setErrorMessage(null);

    if (noteExists === false) {
      setShowPasswordPrompt(false);
      setIsDecrypted(true);
      setNoteContent('');
      setIsLoading(false);
      return;
    }

    if (noteExists === true && fetchedNoteDataRef.current) {
      const { encryptedData, salt, iv, tag } = fetchedNoteDataRef.current;
      if (!encryptedData || !salt || !iv || !tag) {
        setErrorMessage('Incomplete note data fetched from server.');
        setIsLoading(false);
        return;
      }

      try {
        const decryptedContent = await decrypt(encryptedData, password, salt, iv, tag);

        if (decryptedContent !== null) {
          if (isMountedRef.current) {
            setNoteContent(decryptedContent);
            setIsDecrypted(true);
            setShowPasswordPrompt(false);
            setErrorMessage(null);
          }
        } else {
          setErrorMessage('Decryption failed. Incorrect password?');
          setPassword('');
        }
      } catch (error: any) {
        console.error('Decryption Submit error:', error);
        setErrorMessage(error.message || 'An error occurred during decryption.');
        setPassword('');
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    } else {
      setErrorMessage('Cannot decrypt, note status is unclear.');
      setIsLoading(false);
    }
  };

  const saveNote = useCallback(async () => {
    if (!isDecrypted || !noteName || !password) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const encryptedPayload = await encrypt(noteContent, password);

      if (!encryptedPayload) {
        throw new Error('Client-side encryption failed before saving.');
      }

      const response = await fetch(`/api/note/${encodeURIComponent(noteName)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(encryptedPayload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to save note to server.');
      }
    } catch (error: any) {
      console.error('Save error:', error);
      if (isMountedRef.current) {
        setErrorMessage(error.message || 'An error occurred during saving.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [noteName, noteContent, password, isDecrypted]);

  const handleContentChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isDecrypted) {
      setNoteContent(event.target.value);
    }
  };

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto bg-gray-900">
      <Head>
        <title>Secure Note Taking App</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <h1 className="text-2xl font-bold text-gray-200 mb-4">Note: {noteName}</h1>

      {errorMessage && <div className="text-red-500 mb-4">Error: {errorMessage}</div>}

      {showPasswordPrompt && (
        <form onSubmit={handlePasswordSubmit} className="mb-4">
          <h2 className="text-lg font-semibold text-gray-300">{noteExists ? 'Enter Password to Decrypt' : 'Set Password for New Note'}</h2>
          <input
            type="password"
            value={password}
            onChange={handlePasswordChange}
            placeholder="Enter password"
            required
            className="mr-2 px-3 py-2 border rounded text-gray-200 bg-gray-700 border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
            autoFocus
          />
          <button
            type="submit"
            disabled={isLoading || !password}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            {isLoading ? 'Processing...' : (noteExists ? 'Decrypt' : 'Set Password & Open')}
          </button>
        </form>
      )}

      {isDecrypted && (
        <div>
          <textarea
            value={noteContent}
            onChange={handleContentChange}
            placeholder="Start typing your note..."
            rows={15}
            className="w-full px-3 py-2 border border-gray-300 rounded text-gray-200 bg-gray-700 border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSaving || isLoading || showPasswordPrompt}
          />
          <div className="mt-2 text-sm text-gray-400 flex items-center justify-between">
            {isSaving ? <span className="text-blue-500">Saving...</span> : <span>&nbsp;</span>}
            <button
              onClick={saveNote}
              disabled={isSaving || isLoading}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {!isLoading && !showPasswordPrompt && !isDecrypted && noteExists === true && (
        <p>
          Decryption failed. Please <button onClick={() => { setShowPasswordPrompt(true); setPassword(''); setErrorMessage(null); }} className="text-blue-500 hover:text-blue-700">try the password</button> again.
        </p>
      )}
    </div>
  );
};

export default NotePage;
