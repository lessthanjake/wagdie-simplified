import type { Metadata } from 'next';
import Image from 'next/image';

import { LowPolyVideoExperience } from '@/components/videos/LowPolyVideoExperience';
import { BannerHeader } from '@/components/shared/BannerHeader';
import {
  getLowPolyYoutubeUrl,
  LOW_POLY_ASSETS,
  LOW_POLY_EPISODES,
} from '@/lib/content/lowPolyEpisodes';

export const metadata: Metadata = {
  title: 'Low Poly Videos | WAGDIE',
  description: 'Watch the WAGDIE low poly YouTube episode series.',
};

export default function LowPolyVideosPage() {
  return (
    <div className="min-h-screen bg-soul-950">
      <BannerHeader
        title="Low Poly Videos"
        subtitle="Enter the WAGDIE low poly series hub: choose an episode, open the theater, and watch the chronicle unfold."
      />

      <section className="relative overflow-hidden border-b border-neutral-800 bg-black">
        <div className="relative h-[240px] md:h-[360px] lg:h-[440px]">
          <Image
            src={LOW_POLY_ASSETS.heroBanner}
            alt="WAGDIE low poly animated series hero artwork"
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-soul-950 via-soul-950/30 to-black/20" />
          <div className="absolute inset-x-0 bottom-0">
            <div className="container mx-auto max-w-6xl px-4 pb-8 md:pb-10">
              <div className="max-w-2xl rounded-lg border border-neutral-800 bg-black/55 p-5 shadow-2xl backdrop-blur-sm md:p-6">
                <p className="font-eskapade text-xs uppercase tracking-[0.28em] text-soul-accent/80">
                  Ten transmissions
                </p>
                <h2 className="mt-2 font-display text-3xl lowercase text-neutral-100 md:text-5xl">
                  the low poly chronicle
                </h2>
                <p className="mt-3 font-eskapade text-sm leading-relaxed text-neutral-400 md:text-base">
                  A focused theater for the WAGDIE Low Poly episodes. Pick a chapter, then load a single privacy-friendly YouTube player when you are ready to watch.
                </p>
                <a
                  href="#low-poly-theater"
                  className="mt-5 inline-flex border border-soul-accent/40 bg-soul-900 px-5 py-2 font-eskapade text-sm text-soul-accent transition-all hover:border-soul-accent hover:bg-soul-accent/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-soul-accent focus-visible:ring-offset-2 focus-visible:ring-offset-soul-950"
                >
                  Enter the theater
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto max-w-6xl px-4 py-10 md:py-14">
        <LowPolyVideoExperience episodes={LOW_POLY_EPISODES} />

        <noscript>
          <section className="mt-10 rounded-lg border border-neutral-800 bg-black/40 p-6 shadow-2xl">
            <h2 className="font-display text-2xl lowercase text-neutral-100">Direct episode links</h2>
            <p className="mt-2 font-eskapade text-sm text-neutral-500">
              JavaScript is disabled, so use these direct YouTube links to watch the Low Poly episodes.
            </p>
            <ul className="mt-5 grid gap-3 font-eskapade text-sm md:grid-cols-2">
              {LOW_POLY_EPISODES.map((episode) => (
                <li key={episode.id}>
                  <a
                    href={getLowPolyYoutubeUrl(episode.youtubeId)}
                    className="text-soul-accent transition-colors hover:text-neutral-100"
                  >
                    {episode.label}: {episode.title}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </noscript>
      </main>
    </div>
  );
}
