export type LowPolyEpisode = {
  id: `ep-${number}`;
  episode: number;
  label: string;
  title: string;
  summary: string;
  youtubeId: string;
  thumbnailSrc: string;
};

export const LOW_POLY_ASSETS = {
  heroBanner: '/images/low-poly/low-poly-hero-banner.png',
  mapBanner: '/images/low-poly/low-poly-map-banner.png',
  logo: '/images/low-poly/low-poly-logo.webp',
};

const makeEpisode = (episode: number, youtubeId: string): LowPolyEpisode => ({
  id: `ep-${episode}`,
  episode,
  label: `EP${episode}`,
  title: `Low Poly Episode ${episode}`,
  summary: 'A transmission from the WAGDIE low poly chronicle.',
  youtubeId,
  thumbnailSrc: `/images/low-poly/thumbnails/ep-${String(episode).padStart(2, '0')}.svg`,
});

export const LOW_POLY_EPISODES: LowPolyEpisode[] = [
  makeEpisode(1, 'aWFCfmaZw8Q'),
  makeEpisode(2, 'wmA1nplP03c'),
  makeEpisode(3, 'CxKhLK9Hsxs'),
  makeEpisode(4, 'eGeLPMuUnFs'),
  makeEpisode(5, 'V6u74ijg9BM'),
  makeEpisode(6, 'rNUmrU7lStA'),
  makeEpisode(7, 'lB1em8oVTfg'),
  makeEpisode(8, 'uPB-6Pg0rnU'),
  makeEpisode(9, '0y8Numq4lBc'),
  makeEpisode(10, '7PuMsN5WLHk'),
];

export function getLowPolyEpisodeById(id: string) {
  return LOW_POLY_EPISODES.find((episode) => episode.id === id);
}

export function getLowPolyYoutubeUrl(youtubeId: string) {
  return `https://youtu.be/${youtubeId}`;
}

export function getLowPolyEmbedUrl(youtubeId: string, autoplay = false) {
  const params = new URLSearchParams({ rel: '0' });

  if (autoplay) {
    params.set('autoplay', '1');
  }

  return `https://www.youtube-nocookie.com/embed/${youtubeId}?${params.toString()}`;
}
