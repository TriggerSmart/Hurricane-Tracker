# Landfall Desk

A single-page, dark broadcast dashboard using HTML, CSS and vanilla JavaScript. No server-side code, API keys, build, or npm installation is needed to run it. Live weather is fetched in the visitor’s browser. No sample storms, fake warnings, fabricated social posts or invented camera locations are displayed.

## Run locally

From this folder:

```sh
python -m http.server 8000
```

Open http://localhost:8000/. ES modules and GeoJSON must be served over HTTP; do not double-click index.html.

## GitHub Pages

Copy this folder’s contents to a `gh-pages` branch or to your repository’s `/docs` directory. Entry file `index.html` must be at the published root. In GitHub **Settings → Pages**, select **Deploy from a branch**, choose your branch and `/ (root)` or `/docs`, then save. GitHub serves it over HTTPS. All asset paths are relative, so repository subpaths work. No secrets or Actions build are needed.

## Broadcast controls

- `1`: Map; `2`: Landfall focus; `3`: Camera wall; `4`: Alerts.
- `f`: toggle follow storm; `m`: mute/unmute warning tone; `Esc`: close foremost camera.
- Camera wall opens up to four matching embedded camera players or refreshing snapshots. External camera pages remain labeled source links. Cameras are draggable by their title bars and resizable at the lower-right corner. Their geometry, open IDs and layer switches persist locally.
- Bottom-left 320 × 180 px facecam safe zone is reserved at desktop broadcast sizes. Camera panels are clamped away from it; the guide is hidden on narrow/mobile or very short windows where it cannot fit. Quiet mode hides rail, tools and bezels; the official disclaimer stays visible.
- Hash stores storm ID, center, zoom, map background, graphic palette, satellite date and open camera IDs. An explicit saved view wins over initial auto-centering. Follow waits 60 seconds after operator pan/zoom; choosing a coast turns follow off.
- Use a 1920 × 1080 OBS Browser Source pointing to the HTTPS page, and **Interact** for controls. Browser-source keyboard input is subject to OBS focus. Text is scaled for 1080p and 1440p. Browser WebGL and access to the CDN/tile hosts are necessary.
- Sound starts muted. Only new tornado, flash-flood, extreme-wind, hurricane and storm-surge **Warnings** trigger a short tone. Existing warnings on first load are listed without a tone. Enable sound with a user gesture.

## Tracker, backgrounds and panel controls

The hurricane tracker shows the latest advisory center, sustained wind and gusts (mph/knots), central pressure (millibars), bearing and forward motion, and distance to the estimate. It refreshes NOAA feeds every five minutes; these are advisory measurements, not continuous position updates. The 3-hour motion arrow scales the reported speed/bearing and is labeled as a motion vector, **not** a predicted track. Closing speed projects reported motion toward a fixed estimate and can show motion away. Forecast-average speed sums supplied track segments to the crossing and divides by the advisory-to-estimate interval; it never changes merely because the wall clock advances. Missing/sentinel values remain unavailable.

Map background controls switch between black with white borders/text, dated NASA NOAA-20 VIIRS daily true-color satellite imagery, and OpenTopoMap terrain/contours. NASA imagery defaults to the previous UTC day to reduce incomplete daily coverage, may contain clouds/gaps, and has native zoom9 tiles; the date control can select an available day. It is not live high-resolution aerial imagery. Failed raster backgrounds restore the black vector map without dropping weather layers. Graphic palettes offer cyan/amber, blue/orange and white/gold; radar product scales and red tornado/green flood meanings stay intact. Sources are attributed in the map and footer. Sources: https://nasa-gibs.github.io/gibs-api-docs/ and https://wiki.opentopomap.org/about.

Both side panels have a hamburger edge handle. Collapse them to leave the handle at the edge; reopen with the same button. Preferences persist locally. Alert accordions group tornado warnings (red), flood warnings (green), and other alerts (amber). The default scope intersects NWS polygon geometry with the current map extent; All US & territories also lists alerts without geometry. World-wrap views are normalized. NWS alerts without a polygon cannot be assigned to a map location.

