'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Person, PersonPick, Shop } from '@/lib/types';
import { getMediaUrl } from '@/lib/utils';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useDrawerTransition } from '@/lib/hooks/useDrawerTransition';
import { PersonModal } from '@/components/people/PersonModal';
import { ShopCard } from './ShopCard';
import { ArrowRight, Globe, Instagram } from 'lucide-react';

const getFlagUrl = (countryCode: string): string =>
  `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;

interface CriticsPicksProps {
  people: Person[];
  shops: Shop[];
  onShopSelect: (shop: Shop) => void;
}

interface LocationWithCountry {
  name: string;
  countryName?: string;
  countryCode?: string;
}

interface PersonData {
  person: Person;
  locations: LocationWithCountry[];
  /** Picks sorted by rank */
  sortedPicks: PersonPick[];
}

export function CriticsPicks({ people, shops, onShopSelect }: CriticsPicksProps) {
  const { ref: headingRef, revealed: headingRevealed } = useScrollReveal();
  const { ref: gridRef, revealed: gridRevealed } = useScrollReveal(0.05);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [modalPerson, setModalPerson] = useState<Person | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Build location name → country map from shops data
  const locationCountryMap = useMemo(() => {
    const map = new Map<string, { name: string; code: string }>();
    for (const shop of shops) {
      const loc = shop.location;
      if (loc?.name && loc.country?.name && loc.country?.code) {
        map.set(loc.name, { name: loc.country.name, code: loc.country.code });
      }
    }
    return map;
  }, [shops]);

  const personData = useMemo<PersonData[]>(() => {
    return people
      .filter((p) => (p.person_picks?.length ?? 0) > 0)
      .map((person) => {
        const seen = new Set<string>();
        const locations: LocationWithCountry[] = [];
        for (const loc of person.locations ?? []) {
          if (!loc.name || seen.has(loc.name)) continue;
          seen.add(loc.name);
          const country = locationCountryMap.get(loc.name);
          locations.push({
            name: loc.name,
            countryName: country?.name,
            countryCode: country?.code,
          });
        }

        const sortedPicks = [...(person.person_picks ?? [])].sort((a, b) => {
          const aRank = a.rank ?? 99;
          const bRank = b.rank ?? 99;
          return aRank - bRank;
        });

        return { person, locations, sortedPicks };
      });
  }, [people, locationCountryMap]);

  // Initialize selected person from first item
  const effectiveSelectedId = selectedPersonId ?? personData[0]?.person.documentId ?? null;

  const selectedData = useMemo(() => {
    return personData.find((d) => d.person.documentId === effectiveSelectedId) ?? personData[0] ?? null;
  }, [personData, effectiveSelectedId]);

  // Drawer transition for right panel
  const { displayedItem, isTransitioning } = useDrawerTransition({
    item: selectedData,
    getKey: (d) => d?.person.documentId ?? '',
  });

  // All hooks above — safe to early return now
  if (personData.length === 0 || !displayedItem) return null;

  const handleOpenModal = (person: Person) => {
    setModalPerson(person);
    setModalOpen(true);
  };

  const handleShopSelect = (shop: Shop) => {
    setModalOpen(false);
    setModalPerson(null);
    onShopSelect(shop);
  };

  return (
    <section className="px-6 pt-16 pb-24 md:px-12 md:pt-20 md:pb-32 lg:px-24 lg:pt-28 lg:pb-40 border-t border-border-default bg-contrastBlock">
      <h2
        ref={headingRef}
        className="font-display text-5xl md:text-6xl lg:text-8xl text-contrastText mb-4 md:mb-5"
        style={{
          opacity: headingRevealed ? 1 : 0,
          transform: headingRevealed ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
        }}
      >
        Critics&apos; Picks
      </h2>
      <p
        className="text-contrastText text-base md:text-lg max-w-2xl mb-12 md:mb-16 lg:mb-20"
        style={{
          opacity: headingRevealed ? 0.5 : 0,
          transform: headingRevealed ? 'translateY(0)' : 'translateY(12px)',
          transition: 'opacity 0.8s ease-out 0.15s, transform 0.8s ease-out 0.15s',
        }}
      >
        Coffee experts share their favourite shops and roasters
      </p>

      <div
        ref={gridRef}
        style={{
          opacity: gridRevealed ? 1 : 0,
          transform: gridRevealed ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 0.7s ease-out, transform 0.7s ease-out',
        }}
      >
        {/* Mobile: horizontal scroll chips */}
        <div className="lg:hidden mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
            {personData.map((data) => {
              const isSelected = data.person.documentId === effectiveSelectedId;
              const firstLoc = data.locations[0];
              return (
                <button
                  key={data.person.documentId}
                  onClick={() => setSelectedPersonId(data.person.documentId)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg whitespace-nowrap flex-shrink-0 transition-colors duration-200 border ${
                    isSelected
                      ? 'border-white/20 bg-white/[0.10]'
                      : 'border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06]'
                  }`}
                >
                  {firstLoc?.countryCode && (
                    <img
                      src={getFlagUrl(firstLoc.countryCode)}
                      alt=""
                      className="w-4 h-3 object-cover rounded-[2px] flex-shrink-0"
                    />
                  )}
                  <span className="text-sm font-medium text-contrastText">
                    {data.person.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
          {/* LEFT: Critic selector list (desktop) */}
          <div className="hidden lg:block lg:col-span-4">
            <div className="space-y-1.5">
              {personData.map((data) => {
                const isSelected = data.person.documentId === effectiveSelectedId;
                const picksCount = data.person.person_picks?.length ?? 0;
                const roleLabel = data.person.roles?.map((r) => r.name).join(', ');
                return (
                  <button
                    key={data.person.documentId}
                    onClick={() => setSelectedPersonId(data.person.documentId)}
                    className={`w-full text-left px-4 py-3.5 rounded-lg transition-colors duration-200 border ${
                      isSelected
                        ? 'border-white/15 bg-white/[0.06]'
                        : 'border-transparent hover:border-white/[0.06] hover:bg-white/[0.03]'
                    }`}
                  >
                    {/* Name + role */}
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-base font-medium text-contrastText truncate">
                        {data.person.name}
                      </p>
                      <span className="text-[11px] font-mono uppercase tracking-wider text-contrastText flex-shrink-0" style={{ opacity: 0.3 }}>
                        {picksCount} {picksCount === 1 ? 'pick' : 'picks'}
                      </span>
                    </div>

                    {/* Role tagline */}
                    {roleLabel && (
                      <p className="text-xs text-contrastText mt-0.5" style={{ opacity: 0.4 }}>
                        {roleLabel}
                      </p>
                    )}

                    {/* Locations with flags */}
                    {data.locations.length > 0 && (
                      <div className="flex items-center gap-3 mt-2">
                        {data.locations.map((loc) => (
                          <div key={loc.name} className="flex items-center gap-1.5">
                            {loc.countryCode && (
                              <img
                                src={getFlagUrl(loc.countryCode)}
                                alt=""
                                className="w-4 h-3 object-cover rounded-[2px]"
                              />
                            )}
                            <span className="text-sm text-contrastText" style={{ opacity: 0.55 }}>
                              {loc.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Detail panel with crossfade */}
          <div className="lg:col-span-8">
            <div
              className="transition-opacity duration-200 ease-in-out"
              style={{ opacity: isTransitioning ? 0 : 1 }}
            >
              <DetailPanel
                data={displayedItem}
                onOpenModal={handleOpenModal}
              />
            </div>
          </div>
        </div>
      </div>

      <PersonModal
        person={modalPerson}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setModalPerson(null);
        }}
        onShopSelect={handleShopSelect}
      />
    </section>
  );
}

function DetailPanel({
  data,
  onOpenModal,
}: {
  data: PersonData;
  onOpenModal: (person: Person) => void;
}) {
  const { person, sortedPicks } = data;
  const picksCount = person.person_picks?.length ?? 0;
  const photoUrl = getMediaUrl(person.photo);

  const socialLinks = [
    person.instagram && { label: 'Instagram', href: `https://instagram.com/${person.instagram.replace(/^@/, '')}`, icon: Instagram },
    person.website && { label: 'Website', href: person.website.startsWith('http') ? person.website : `https://${person.website}`, icon: Globe },
  ].filter(Boolean) as { label: string; href: string; icon: React.ComponentType<{ className?: string }> }[];

  return (
    <div className="space-y-5">
      {/* Pick cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sortedPicks.map((pick) => {
          if (!pick.shop) return null;
          return (
            <ShopCard
              key={pick.documentId}
              shop={pick.shop}
              onClick={() => {}}
              variant="inverted"
              rank={pick.rank}
              description={pick.description}
            />
          );
        })}
      </div>

      {/* Person bio card */}
      <div className="border border-white/10 rounded-lg p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          {photoUrl && (
            <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 border border-white/10">
              <Image
                src={photoUrl}
                alt={person.name}
                width={56}
                height={56}
                className="object-cover w-full h-full"
              />
            </div>
          )}

          <div className="flex-1 min-w-0">
            {/* Name + role */}
            <div className="flex items-center gap-3">
              <h3 className="text-base font-medium text-contrastText">{person.name}</h3>
              {person.roles && person.roles.length > 0 && (
                <span className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 border border-white/10 rounded text-contrastText" style={{ opacity: 0.4 }}>
                  {person.roles.map((r) => r.name).join(' / ')}
                </span>
              )}
            </div>

            {/* Bio */}
            {person.bio && (
              <p className="text-sm text-contrastText leading-relaxed mt-2" style={{ opacity: 0.55 }}>
                {person.bio}
              </p>
            )}

            {/* Links row */}
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-3 mt-3">
                {socialLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-contrastText hover:text-accent transition-colors"
                    style={{ opacity: 0.5 }}
                  >
                    <link.icon className="w-3.5 h-3.5" />
                    <span>{link.label}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* View all picks */}
        <div className="mt-4 pt-3 border-t border-white/[0.06]">
          <button
            onClick={() => onOpenModal(person)}
            className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
          >
            View all {picksCount} {picksCount === 1 ? 'pick' : 'picks'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
