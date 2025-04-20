const noteIdInput = document.getElementById('noteId');
const passwordInput = document.getElementById('password');
const noteContentTextArea = document.getElementById('noteContent');
const noteSelectorDiv = document.getElementById('note-selector');
const noteEditorDiv = document.getElementById('note-editor');
const statusSpan = document.getElementById('status');

let currentNoteId = null;

function setStatus(message, isError = false) {
    statusSpan.textContent = message;
    statusSpan.style.color = isError ? 'red' : 'gray';
    console.log(message);
}

function clearStatus() {
    statusSpan.textContent = '';
}

async function loadOrCreateNote() {
    const noteId = noteIdInput.value.trim();
    if (!noteId) {
        alert('Please enter a note name.');
        return;
    }
    currentNoteId = noteId;
    noteSelectorDiv.style.display = 'none';
    noteEditorDiv.style.display = 'block';
    noteContentTextArea.value = '';
    passwordInput.value = '';
    passwordInput.focus();
    setStatus(`Enter password to load or create note: ${noteId}`);

    // Try to load the note immediately
    try {
        setStatus(`Checking for existing note: ${noteId}...`);
        const response = await fetch(`${API_BASE_URL}/${currentNoteId}`);
        if (response.ok) {
            setStatus(`Note '${noteId}' exists. Enter password to decrypt.`);
            // The user will need to enter the password and click Save/Load manually for decryption
        } else if (response.status === 404) {
            setStatus(`Note '${noteId}' not found. Creating an empty note...`);
            // Create an empty note on the server
            const emptyNoteData = {
                salt: '',
                iv: '',
                ciphertext: '',
                tag: ''
            };
            // const createResponse = await fetch(`${API_BASE_URL}/${currentNoteId}`, {
            //     method: 'PUT',
            //     headers: {
            //         'Content-Type': 'application/json'
            //     },
            //     body: JSON.stringify(emptyNoteData)
            // });

            const createResponse = await fetch(`${API_BASE_URL.replace('notes', 'test' )}/${currentNoteId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(emptyNoteData)
            });

            if (createResponse.ok) {
                setStatus(`Empty note '${noteId}' created. Enter password and text to save.`);
            } else {
                const errorData = await createResponse.json();
                setStatus(`Error creating empty note: ${errorData.error || createResponse.statusText}`, true);
            }

        } else {
            const errorData = await response.json();
            setStatus(`Error checking note: ${errorData.error || response.statusText}`, true);
        }
    } catch (error) {
        setStatus(`Network error checking note: ${error.message}`, true);
    }
}


// --- Crypto Functions ---

const PBKDF2_ITERATIONS = 100000;

// Function to derive key from password and salt
async function deriveKey(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );
    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
}

// Function to encrypt text
async function encryptText(plaintext, password) {
    setStatus('Encrypting...');
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);

    const enc = new TextEncoder();
    const encodedPlaintext = enc.encode(plaintext);

    const ciphertextBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encodedPlaintext
    );

    // ArrayBuffer to Base64
    const ciphertext = btoa(String.fromCharCode.apply(null, new Uint8Array(ciphertextBuffer)));
    const tag = btoa(String.fromCharCode.apply(null, new Uint8Array(ciphertextBuffer.slice(-16)))); // GCM tag is appended
    const actualCiphertext = btoa(String.fromCharCode.apply(null, new Uint8Array(ciphertextBuffer.slice(0,-16))));

    const fullB64 = btoa(
        String.fromCharCode.apply(null, new Uint8Array(ciphertextBuffer))
      );
    setStatus('Encryption complete.');
    return {
        salt: btoa(String.fromCharCode.apply(null, salt)), // Base64 encode salt
        iv: btoa(String.fromCharCode.apply(null, iv)),     // Base64 encode iv
        ciphertext: fullB64,
        tag: tag
    };
}

// Function to decrypt text
async function decryptText(encryptedData, password) {
    setStatus('Decrypting...' );
    try {
        // Base64 to ArrayBuffer
        const salt = Uint8Array.from(atob(encryptedData.salt), c => c.charCodeAt(0));
        const iv = Uint8Array.from(atob(encryptedData.iv), c => c.charCodeAt(0));

        
        const ciphertextWithTag = Uint8Array.from(atob(encryptedData.ciphertext), c => c.charCodeAt(0));

        const key = await deriveKey(password, salt);

        const decryptedBuffer = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            ciphertextWithTag
        );

        const dec = new TextDecoder();
        setStatus('Decryption successful.');
        return dec.decode(decryptedBuffer);
    } catch (error) {
        setStatus('Decryption failed. Incorrect password or corrupted data.', true);
        console.error('Decryption error:', error);
        throw error; // Re-throw to indicate failure
    }
}


// --- API Interaction ---

async function saveNote() {
    const password = passwordInput.value;
    const plaintext = noteContentTextArea.value;

    if (!currentNoteId) {
        setStatus('No note selected.', true);
        return;
    }
    if (!password) {
        setStatus('Password is required to save.', true);
        passwordInput.focus();
        return;
    }

    try {
        const encryptedData = await encryptText(plaintext, password);
        setStatus('Sending data to server...');

        const response = await fetch(`${API_BASE_URL}/${currentNoteId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(encryptedData)
        });

        if (response.ok) {
            setStatus('Note saved successfully!');
        } else {
            const errorData = await response.json();
            setStatus(`Error saving note: ${errorData.error || response.statusText}`, true);
        }
    } catch (error) {
        setStatus(`Error during save: ${error.message}`, true);
    }
}

// Function to attempt loading and decrypting a note
function showNoteContent() {
    document.getElementById("password-section").style.display = "none";
    document.getElementById("note-content-section").style.display = "block";
}

async function loadAndDecryptNote() {
    const password = passwordInput.value;
    if (!currentNoteId) {
        setStatus('No note selected.', true);
        return;
    }
     if (!password) {
        setStatus('Password is required to load.', true);
        passwordInput.focus();
        return;
    }

    setStatus(`Loading note: ${currentNoteId}...`);
    try {
        const response = await fetch(`${API_BASE_URL}/${currentNoteId}`);
        if (response.ok) {
            const encryptedData = await response.json();
            const plaintext = await decryptText(encryptedData, password);
            noteContentTextArea.value = plaintext;
            showNoteContent();
            setStatus(`Note '${currentNoteId}' loaded and decrypted.`);
        } else if (response.status === 404) {
            setStatus(`Note '${currentNoteId}' not found. You can create it by typing and saving.`, true);
             noteContentTextArea.value = ''; // Clear text area if not found
        } else {
            const errorData = await response.json();
            setStatus(`Error loading note: ${errorData.error || response.statusText}`, true);
        }
    } catch (error) {
         // Decrypt error is handled within decryptText
        if (error.message.includes('NetworkError') || error.message.includes('fetch')){
             setStatus(`Network error loading note: ${error.message}`, true);
        }
    }
}

// Modify the password input to trigger decryption on Enter key
passwordInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent default form submission
        loadAndDecryptNote();
    }
});