## Radar products, replay and tornado notifications

Select National reflectivity, station reflectivity, base velocity, storm-relative velocity, correlation coefficient (CC), differential reflectivity (ZDR), hydrometeor classification or one-hour rainfall. Pick a station or Use nearest radar. NOAA supplies exact scan times through WMS for supported products; IEM supplies storm-relative scans; CC/ZDR use anonymous NSF Unidata NEXRAD Level III files decoded locally in a Web Worker. Radar station identifiers retain K/P/T prefixes. Each product keeps its native scientific units; velocity measures radial motion toward/away from the radar, not hurricane forward speed.

CC/ZDR decoder supports NOAA products 161/159, digital radial packet 16, with big-endian scale/offset values, BZip2 symbology, missing/range-folded flags and a 300 km source range. Source gates are 250 m; the display samples a 768×768 Web Mercator raster (~800 m at center), which is coarser than a commercial native-gate renderer. Browser support for Web Workers and OffscreenCanvas is required for these two products; unavailable products show an error rather than substituting another field. Local vendored seek-bzip 2.0.0 and buffer 6.0.3 provide the decoder, with license files included; no installation is needed to run.

Choose 3/6/12/24 observed frames. Available source history may contain fewer frames than requested (RainViewer fallback currently provides up to 8). Play loops the chosen scans; Pause, Stop or scrubbing holds the displayed frame through refreshes. Live resumes latest-frame following. Refresh radar re-queries scans and preserves a deliberate freeze. The forecast path/points and cone can be toggled independently in Map layers.

New in-scope tornado warnings trigger a three-tone sound, a banner, a red polygon with a thick outline, and a temporary white emphasis outline using the exact NWS geometry. Expired/withdrawn polygons disappear after a successful feed refresh; Locate polygon focuses that warning with viewport-sized padding. Other supported warning types use a short tone. Browsers require one user gesture for audio: click Enable warning sound or Enable + test sound. Existing warnings on first load are displayed without a notification tone. The dashboard refreshes NWS alerts every 60 seconds; it is not a continuous commercial radar subscription.

## Feeds and attribution

The footer grows only when a source is actually requested (including a failed request). Camera agency attribution is added when its image is requested. Local operator data is attributed separately from verified agency feeds. MapLibre’s map attribution stays available.

| Feed | URL | Refresh | Attribution / behavior |
| --- | --- | --- | --- |
| MapLibre GL JS 5.6.1 | https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/5.6.1/maplibre-gl.min.js | On load | Pinned library and stylesheet, CDN-provided SHA-512 SRI |
| OpenFreeMap Liberty | https://tiles.openfreemap.org/styles/liberty | Map tile requests | OpenFreeMap · © OpenMapTiles · © OpenStreetMap contributors (ODbL) |
| OpenFreeMap Bright fallback | https://tiles.openfreemap.org/styles/bright | On style failure | Same attribution; surface colors adjusted for broadcast |
| NOAA NHC ArcGIS | https://mapservices.weather.noaa.gov/tropical/rest/services/tropical/NHC_tropical_weather_summary/MapServer | 5 min | NOAA / NWS / NHC / CPHC; independent queries for layers 5, 6, 7, 8, 10, 11, 15, 16 |
| NHC current systems | https://www.nhc.noaa.gov/CurrentStorms.json | 5 min | NOAA National Hurricane Center; browser CORS may block it |
| NHC advisory text | URL supplied by the selected system’s `publicAdvisory.url` | On advisory change | Official excerpt if readable, otherwise an official product link |
| NWS alerts | https://api.weather.gov/alerts/active?status=actual | 60 sec | National Weather Service; `Accept: application/geo+json, application/json`; pagination followed |
| IEM radar | https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::USCOMP-N0Q-0/{z}/{x}/{y}.png | 90 sec | Iowa Environmental Mesonet / NWS NEXRAD; 3/6/12/24 frame loop choices; six aliases from -25 minutes to latest, longer loops use explicit archive timestamps and a 10-minute ingest delay; composite times are labeled APPROX |
| RainViewer fallback | https://api.rainviewer.com/public/weather-maps.json | 90 sec once fallback is needed | Weather data by RainViewer; returned tile host/path, free maximum native zoom 7, overscaled at higher zoom |
| IEM LSR | https://mesonet.agron.iastate.edu/geojson/lsr.php?hours=6 | 5 min | Iowa Environmental Mesonet / NWS; tornado, hail, wind and flood **reports**, not GPS chasers |
| Nominatim | https://nominatim.openstreetmap.org/search and /reverse | Only on operator search/map click | © OpenStreetMap contributors (ODbL); cached, sequential ≥1.1s between requests, no autocomplete |
| Natural Earth coastline | https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_coastline.geojson | Bundled | Made with Natural Earth, public domain |
| Natural Earth country masks | https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson | Used only to select bundled shoreline segments | Natural Earth, public domain |
| Caltrans CWWP2 District 5 | https://cwwp2.dot.ca.gov/data/d5/cctv/cctvStatusD05.json | Catalog bundled; image interval per record, usually 120 sec | Camera: Caltrans; agency image URLs copied into `data/cameras.json` |

