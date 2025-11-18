/**
 * Footer Component
 *
 * Site footer with external links to community resources and copyright information.
 * Uses environment variables for configurable URLs.
 */

import React from 'react';
import Image from 'next/image';

export function Footer() {
  const externalLinks = [
    {
      label: 'Discord',
      url: process.env.NEXT_PUBLIC_DISCORD_URL || 'https://discord.gg/wagdie',
      imgSrc: '/images/cta-discord.png',
    },
    {
      label: 'OpenSea',
      url: process.env.NEXT_PUBLIC_OPENSEA_URL || 'https://opensea.io/collection/wagdie',
      imgSrc: '/images/wagdie.png',
    },
    {
      label: 'Twitter',
      url: process.env.NEXT_PUBLIC_TWITTER_URL || 'https://twitter.com/WAGDIE_ETH',
      imgSrc: '/images/cta-characters.png',
    },
  ];

  return (
    <footer className="bg-shadow border-t border-midnight mt-auto">
      <div className="container mx-auto px-4 py-8">
        {/* External Links */}
        <div className="flex justify-center gap-8 flex-wrap">
          {externalLinks.map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-ash hover:text-bone transition-colors duration-200 min-h-[44px]"
            >
              <Image src={link.imgSrc} alt={link.label} width={24} height={24} className="mr-2" />
              {link.label}
            </a>
          ))}
        </div>

        {/* Copyright and Description */}
        <p className="text-center text-mist text-sm mt-4">
          © 2025 WAGDIE. Community-driven fantasy NFT project.
        </p>
      </div>
    </footer>
  );
}
