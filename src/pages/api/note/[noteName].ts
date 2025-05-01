import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

// IMPORTANT: Ensure this path is correct and writable in your deployment environment.
// Using a temporary directory like /tmp might be necessary in some serverless environments.
const dataDir = path.resolve(process.cwd(), 'data');

// Ensure the data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

type StoredNote = {
  encryptedData: string; // hex encoded (can be empty string "" if original text was empty)
  salt: string;          // hex encoded
  iv: string;            // hex encoded
  tag: string;           // hex encoded (Auth Tag from AES-GCM)
};

type ApiResponseData = {
  message?: string;
  note?: StoredNote;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponseData>
) {
  const { noteName } = req.query;

  if (!noteName || typeof noteName !== 'string' || noteName.includes('..') || noteName.includes('/')) {
    // Basic validation to prevent path traversal
    return res.status(400).json({ message: 'Invalid note name.' });
  }

  // Use encodeURIComponent for filename safety
  const safeNoteName = encodeURIComponent(noteName);
  const filePath = path.join(dataDir, `${safeNoteName}.json`);

  if (req.method === 'GET') {
    // Retrieve note
    try {
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const data: StoredNote = JSON.parse(fileContent);
        // Return the full stored note object
        res.status(200).json({ note: data });
      } else {
        res.status(404).json({ message: 'Note not found.' });
      }
    } catch (error) {
      console.error('Error reading note:', error);
      res.status(500).json({ message: 'Failed to retrieve note.' });
    }
  } else if (req.method === 'POST') {
    // Create or update note
    try {
      const { encryptedData, salt, iv, tag } = req.body;

      // *** UPDATED CHECK ***
      // Allow empty string for encryptedData, but require others to be non-empty strings.
      if (
        encryptedData === undefined ||
        encryptedData === null || // Should not happen with JSON parsing, but safe to check
        typeof encryptedData !== 'string' ||
        !salt || typeof salt !== 'string' ||
        !iv || typeof iv !== 'string' ||
        !tag || typeof tag !== 'string'
      ) {
          return res.status(400).json({ message: 'Invalid request body: missing or invalid salt, iv, tag, or encryptedData.' });
      }

      const dataToStore: StoredNote = { encryptedData, salt, iv, tag };
      fs.writeFileSync(filePath, JSON.stringify(dataToStore), 'utf-8');
      res.status(200).json({ message: 'Note saved successfully.' });
    } catch (error) {
      console.error('Error saving note:', error);
      res.status(500).json({ message: 'Failed to save note.' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
