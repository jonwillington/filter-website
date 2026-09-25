# Filter API v3

Read API for the native apps. The first client is the Istanbul SwiftUI app.

- **Base URL:** `https://api.filter.coffee` (local: `http://localhost:8787`)
- **Contract:** [`types/api-v3.ts`](../types/api-v3.ts) is the source of truth. The Swift models mirror it by hand.
- **Code:** [`workers/api`](../workers/api), a Cloudflare Worker bound to the same D1 database (`filter-db`) as the website.
- **Not affected:** `/api/v2/*` on the website. The Expo app and filter.coffee keep using it.

## Rules

| Rule | Detail |
|---|---|
| Additive only | New fields and endpoints are fine. Removing or renaming a field, or changing its type, needs `/v4`, because App Store builds can't be rolled back. Every change to `types/api-v3.ts` needs a note in the PR. |
| Keys | camelCase. IDs are Strapi `documentId` strings. |
| Nulls | Every field is always present. Unknown values are `null`, never left out. Lists are `[]`, never `null`. |
| Times | Timestamps are ISO 8601 UTC. Opening hours are `"HH:mm"` in `City.timezone`. |
| Links | Records refer to each other by ID (`brandId`, `cityAreaId`, `shopIds`). Parents aren't copied in. |
| Content | Only published, non-dev rows are served. |
| Envelope | `{ "data": …, "meta": { "version", "generatedAt" } }` |
| Errors | `{ "error": { "code", "message" } }` with the HTTP status. Codes: `not_found`, `bad_request`, `method_not_allowed`, `internal_error`. |

## Caching

Every response carries `ETag: "<version>"`, where `version` is a hash of every D1 table's row count and latest `updated_at`. It changes whenever any content changes. That means:

- Send `If-None-Match` with the stored ETag. An unchanged response is a `304` with no body.
- The edge caches responses keyed by version, so nothing needs purging. A Strapi edit is visible within about 30 seconds of the webhook landing.
- `Cache-Control: public, max-age=60, stale-while-revalidate=600`.
- `x-api-cache: HIT | MISS` shows whether the edge cache served it.

Suggested app pattern: persist the catalog JSON and its ETag on disk, render from disk at launch, then revalidate in the background.

## Endpoints

`:city` accepts a slug (`istanbul`) or the location's documentId (`a3ueoba5n0xy0sru1hpw1xr3`). **Pin the documentId in the app config.** Strapi derives location slugs from the name, so renaming a city in the CMS changes its slug.

| Endpoint | Returns | Notes |
|---|---|---|
| `GET /v3/cities` | `CityListItem[]` | For future city builds and internal tools. |
| `GET /v3/cities/:city` | `City`, with country and city areas | Outlines are simplified (city ≤ 150 points, area ≤ 100). `?boundaries=full` returns the source outlines (Istanbul: 31 KB → 232 KB). |
| `GET /v3/cities/:city/catalog` | `{ cityId, shops: ShopSummary[], brands: BrandSummary[] }` | **The main call.** Everything the map and list need. `brands` = this city's shop brands plus their suppliers. Istanbul: 89 shops, 43 brands, ~23 KB gzipped. |
| `GET /v3/cities/:city/discover?events=20&news=20` | `{ cityId, events, people, news, brands }` | Limits default to 20 and cap at 50. Events that haven't ended, soonest first. People with picks in this city. News that mentions the city, one of its shops, or one of its shops' brands, newest first. |
| `GET /v3/shops/:id` | `ShopDetail` | Summary fields plus description, links, menus, gallery, brand, city area, coffee partner, upcoming events. |
| `GET /v3/brands/:id` | `BrandDetail` | Story, beans (with origins and flavour tags), suppliers, roast countries, shops grouped by city. |

### Values worth knowing

- **Amenities and brew methods** are resolved on the server: the shop's own value, falling back to the brand default. `null` means unknown, not "no".
- **Opening hours** arrive in seven or more source formats in the CMS. The API always returns seven `days` (Monday = 1). Each has a `status`:
  - `open`: at least one entry in `ranges`
  - `closed`
  - `open24h`
  - `unknown`: no data, or text that couldn't be parsed. Show `text` if present.

  A `close` at or before `open` means the shop closes after midnight.
