# Zero-Knowledge Encrypted Notepad

This project implements a zero-knowledge, client-side encrypted online notepad, similar to ProtectedText.com.

## Project Goals

The primary goals of this project are:

*   **Client-Side Encryption:** All encryption and decryption operations are performed in the user's browser using AES-256. This ensures that sensitive data never leaves the user's device in plaintext.
*   **Zero-Knowledge:** The server stores only encrypted data. It has no access to user passwords or plaintext notes. The password is only used to derive the encryption key on the client side.
*   **Note Lifecycle:** Users can create, load, save, and delete notes using a unique URL path and password. The note's content is encrypted before being stored on the server.
*   **Minimalist UI:** The user interface is simple and consists of a text area and save/delete buttons. The focus is on functionality and security, rather than complex features.

## Features

*   **AES-256 Encryption:** Employs AES-256 in GCM mode for robust encryption.
*   **PBKDF2 Key Derivation:** Uses PBKDF2 with a high iteration count (100000) to derive a strong encryption key from the user-provided password and a randomly generated salt.
*   **Secure Storage:** Stores the salt, initialization vector (IV), ciphertext, and authentication tag (GCM) on the server.
*   **"Load / Create" Button:** Dynamically checks for existing notes and creates a new one if none exists.
*   **Password Protection:** Requires a password to decrypt existing notes.
*   **Save & Delete Functionality:** Allows users to save encrypted notes and securely delete them.
*   **Tailwind CSS Styling:** Implements a modern and responsive design using Tailwind CSS.
*   **Eye Button:** Toggle password visibility for improved user experience.

## Technologies Used

*   **Frontend:** HTML, CSS (Tailwind CSS), JavaScript
*   **Backend:** Django (Python)
*   **Cryptography:** Web Crypto API

## Setup Instructions

1.  **Set up the Django backend:**

    *   **Create a virtual environment:**
        ```bash
        python -m venv .venv
        ```
    *   **Activate the virtual environment:**
        ```bash
        source .venv/bin/activate
        ```
    *   **Install dependencies:**
        ```bash
        pip install -r mysite/requirements.txt
        ```
    *   **Run database migrations:**
        ```bash
        python mysite/manage.py migrate
        ```
    *   **Start the Django development server:**
        ```bash
        python mysite/manage.py runserver
        ```
        or using the provided script:
        ```bash
        ./devserver.sh
        ```
        The server will typically run on `http://localhost:8000/`. The `devserver.sh` script automatically activates the virtual environment and runs the Django development server. The `$PORT` variable used in `devserver.sh` is for cloud environments to specify the port.
2.  **Frontend:**

    *   The frontend (HTML, CSS, JavaScript) is served directly by the Django development server.  No separate setup is required. Access the application through your browser at the address where the Django server is running (e.g., `http://localhost:8000/`).

## Contributing

We welcome contributions to the project! To contribute:

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Implement your changes.
4.  Test your changes thoroughly.
5.  Submit a pull request with a clear description of your changes.