NOAA query format: `/{layer}/query?f=geojson&where=1%3D1&outFields=*&outSR=4326&resultOffset=0&resultRecordCount=2000`; subsequent pages are requested if needed. ArcGIS `tau` is the forecast point’s hour; `fcstprd` can be the 120-hour product horizon and is not used as the individual forecast hour.

### Cameras

The bundled catalog has **63 entries**: 25 published camera players (24 CouchTourist embeds plus Perdido Key OG), 9 official EarthCam camera pages, 24 permitted Caltrans refreshing snapshots, and 5 other coastal camera pages/hubs. Multi-view provider pages may contain several cameras. The catalog is browsable even with no active storm; filter by provider, camera type, place/state, or coordinate-verified distance. Empty distance results expand to the catalog with an explicit label.

- Embedded player URLs and required attribution links come from the providers’ published embed code. Players load only when opened, preserve their controls and offer manual Refresh plus a source-page link. A loaded iframe is **not proof that live video is playing**; providers can show offline or blocked streams.
- EarthCam allows public links and prohibits framing its pages/images without licensing. Its entries open the official player page in a new tab; no EarthCam frames or images are embedded. Policy: https://www.earthcam.com/site/linktous.php and https://www.earthcam.com/faq.php.
- Caltrans snapshots refresh at the official interval, with a cache-busting manual refresh in each panel and a Refresh open cams button. Snapshots are clearly labeled; image receipt time is not a claim about image capture time.
- New coastal entries have verified locality labels but no supplied exact camera coordinates. They have **no fabricated map pins or distance readings**. The 24 Caltrans positions come from the agency catalog. All-distance view includes coastal entries without coordinates; the 150-mile view can only locate records with coordinates.
- Camera-source provenance and per-record source/permission links are in `data/camera-sources.json` and `data/cameras.json`. The publishing/embedding pages were retrieved on 2026-10-08; playback could not be browser-verified in the authoring environment.
- The operator form still supports additional public snapshots the operator has permission to use. Houston TranStar and FL511 raw image hotlinks remain excluded because their terms require permission. Their public provider pages can be opened independently.

## Nominatim policy

The user explicitly selected Nominatim for this single-operator weather dashboard. Read https://operations.osmfoundation.org/policies/nominatim/ before operating it. Submit-only searches and intentional map clicks use cached requests. Browsers cannot set User-Agent; the page sends its normal identifying Referer. An Accept header cannot identify an app. Do not apply a no-referrer policy to geocoding.

The public limit applies across **all users of an application**, not separately to each visitor. This static implementation throttles one host’s browser. For shared high-traffic use, change `geocoderBase` in `data/config.json` to a provider you may use; do not run a multi-user public geocoder on this configuration. No lookup is polled or triggered by panning. This is a weather dashboard, not a generic geocoding service.

## Landfall estimate

