import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { HomeCard } from './HomeCard';

const meta: Meta<typeof HomeCard> = {
  component: HomeCard,
  title: 'Components/Home/HomeCard',
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'Card title',
    },
    description: {
      control: 'text',
      description: 'Card description text',
    },
    imageSrc: {
      control: 'text',
      description: 'Image source URL',
    },
    href: {
      control: 'text',
      description: 'Link destination',
    },
    isExternal: {
      control: 'boolean',
      description: 'Whether the link opens in a new tab',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
  },
};

export default meta;
type Story = StoryObj<typeof HomeCard>;

const mockImage = 'data:image/svg+xml,%3Csvg width="600" height="400" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="600" height="400" fill="%23334155"/%3E%3Ctext x="50%25" y="50%25" font-size="32" text-anchor="middle" dy=".3em" fill="%23a3a3a3"%3EImage Placeholder%3C/text%3E%3C/svg%3E';

export const Default: Story = {
  args: {
    title: 'Explore the World Map',
    description: 'Discover characters and locations in the WAGDIE universe',
    imageSrc: mockImage,
    href: '/map',
  },
};

export const ExternalLink: Story = {
  args: {
    title: 'Visit OpenSea',
    description: 'View and trade WAGDIE NFTs on the marketplace',
    imageSrc: mockImage,
    href: 'https://opensea.io/collection/wagdie',
    isExternal: true,
  },
};

export const CustomStyling: Story = {
  args: {
    title: 'Character Gallery',
    description: 'Browse your character collection',
    imageSrc: mockImage,
    href: '/characters',
    className: 'max-w-md',
  },
  name: 'With Custom Styling',
};