- **`heroImage.formats`**: use `small` (500 px) for list rows and `medium` (750 px) for detail headers. Original `width`/`height` are often `null`, so read dimensions from the format.
- **Shop display names** (`prefName`, added 2026-09-17): `name` is the full CMS name ("Kronotrop Moda - Istanbul"). Build what users see from the brand, as the Expo app does (`ShopCardList.tsx`):
  - brand `type` is `independent` → the brand's name
  - any other brand type → `"<brand name> · <prefName>"`, or the brand name alone when `prefName` is `null`
  - no brand → `name`
- **Attractions** (added 2026-09-24): `catalog.attractions` lists the city's landmarks, museums, parks and ferry piers (not for the map). `shop.nearbyAttractions` has up to 3 within walking distance, most prominent first, then nearest. Radius by `prominence`: 1 (famous) 1,200 m, 2 (notable) 800 m, 3 (local anchor) 500 m. An attraction in a different city-area group ("European Side" vs "Asian Side") never counts, so nothing is "nearby" across the Bosphorus. `distanceMetres` is straight-line (to the `outline` for long streets), rounded to 10 m; `walkMinutes` is distance × 1.25 at 80 m a minute. Unknown `category` values should get a generic icon.
- **`preferenceProfile`**: taste-matching weights from the CMS, e.g. `{ "look": { "minimal": 1 }, "special": { "roastery": 2 } }`.

## Webhook (internal)

`POST /webhooks/strapi` with header `x-webhook-secret`. It keeps the tables only this Worker owns in sync: `events`, `people`, `person_picks`, `news_articles` (+ links), `coffee_partners`, `attractions`, `shop_events`. Shops, brands, beans, locations, countries and city areas stay with the website's `/api/v2/webhook`. In Strapi admin → Settings → Webhooks, add this URL as a **second** webhook with the same events (entry create, update, delete, publish, unpublish).

## Local development

```bash
cd workers/api
npm install
# Load real data into the local D1 by running the reseed worker locally against Strapi:
#   cd ../d1-reseed && npm install
#   npx wrangler dev --persist-to ../.wrangler-local --port 8788 --var STRAPI_TOKEN:<token> --var RESEED_SECRET:local
#   curl -H 'x-reseed-secret: local' localhost:8788/reseed        # ~1 minute
npx wrangler dev --persist-to ../.wrangler-local                 # http://localhost:8787
node scripts/check-api-v3.mjs                                    # contract check
node scripts/test-hours.mjs                                      # opening-hours parser
```

To check production after deploy: `API_BASE=https://api.filter.coffee node scripts/check-api-v3.mjs`.

## Example responses

Trimmed from real Istanbul and London data: long strings cut, arrays shortened.

### `GET /v3/cities`

```json
{
  "data": [
    {
      "id": "hufyajf205izq8hdm9ghwky2",
      "slug": "almaty",
      "name": "Almaty",
      "countryCode": "KZ",
      "shopCount": 11
    }
  ],
  "meta": {
    "version": "04977cddac816c8b",
    "generatedAt": "2026-09-17T10:57:45.036Z"
  }
}
```

### `GET /v3/cities/istanbul`

