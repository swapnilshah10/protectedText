import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
          {/* Any global CSS or head elements can be added here */}
        </Head>
        <body>
          <Main />
          <NextScript />
          <script>
            {
              // Immediately invoked function expression (IIFE)
              `
              (function() {
                const theme = localStorage.getItem('theme');
                if (theme === 'dark') {
                  document.body.classList.add('dark-mode');
                }
              })();
              `
            }
          </script>
        </body>
      </Html>
    );
  }
}

export default MyDocument;