Forecast points are grouped by real NOAA `idp_subset` storm IDs and sorted by `tau`. Each adjacent track segment is tested against bundled Natural Earth 1:110m US coastal lines. The first intersecting segment supplies its endpoint’s valid time and forecast hour; the displayed position is the line intersection. **This intentionally does not interpolate landfall time inside a forecast segment.** The UTC `validtime` day/time is resolved against the advisory’s month with month rollover handling. If no validtime exists, an advisory timestamp plus tau is used. Issuance time and forecast initialization can differ, so supplied validtime takes priority.

If there is no crossing, the timer targets the nearest future forecast point to the included US coastline, labeled **closest approach**, with a “no landfall in the current forecast” note. This is nearest among supplied points, not a continuous optimization or an official landfall prediction. A reached/past forecast timestamp is labeled **Forecast time reached**, never replaced with a fictional future time. A new estimate differing by more than 15 minutes flashes the card.

The coarse shoreline excludes Alaska and foreign coasts; covers CONUS, Hawaii and Puerto Rico where Natural Earth resolves them. USVI, small islands, barrier beaches and fine bays can be missing at 110m. The estimate may miss or shift crossings near these features. Official forecasts and impacts take priority. The cone does not describe the footprint of damage.

## Honest failure behavior

Each source has an independent status in Sources. On failure, previously received data stays on screen as stale; no fake replacement is drawn. No active systems is distinct from an unavailable feed. NHC text/current systems can be CORS-blocked even while ArcGIS works. Radar tile probing falls back to RainViewer, whose frame timestamps are supplied by its metadata. Infrared is exposed only when fallback metadata has an actual frame. No verified lightning API is used, so no lightning toggle or strikes are drawn. No Esri imagery is requested.

NWS products with `geometry: null` remain in the warning rail with a “no polygon” note; their area is not invented. A map-click polygon query therefore cannot rule out all alerts at a location. NWS warning tones are not an emergency notification system.

Default resource links open NHC, NWS and NASA without an account. X/TikTok searches were removed from the default flow. Clip links and optional operator-selected YouTube iframes are manual; provider embedding restrictions degrade to an open-source link. No social scraper, API token or purported live social firehose is present.

Manual chasers start with `data/chasers.json` equal to `[]`. Schema:

```json
{"name":"Operator label","lat":0,"lon":0,"note":"Operator note","sourceUrl":"https://public-source.example/","updated":"2026-10-08T00:00:00Z"}
```

All manual pins are visibly marked operator-entered/not verified. LocalStorage stores operator additions, clips, camera geometry and toggles on that browser only. Disabling storage leaves session tools functional.

## Verification

Core and feed-adapter tests need Node.js only (for development verification, not site runtime):

```sh
node --test tests/*.test.mjs
```

All 38 automated tests pass, covering UTC rollover, tau/horizon distinctions, geometry intersections, closest approach, empty feeds, polygon holes and world wrapping, event filtering, unsafe URLs, YouTube host validation, advisory matching, movement units, alert pagination, feed errors, map backgrounds, camera filtering and Level III radar decoding. Independent code review findings were addressed. Six additional DOM scenarios verified active storms with out-of-order responses, no storms, blocked feeds, catalog failure, WebGL failure, radar product switching, warning appearance/withdrawal, restored views, collapsible panels, map modes, frozen playback, frame counts, the camera catalog and player reloads. These authoring checks use test fixtures and a map boundary stub; they do not verify actual WebGL rendering, live video playback or browser CORS.

Live source HTTP/CORS checks verified NOAA station velocity images, NASA GIBS satellite tiles, OpenTopoMap terrain tiles, IEM scan metadata and public NEXRAD Level III files. The real CC fixture was decoded and checked against NOAA/MetPy product definitions; the browser decoder was also exercised with no Node Buffer global. Full visual/WebGL browser QA could not be performed in the authoring environment because its supervised preview service failed with a container mount-permission error. Before your first live broadcast, serve it from your Pages URL and check base-map labels, feeds and camera panel controls in your browser and OBS. Feed and camera availability can change after verification.