```json
{
  "data": {
    "id": "a3ueoba5n0xy0sru1hpw1xr3",
    "slug": "istanbul",
    "name": "Istanbul",
    "headline": "this is the sample headline",
    "story": "Where East meets West, Istanbul's coffee culture bridges centuries-old Turkish traditions …",
    "timezone": "Europe/Istanbul",
    "center": {
      "lat": 41.0253435,
      "lng": 29.0153127
    },
    "bounds": {
      "north": 41.1815652,
      "south": 40.9523848,
      "east": 29.124152600000002,
      "west": 28.666916399999995
    },
    "boundary": [
      {
        "lat": 41.09507,
        "lng": 27.86354
      },
      {
        "lat": 41.09415,
        "lng": 27.87135
      }
    ],
    "backgroundImage": {
      "url": "https://helpful-oasis-8bb949e05d.media.strapiapp.com/istanbul_751a28342f.webp",
      "width": null,
      "height": null,
      "formats": {
        "thumbnail": {
          "url": "https://helpful-oasis-8bb949e05d.media.strapiapp.com/thumbnail_istanbul_751a28342f.webp",
          "width": 245,
          "height": 130
        },
        "small": {
          "url": "https://helpful-oasis-8bb949e05d.media.strapiapp.com/small_istanbul_751a28342f.webp",
          "width": 500,
          "height": 265
        },
        "medium": {
          "url": "https://helpful-oasis-8bb949e05d.media.strapiapp.com/medium_istanbul_751a28342f.webp",
          "width": 750,
          "height": 398
        },
        "large": null
      }
    },
    "primaryColor": null,
    "secondaryColor": null,
    "country": {
      "id": "bxri870i1wkur416zarf9ezk",
      "code": "TR",
      "name": "Turkey",
      "primaryColor": "#E30A17",
      "primaryColorDark": "#57060B",
      "secondaryColor": "#FFFEFE",
      "secondaryColorDark": "#3C3C3C",
      "highInflation": true
    },
    "cityAreas": [
      {
        "id": "ny9x613ab4q3fpdn6gothzpu",
        "slug": null,
        "name": "Kadıköy",
        "group": "Asian Side",
        "summary": null,
        "center": {
          "lat": 40.97683122305824,
          "lng": 29.045285175809052
        },
        "bounds": {
          "north": 41.0123,
          "south": 40.94997,
          "east": 29.11123,
          "west": 29.01484
        },
        "boundary": [
          {
            "lat": 40.99257,
            "lng": 29.01484
          },
          {
            "lat": 40.98527,
            "lng": 29.0202
          }
        ],
        "shopCount": 31
      }
    ]
  },
  "meta": {
    "version": "04977cddac816c8b",
    "generatedAt": "2026-09-17T10:55:39.882Z"
  }
}
```

### `GET /v3/cities/istanbul/catalog`

