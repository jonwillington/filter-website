'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { Accordion, AccordionItem } from '@heroui/react';
import { Person, PersonPick, Shop } from '@/lib/types';
import { getMediaUrl } from '@/lib/utils';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useDrawerTransition } from '@/lib/hooks/useDrawerTransition';
import { PersonModal } from '@/components/people/PersonModal';
import { ShopCard } from './ShopCard';
import { ArrowRight, Globe, Instagram, User } from 'lucide-react';

const CriticsPicksMap = dynamic(() => import('./CriticsPicksMap'), { ssr: false });

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

interface LocationGroup {
  locationName: string;
  countryCode?: string;
  critics: PersonData[];
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

  // Group critics by location
  const locationGroups = useMemo<LocationGroup[]>(() => {
    const groupMap = new Map<string, LocationGroup>();
    for (const data of personData) {
      for (const loc of data.locations) {
        let group = groupMap.get(loc.name);
        if (!group) {
          group = { locationName: loc.name, countryCode: loc.countryCode, critics: [] };
          groupMap.set(loc.name, group);
        }
        group.critics.push(data);
      }
    }
    // Critics with no locations go in an "Other" group
    for (const data of personData) {
      if (data.locations.length === 0) {
        let group = groupMap.get('Other');
        if (!group) {
          group = { locationName: 'Other', critics: [] };
          groupMap.set('Other', group);
        }
        group.critics.push(data);
      }
    }
    return Array.from(groupMap.values()).sort((a, b) =>
      a.locationName.localeCompare(b.locationName)
    );
  }, [personData]);

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
        className="font-display text-6xl md:text-8xl lg:text-9xl text-contrastText text-center mb-4 md:mb-5"
        style={{
          opacity: headingRevealed ? 1 : 0,
          transform: headingRevealed ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
        }}
      >
        Critics&apos; Picks
      </h2>
      <p
        className="text-contrastText text-base md:text-lg max-w-2xl mx-auto text-center mb-12 md:mb-16 lg:mb-20"
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
        {/* Mobile: grouped horizontal scroll chips */}
        <div className="lg:hidden mb-6 space-y-3">
          {locationGroups.map((group) => (
            <div key={group.locationName}>
              <div className="flex items-center gap-1.5 mb-1.5 px-1">
                {group.countryCode && (
                  <img
                    src={getFlagUrl(group.countryCode)}
                    alt=""
                    className="w-3.5 h-2.5 object-cover rounded-[2px] flex-shrink-0"
                  />
                )}
                <span className="text-xs font-medium text-contrastText" style={{ opacity: 0.4 }}>
                  {group.locationName}
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                {group.critics.map((data) => {
                  const isSelected = data.person.documentId === effectiveSelectedId;
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
                      <span className="text-sm font-medium text-contrastText">
                        {data.person.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
          {/* LEFT: Critic selector list (desktop) — grouped by location */}
          <div className="hidden lg:block lg:col-span-4">
            <Accordion
              selectionMode="single"
              defaultExpandedKeys={locationGroups.length > 0 ? [locationGroups[0].locationName] : []}
              variant="light"
              className="px-0 gap-2"
              itemClasses={{
                base: 'rounded-xl overflow-hidden !shadow-none border border-white/[0.06]',
                title: 'text-xl font-normal text-contrastText',
                trigger: 'px-4 py-4 hover:bg-white/[0.04] transition-colors',
                content: 'pb-2 pt-0 px-2',
                indicator: 'text-contrastText opacity-40 text-lg',
              }}
            >
              {locationGroups.map((group) => (
                <AccordionItem
                  key={group.locationName}
                  aria-label={group.locationName}
                  title={
                    <div className="flex items-center gap-2.5">
                      {group.countryCode && (
                        <img
                          src={getFlagUrl(group.countryCode)}
                          alt=""
                          className="w-5 h-3.5 object-cover rounded-[2px] flex-shrink-0"
                        />
                      )}
                      <span>{group.locationName}</span>
                      <span className="text-xs font-mono uppercase tracking-wider text-contrastText ml-auto" style={{ opacity: 0.3 }}>
                        {group.critics.length}
                      </span>
                    </div>
                  }
                >
                  <div className="space-y-0.5">
                    {group.critics.map((data) => {
                      const isSelected = data.person.documentId === effectiveSelectedId;
                      const picksCount = data.person.person_picks?.length ?? 0;
                      const roleLabel = data.person.roles?.map((r) => r.name).join(', ');
                      const avatarUrl = getMediaUrl(data.person.photo);
                      return (
                        <button
                          key={data.person.documentId}
                          onClick={() => setSelectedPersonId(data.person.documentId)}
                          className={`w-full text-left px-3.5 py-3 rounded-lg transition-colors duration-200 border ${
                            isSelected
                              ? 'border-white/15 bg-white/[0.08]'
                              : 'border-transparent hover:border-white/[0.06] hover:bg-white/[0.03]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-white/10 bg-white/[0.06] flex items-center justify-center">
                              {avatarUrl ? (
                                <Image
                                  src={avatarUrl}
                                  alt={data.person.name}
                                  width={32}
                                  height={32}
                                  className="object-cover w-full h-full"
                                />
                              ) : (
                                <User className="w-4 h-4 text-contrastText opacity-30" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-[15px] font-medium text-contrastText truncate">
                                  {data.person.name}
                                </p>
                                <span className="text-[11px] font-mono uppercase tracking-wider text-contrastText flex-shrink-0" style={{ opacity: 0.3 }}>
                                  {picksCount} {picksCount === 1 ? 'pick' : 'picks'}
                                </span>
                              </div>
                              {roleLabel && (
                                <p className="text-xs text-contrastText mt-0.5" style={{ opacity: 0.4 }}>
                                  {roleLabel}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </AccordionItem>
              ))}
            </Accordion>
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
                pickShops={displayedItem.sortedPicks
                  .map((p) => p.shop)
                  .filter((s): s is Shop => !!s)}
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
  pickShops,
}: {
  data: PersonData;
  onOpenModal: (person: Person) => void;
  pickShops: Shop[];
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
      {/* Person intro — above the map */}
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 border border-white/10 bg-white/[0.06] flex items-center justify-center">
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt={person.name}
              width={56}
              height={56}
              className="object-cover w-full h-full"
            />
          ) : (
            <User className="w-6 h-6 text-contrastText opacity-30" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-2xl md:text-3xl font-medium text-contrastText">{person.name}</h3>
          {person.roles && person.roles.length > 0 && (
            <span className="text-[11px] font-mono uppercase tracking-wider text-contrastText mt-1 inline-block" style={{ opacity: 0.4 }}>
              {person.roles.map((r) => r.name).join(' / ')}
            </span>
          )}
          {person.bio && (
            <p className="text-sm text-contrastText leading-relaxed mt-2 line-clamp-2" style={{ opacity: 0.55 }}>
              {person.bio}
            </p>
          )}
        </div>
        <button
          onClick={() => onOpenModal(person)}
          className="flex-shrink-0 mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
        >
          More
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Map + cards surface */}
      <div className="bg-white/[0.05] rounded-2xl overflow-hidden">
        <CriticsPicksMap shops={pickShops} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 pb-5">
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
      </div>

      {/* Social links */}
      {socialLinks.length > 0 && (
        <div className="flex items-center gap-3">
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

      {/* Affiliated shop */}
      {person.affiliated_shop && (
        <div className="bg-white/[0.05] rounded-xl p-4">
          {person.affiliation_blurb && (
            <p className="text-xs text-contrastText mb-3" style={{ opacity: 0.55 }}>
              {person.affiliation_blurb}
            </p>
          )}
          <ShopCard
            shop={person.affiliated_shop}
            onClick={() => {}}
            variant="inverted"
          />
        </div>
      )}
    </div>
  );
}