async function deleteNote() {
    const password = passwordInput.value;

    if (!currentNoteId) {
        setStatus('No note selected.', true);
        return;
    }
     if (!password) {
        setStatus('Password required to verify before deletion.', true);
        passwordInput.focus();
        return;
    }

    // **Crucial**: Verify decryption works before deleting
    setStatus(`Verifying password for deletion of ${currentNoteId}...`);
    try {
        const responseGet = await fetch(`${API_BASE_URL}/${currentNoteId}`);
        if (!responseGet.ok) {
             if (responseGet.status === 404) {
                 setStatus(`Note '${currentNoteId}' doesn't exist. Nothing to delete.`, true);
             } else {
                 const errorData = await responseGet.json();
                setStatus(`Error fetching note for verification: ${errorData.error || responseGet.statusText}`, true);
             }
            return;
        }
        const encryptedData = await responseGet.json();
        await decryptText(encryptedData, password); // This will throw if password is wrong

        // If decryption succeeded, proceed with delete
        if (!confirm(`Are you sure you want to permanently delete note '${currentNoteId}'?`)) {
            setStatus('Deletion cancelled.');
            return;
        }

        setStatus(`Deleting note: ${currentNoteId}...`);
        const responseDelete = await fetch(`${API_BASE_URL}/${currentNoteId}`, {
            method: 'DELETE'
        });

        if (responseDelete.ok) {
            setStatus(`Note '${currentNoteId}' deleted successfully!`);
            noteContentTextArea.value = '';
            passwordInput.value = '';
            noteEditorDiv.style.display = 'none';
            noteSelectorDiv.style.display = 'block';
            noteIdInput.value = '';
            currentNoteId = null;
        } else {
            const errorData = await responseDelete.json();
            setStatus(`Error deleting note: ${errorData.error || responseDelete.statusText}`, true);
        }

    } catch (error) {
        // Decryption failure already handled by setStatus in decryptText
         if (!statusSpan.textContent.includes('Decryption failed')) {
             setStatus(`Error during deletion process: ${error.message}`, true);
         }
    }
}

// Initial state
setStatus('Enter a note name to load or create.');