```json
{
  "data": {
    "cityId": "a3ueoba5n0xy0sru1hpw1xr3",
    "shops": [
      {
        "id": "w6bbhwb7xcyf4g66baljiayq",
        "slug": null,
        "name": "Old Java",
        "prefName": null,
        "brandId": "ras5a36w7hoq7m9ugh4mw4ip",
        "cityId": "a3ueoba5n0xy0sru1hpw1xr3",
        "cityAreaId": "i0905t42mwo3hhvdgdf4j457",
        "coordinates": {
          "lat": 41.0258648,
          "lng": 28.9754824
        },
        "address": "Müeyyetzade, Tatar Beyi Sk. No:8, 34425 Beyoğlu/İstanbul, Türkiye",
        "heroImage": {
          "url": "https://helpful-oasis-8bb949e05d.media.strapiapp.com/old_java_1_52ccff724f.jpg",
          "width": null,
          "height": null,
          "formats": {
            "thumbnail": {
              "url": "https://helpful-oasis-8bb949e05d.media.strapiapp.com/thumbnail_old_java_1_52ccff724f.jpg",
              "width": 245,
              "height": 138
            },
            "small": {
              "url": "https://helpful-oasis-8bb949e05d.media.strapiapp.com/small_old_java_1_52ccff724f.jpg",
              "width": 500,
              "height": 281
            },
            "medium": {
              "url": "https://helpful-oasis-8bb949e05d.media.strapiapp.com/medium_old_java_1_52ccff724f.jpg",
              "width": 750,
              "height": 422
            },
            "large": null
          }
        },
        "openingHours": {
          "days": [
            {
              "weekday": 5,
              "status": "open",
              "ranges": [
                {
                  "open": "08:00",
                  "close": "20:00"
                }
              ],
              "text": "8:00 AM – 8:00 PM"
            },
            {
              "weekday": 6,
              "status": "open",
              "ranges": [
                {
                  "open": "08:00",
                  "close": "19:00"
                }
              ],
              "text": "8:00 AM – 7:00 PM"
            }
          ]
        },
        "amenities": {
          "wifi": false,
          "food": true,
          "outdoorSeating": false,
          "petFriendly": false,
          "oatMilk": true,
          "plantMilk": true
        },
        "brewMethods": {
          "espresso": true,
          "filter": null,
          "v60": true,
          "chemex": null,
          "aeropress": null,
          "frenchPress": null,
          "coldBrew": true,
          "batchBrew": null,
          "siphon": null,
          "turkishCoffee": null,
          "slowBar": null
        },
        "recommendations": {
          "cityArea": true,
          "cityAreaReason": null,
          "working": null,
          "interior": null,
          "brewing": null
        },
        "qualityTier": "verified",
        "preferenceProfile": {
          "look": {
            "minimal": 1
          },
          "special": {
            "learning": 2,
            "roastery": 2
          }
        },
        "updatedAt": "2026-02-13T07:08:31.607Z"
      }
    ],
    "brands": [
      {
        "id": "ras5a36w7hoq7m9ugh4mw4ip",
        "name": "Old Java",
        "type": "independent",
        "statement": "Galata roastery with direct trade and traceability, V60 and cortado near Cihangir.",
        "logo": {
          "url": "https://helpful-oasis-8bb949e05d.media.strapiapp.com/316996164_193613363152844_4073048015210909152_n_ff027606ca.jpg",
          "width": null,
          "height": null,
          "formats": {
            "thumbnail": {
              "url": "https://helpful-oasis-8bb949e05d.media.strapiapp.com/thumbnail_316996164_193613363152844_4073048015210909152_n_ff027606ca.jpg",
              "width": 156,
              "height": 156
            },
            "small": {
              "url": "https://helpful-oasis-8bb949e05d.media.strapiapp.com/small_316996164_193613363152844_4073048015210909152_n_ff027606ca.jpg",
              "width": 500,
              "height": 500
            },
            "medium": {
              "url": "https://helpful-oasis-8bb949e05d.media.strapiapp.com/medium_316996164_193613363152844_4073048015210909152_n_ff027606ca.jpg",
              "width": 750,
              "height": 750
            },
            "large": {
              "url": "https://helpful-oasis-8bb949e05d.media.strapiapp.com/large_316996164_193613363152844_4073048015210909152_n_ff027606ca.jpg",
              "width": 1000,
              "height": 1000
            }
          }
        },
        "roastsOwnBeans": true,
        "supplierIds": []
      }
    ]
  },
  "meta": {
    "version": "04977cddac816c8b",
    "generatedAt": "2026-09-17T10:57:45.077Z"
  }
}
```

### `GET /v3/shops/w6bbhwb7xcyf4g66baljiayq`

