import React from 'react';

const SpotifyDescription = ({ description }) => {
  if (!description) return null;

  const parseDescription = (text: string) => {
    return text.split(/(<a[^>]*>.*?<\/a>)/).map((part, index) => {
      if (part.startsWith('<a')) {
        const uriMatch = part.match(/href=([^>\s]+)/);
        const textMatch = part.match(/>([^<]+)</);
        const uri = uriMatch ? uriMatch[1] : '';
        const text = textMatch ? textMatch[1] : '';

        return (
          <span
            key={index}
            className="text-neutral-400"
            onClick={() => {
              if (uri.startsWith('spotify:')) {
                console.log('Spotify URI clicked:', uri);
              }
            }}
          >
            {text}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="text-sm font-medium text-neutral-400">
      {parseDescription(description)}
    </div>
  );
};

export default SpotifyDescription;
