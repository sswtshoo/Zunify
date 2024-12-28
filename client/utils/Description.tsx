import React from 'react';

interface SpotifyDescriptionProps {
  description?: string;
}

const SpotifyDescription = ({ description }: SpotifyDescriptionProps) => {
  if (!description) return null;

  const parseDescription = (text: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    const children = Array.from(doc.body.childNodes);

    return children.map((node, index) => {
      if (node.nodeName === 'A') {
        const anchor = node as HTMLAnchorElement;
        const uri = anchor.href;
        const content = anchor.textContent || '';

        return (
          <span key={index} className="text-neutral-400">
            {content}
          </span>
        );
      }
      return <span key={index}>{node.textContent}</span>;
    });
  };

  return (
    <div className="text-base font-medium text-neutral-400">
      {parseDescription(description)}
    </div>
  );
};

export default SpotifyDescription;