```json
{
  "data": {
    "id": "w6bbhwb7xcyf4g66baljiayq",
    "slug": null,
    "name": "Old Java",
    "prefName": null,
    "brandId": "ras5a36w7hoq7m9ugh4mw4ip",
    "cityId": "a3ueoba5n0xy0sru1hpw1xr3",
    "cityAreaId": "i0905t42mwo3hhvdgdf4j457",
    "coordinates": {
      "lat": 41.0258648,
      "lng": 28.9754824
    },
    "address": "Müeyyetzade, Tatar Beyi Sk. No:8, 34425 Beyoğlu/İstanbul, Türkiye",
    "heroImage": {
      "url": "https://helpful-oasis-8bb949e05d.media.strapiapp.com/old_java_1_52ccff724f.jpg",
      "width": null,
      "height": null,
      "formats": {
        "thumbnail": {
          "url": "https://helpful-oasis-8bb949e05d.media.strapiapp.com/thumbnail_old_java_1_52ccff724f.jpg",
          "width": 245,
          "height": 138
        },
        "small": {
          "url": "https://helpful-oasis-8bb949e05d.media.strapiapp.com/small_old_java_1_52ccff724f.jpg",
          "width": 500,
          "height": 281
        },
        "medium": {
          "url": "https://helpful-oasis-8bb949e05d.media.strapiapp.com/medium_old_java_1_52ccff724f.jpg",
          "width": 750,
          "height": 422
        },
        "large": null
      }
    },
    "openingHours": {
      "days": [
        {
          "weekday": 1,
          "status": "open",
          "ranges": [
            {
              "open": "08:00",
              "close": "19:00"
            }
          ],
          "text": "8:00 AM – 7:00 PM"
        }
      ]
    },
    "amenities": {
      "wifi": false,
      "food": true,
      "outdoorSeating": false,
      "petFriendly": false,
      "oatMilk": true,
      "plantMilk": true
    },
    "brewMethods": {
      "espresso": true,
      "filter": null,
      "v60": true,
      "chemex": null,
      "aeropress": null,
      "frenchPress": null,
      "coldBrew": true,
      "batchBrew": null,
      "siphon": null,
      "turkishCoffee": null,
      "slowBar": null
    },
    "recommendations": {
      "cityArea": true,
      "cityAreaReason": null,
      "working": null,
      "interior": null,
      "brewing": null
    },
    "qualityTier": "verified",
    "preferenceProfile": {
      "look": {
        "minimal": 1
      },
      "special": {
        "learning": 2,
        "roastery": 2
      }
    },
    "updatedAt": "2026-02-13T07:08:31.607Z",
    "description": "Tatar Beyi Sokak in Galata, tucked into quieter streets near Cihangir. Roastery imports an…",
    "neighbourhood": null,
    "phone": "0542 458 84 04",
    "links": {
      "website": "https://oldjavacoffee.com/",
      "instagram": "oldjavacoffee",
      "facebook": null,
      "tiktok": null,
      "twitter": null,
      "youtube": null
    },
    "googlePlaceId": "ChIJV1VKZee5yhQRs-fPFhwDLJU",
    "gallery": [],
    "menus": [
      {
        "id": "pin4c48wo35wqq981u29f06o",
        "image": {
          "url": "https://helpful-oasis-8bb949e05d.media.strapiapp.com/menu_java_676159863e.webp",
          "width": 2481,
          "height": 3508,
          "formats": {
            "thumbnail": {
              "url": "https://helpful-oasis-8bb949e05d.media.strapiapp.com/thumbnail_menu_java_676159863e.webp",
              "width": 110,
              "height": 156
            },
            "small": {
              "url": "https://helpful-oasis-8bb949e05d.media.strapiapp.com/small_menu_java_676159863e.webp",
              "width": 354,
              "height": 500
            },
            "medium": {
              "url": "https://helpful-oasis-8bb949e05d.media.strapiapp.com/medium_menu_java_676159863e.webp",
              "width": 530,
              "height": 750
            },
            "large": {
              "url": "https://helpful-oasis-8bb949e05d.media.strapiapp.com/large_menu_java_676159863e.webp",
              "width": 707,
              "height": 1000
            }
          }
        },
        "isCurrent": true,
        "validFrom": "2025-11-06",
        "validTo": null,
        "lastVerified": "2025-11-05T21:00:00.000Z"
      }
    ],
    "brand": {
      "id": "ras5a36w7hoq7m9ugh4mw4ip",
      "name": "Old Java",
      "type": "independent",
      "statement": "Galata roastery with direct trade and traceability, V60 and cortado near Cihangir.",
      "logo": {
        "url": "https://helpful-oasis-8bb949e05d.media.strapiapp.com/316996164_193613363152844_40730480152…",
        "width": null,
        "height": null,
        "formats": {
          "thumbnail": {
            "url": "https://helpful-oasis-8bb949e05d.media.strapiapp.com/thumbnail_316996164_193613363152844_4…",
            "width": 156,
            "height": 156
          },
          "small": {
            "url": "https://helpful-oasis-8bb949e05d.media.strapiapp.com/small_316996164_193613363152844_40730…",
            "width": 500,
            "height": 500
          },
          "medium": {
            "url": "https://helpful-oasis-8bb949e05d.media.strapiapp.com/medium_316996164_193613363152844_4073…",
            "width": 750,
            "height": 750
          },
          "large": {
            "url": "https://helpful-oasis-8bb949e05d.media.strapiapp.com/large_316996164_193613363152844_40730…",
            "width": 1000,
            "height": 1000
          }
        }
      },
      "roastsOwnBeans": true,
      "supplierIds": []
    },
    "cityArea": {
      "id": "i0905t42mwo3hhvdgdf4j457",
      "name": "Beyoğlu",
      "group": "European Side"
    },
    "coffeePartner": null,
    "events": []
  },
  "meta": {
    "version": "04977cddac816c8b",
    "generatedAt": "2026-09-17T10:55:04.027Z"
  }
}
```

