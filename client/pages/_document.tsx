import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en" style={{ scrollBehavior: 'smooth' }}>
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />

        <script src="https://sdk.scdn.co/spotify-player.js"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.onSpotifyWebPlaybackSDKReady = () => {
                window.Spotify = Spotify;
              }
            `,
          }}
        />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
