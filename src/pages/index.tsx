import Head from 'next/head';
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const [noteName, setNoteName] = useState('');
  const router = useRouter();

  const handleNoteNameChange = (event) => {
    setNoteName(event.target.value);
  };

  const handleGoToNote = () => {
    if (noteName) {
      router.push(`/${noteName}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <Head>
        <title>Secure Note Taking App</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <nav className="bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <a href="/" className="text-white font-semibold text-lg">Secure Notes</a>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <h1 className="text-4xl font-bold text-gray-200">
          Welcome to Secure Note Taking App!
        </h1>

        <p className="mt-3 text-2xl text-gray-300">
          Your privacy is our priority.
        </p>

        <div className="mt-6">
          <p className="text-lg text-gray-400">
            This is a secure note-taking application that allows you to create
            and store notes with end-to-end encryption. Your notes are
            protected with a password, ensuring that only you can access them.
          </p>
          <p className="mt-4 text-lg text-gray-400">
            Simply create a note by entering a unique name below, set a
            password, and start typing. Your note will be automatically saved
            and encrypted.
          </p>
        </div>

        <div className="mt-10 flex">
          <input
            type="text"
            placeholder="Enter note name"
            value={noteName}
            onChange={handleNoteNameChange}
            className="px-4 py-2 border rounded mr-2 text-gray-200 bg-gray-700 border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleGoToNote}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Go to Note
          </button>
        </div>
      </main>

      <footer className="flex items-center justify-center w-full h-24 border-t">
        <a
          className="flex items-center justify-center"
          href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          Powered by{' '}
          <img src="/vercel.svg" alt="Vercel Logo" className="h-4 ml-2" />
        </a>
      </footer>
    </div>
  );
}
