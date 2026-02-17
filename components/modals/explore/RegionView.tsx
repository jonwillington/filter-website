'use client';

import Image from 'next/image';
import { Tooltip } from '@heroui/react';
import { Location } from '@/lib/types';
import { RegionGroup, getFlagUrl } from './types';
import { cn } from '@/lib/utils';

interface RegionViewProps {
  groupedData: RegionGroup[];
  onLocationSelect: (location: Location) => void;
}

export function RegionView({ groupedData, onLocationSelect }: RegionViewProps) {
  return (
    <>
      {/* Desktop: 3-column grid with row-aligned regions */}
      <div className="hidden lg:block py-6 px-8">
        {(() => {
          // Create rows of 4 regions each
          const rows: (typeof groupedData)[] = [];
          for (let i = 0; i < groupedData.length; i += 4) {
            rows.push(groupedData.slice(i, i + 4));
          }

          return rows.map((rowRegions, rowIndex) => (
            <div
              key={rowIndex}
              className={cn(
                'grid grid-cols-4 divide-x divide-border-default',
                rowIndex > 0 && 'mt-8 pt-8 border-t border-border-default'
              )}
            >
              {/* Render 4 columns, with empty placeholder if fewer regions */}
              {[0, 1, 2, 3].map((colIndex) => {
                const regionData = rowRegions[colIndex];
                return (
                  <div key={colIndex} className="px-6 first:pl-0 last:pr-0">
                    {regionData ? (
                      <>
                        <h3 className="font-display text-lg text-primary mb-4">
                          {regionData.region}
                        </h3>
                        <div className="space-y-4">
                          {regionData.countries.map(({ country, locations: locs }) => (
                            <div key={country.documentId || country.code}>
                              <div className="flex items-center gap-1.5 mb-1">
                                {getFlagUrl(country.code) && (
                                  <div className="w-2.5 h-2.5 rounded-full overflow-hidden flex-shrink-0">
                                    <Image
                                      src={getFlagUrl(country.code)!}
                                      alt={country.name}
                                      width={10}
                                      height={10}
                                      className="object-cover w-full h-full"
                                      unoptimized
                                    />
                                  </div>
                                )}
                                <span className="text-sm text-text-secondary">
                                  {country.name}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-x-1 gap-y-0.5">
                                {locs.map((location, locIdx) => (
                                  <span key={location.documentId} className="inline-flex items-center">
                                    {location.comingSoon ? (
                                      <Tooltip content="Coming soon" placement="top">
                                        <span
                                          className="text-sm font-medium text-text-secondary cursor-default underline decoration-dotted opacity-50"
                                        >
                                          {location.name}
                                        </span>
                                      </Tooltip>
                                    ) : (
                                      <button
                                        onClick={() => onLocationSelect(location)}
                                        className="text-sm font-medium text-primary hover:text-accent transition-colors"
                                      >
                                        {location.name}
                                      </button>
                                    )}
                                    {locIdx < locs.length - 1 && (
                                      <span className="text-border-default mx-1">·</span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ));
        })()}
      </div>

      {/* Mobile: Clean stacked layout */}
      <div className="lg:hidden px-5 py-6">
        {groupedData.map(({ region, countries: regionCountries }, idx) => (
          <div key={region} className={idx > 0 ? 'mt-6 pt-5 border-t border-border-default' : ''}>
            <h3 className="font-display text-lg text-primary mb-4">
              {region}
            </h3>
            <div className="space-y-4">
              {regionCountries.map(({ country, locations: locs }) => (
                <div key={country.documentId || country.code}>
                  <div className="flex items-center gap-1.5 mb-1">
                    {getFlagUrl(country.code) && (
                      <div className="w-2.5 h-2.5 rounded-full overflow-hidden flex-shrink-0">
                        <Image
                          src={getFlagUrl(country.code)!}
                          alt={country.name}
                          width={10}
                          height={10}
                          className="object-cover w-full h-full"
                          unoptimized
                        />
                      </div>
                    )}
                    <span className="text-sm text-text-secondary">
                      {country.name}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-1 gap-y-0.5">
                    {locs.map((location, locIdx) => (
                      <span key={location.documentId} className="inline-flex items-center">
                        {location.comingSoon ? (
                          <Tooltip content="Coming soon" placement="top">
                            <span
                              className="text-sm font-medium text-text-secondary cursor-default underline decoration-dotted opacity-50"
                            >
                              {location.name}
                            </span>
                          </Tooltip>
                        ) : (
                          <button
                            onClick={() => onLocationSelect(location)}
                            className="text-sm font-medium text-primary hover:text-accent transition-colors"
                          >
                            {location.name}
                          </button>
                        )}
                        {locIdx < locs.length - 1 && (
                          <span className="text-border-default mx-1">·</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