### `GET /v3/brands/somsy07kaa3u5x58sckm4wpu`

```json
{
  "data": {
    "id": "somsy07kaa3u5x58sckm4wpu",
    "name": "Kahverengi Roaster",
    "type": "smallChain",
    "statement": "Bozcaada island roaster, medium profiles in an ultra-light Istanbul.",
    "logo": {
      "url": "https://helpful-oasis-8bb949e05d.media.strapiapp.com/133853849_156582059571339_52298807839…",
      "width": null,
      "height": null,
      "formats": {
        "thumbnail": {
          "url": "https://helpful-oasis-8bb949e05d.media.strapiapp.com/thumbnail_133853849_156582059571339_5…",
          "width": 156,
          "height": 156
        },
        "small": {
          "url": "https://helpful-oasis-8bb949e05d.media.strapiapp.com/small_133853849_156582059571339_52298…",
          "width": 500,
          "height": 500
        },
        "medium": {
          "url": "https://helpful-oasis-8bb949e05d.media.strapiapp.com/medium_133853849_156582059571339_5229…",
          "width": 750,
          "height": 750
        },
        "large": {
          "url": "https://helpful-oasis-8bb949e05d.media.strapiapp.com/large_133853849_156582059571339_52298…",
          "width": 1000,
          "height": 1000
        }
      }
    },
    "roastsOwnBeans": true,
    "supplierIds": [],
    "story": "Ulaş Tüze spent fifteen years roasting in Çanakkale and on Bozcaada, an Aegean island, mak…",
    "description": null,
    "founded": "2013-01-01",
    "founder": "Ulaş Tüze",
    "hq": null,
    "backgroundImage": null,
    "links": {
      "website": "https://kahverengiroastery.com",
      "instagram": "kahverengi_roastery",
      "facebook": null,
      "tiktok": null,
      "twitter": null,
      "youtube": null
    },
    "ownRoastDescription": "Medium roast profile. Ethiopia Sidama (fruity, floral, complex). Dark chocolate and dried …",
    "ownRoastCountries": [
      {
        "name": "Colombia",
        "code": "CO"
      }
    ],
    "roastProfiles": {
      "light": null,
      "medium": null,
      "dark": null
    },
    "equipment": {
      "drippers": [],
      "espresso": [
        "Victoria Arduino Eagle 1"
      ],
      "grinders": [],
      "roasters": []
    },
    "beans": [
      {
        "id": "o91ppyhfpp9p2mlc9b38y2zj",
        "name": "Colombia Narino Supremo",
        "slug": null,
        "type": "single-origin",
        "roastLevel": null,
        "process": "washed",
        "shortDescription": "Washed Colombian from Narino. Soft mouthfeel, bright acidity, chocolate and vanilla aromat…",
        "fullDescription": null,
        "region": "Narino",
        "farm": null,
        "producer": null,
        "altitude": null,
        "cuppingScore": null,
        "blendComponents": null,
        "photo": null,
        "learnMoreUrl": "https://www.kahverengiroastery.com/colombia-narino-supremo-filtre/",
        "origins": [],
        "flavorTags": []
      }
    ],
    "suppliers": [],
    "shopsByCity": [
      {
        "cityId": "a3ueoba5n0xy0sru1hpw1xr3",
        "cityName": "Istanbul",
        "citySlug": null,
        "shops": [
          {
            "id": "s7y1ywru1qlkb9jpvimybyac",
            "name": "Kahverengi Roastery Sultanahmet",
            "prefName": null,
            "cityAreaName": "Fatih",
            "coordinates": {
              "lat": 41.0093621,
              "lng": 28.978735
            },
            "heroImage": {
              "url": "https://helpful-oasis-8bb949e05d.media.strapiapp.com/kahverengi_roaster_sultanahmet_featur…",
              "width": null,
              "height": null,
              "formats": {
                "thumbnail": {
                  "url": "https://helpful-oasis-8bb949e05d.media.strapiapp.com/thumbnail_kahverengi_roaster_sultanah…",
                  "width": 208,
                  "height": 156
                },
                "small": {
                  "url": "https://helpful-oasis-8bb949e05d.media.strapiapp.com/small_kahverengi_roaster_sultanahmet_…",
                  "width": 500,
                  "height": 375
                },
                "medium": {
                  "url": "https://helpful-oasis-8bb949e05d.media.strapiapp.com/medium_kahverengi_roaster_sultanahmet…",
                  "width": 750,
                  "height": 563
                },
                "large": null
              }
            }
          }
        ]
      }
    ]
  },
  "meta": {
    "version": "04977cddac816c8b",
    "generatedAt": "2026-09-17T10:55:39.960Z"
  }
}
```

### `GET /v3/cities/london/discover?events=5&news=5`

```json
{
  "data": {
    "cityId": "yb04fbpj59rrsos7asq4fzxq",
    "events": [],
    "people": [
      {
        "id": "tw8p6qjriaj829ut4vbn3fcy",
        "name": "Priya Mehta",
        "slug": "priya-mehta",
        "bio": "London coffee critic and freelance journalist. Writes for European Coffee Trip and The Gua…",
        "photo": null,
        "roles": [
          "critic"
        ],
        "affiliation": null,
        "affiliatedShopId": null,
        "links": {
          "website": null,
          "instagram": null,
          "facebook": null,
          "tiktok": null,
          "twitter": null,
          "youtube": null
        },
        "picks": [
          {
            "id": "lfonmeonpk5shn0ybwctkkih",
            "shopId": "okfjfhyyhc95l9eb2vat8vyi",
            "rank": 1,
            "description": "Alchemy has been doing it longer than most and still outperforms newer arrivals. The roast…"
          }
        ]
      }
    ],
    "news": [
      {
        "id": "a0glw9plti0b0t3fkelb65v3",
        "title": "WatchHouse Raises $14.8 Million Series B with Eyes on US Expansion",
        "slug": "watchhouse-raises-14-8-million-series-b-with-eyes-on-us-expansion",
        "statement": "WatchHouse closes $14.8 million Series B led by HighPost Capital.",
        "summary": "WatchHouse closed a $14.8 million Series B round in December 2025, led by HighPost Capital…",
        "publishedDate": "2026-01-23",
        "type": "industry",
        "importance": "high",
        "sourceName": "Daily Coffee News",
        "sourceUrl": "https://dailycoffeenews.com/2026/01/23/watchhouse-lands-14-8-million-series-b-round-with-e…",
        "author": "Daily Coffee News Staff",
        "image": null,
        "brandIds": [
          "tbv27fpr2obbgd7bjarv9pva"
        ],
        "shopIds": [],
        "cityIds": [
          "yb04fbpj59rrsos7asq4fzxq"
        ]
      }
    ],
    "brands": [
      {
        "id": "ja1pgh1m01rvijbukdiftbvm",
        "name": "Calico Coffee",
        "type": "independent",
        "statement": "Chinese-founded Waterloo cafe, Panama Geisha and Yunnan lots on La Marzocco Strada.",
        "logo": {
          "url": "https://helpful-oasis-8bb949e05d.media.strapiapp.com/calico_coffee_uk_3c27d193c632af196cec…",
          "width": null,
          "height": null,
          "formats": {
            "thumbnail": null,
            "small": null,
            "medium": null,
            "large": null
          }
        },
        "roastsOwnBeans": false,
        "supplierIds": []
      }
    ]
  },
  "meta": {
    "version": "04977cddac816c8b",
    "generatedAt": "2026-09-17T10:57:45.260Z"
  }
}
```
