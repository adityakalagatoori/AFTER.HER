# After Her — Asset Manifest (structured)

Canonical record of every real photograph used on the site. This mirrors `assets/ASSET_MANIFEST.md` in the structured format below; both must be updated together. If an asset isn't listed here, it is not a real photograph — see the "what's decorative" note at the bottom.

```json
{
  "id": "IMG-NIRBHAYA-001",
  "case": "AH-003",
  "type": "institutional",
  "description": "Supreme Court of India, New Delhi — exterior entrance (D Gate). No people in frame.",
  "source": "Wikimedia Commons",
  "sourceUrl": "https://commons.wikimedia.org/wiki/File:D_gate_Entrance_of_the_Supreme_Court,_New_Delhi.jpg",
  "originalAuthor": "Pinakpani",
  "date": "2017-09-05",
  "license": "CC BY-SA 4.0",
  "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
  "verified": true,
  "privacyApproved": true,
  "rightsApproved": true,
  "usedIn": ["AH-003 dossier, Chapter 03 — The Legal Journey"],
  "localFile": "assets/supreme-court-of-india.jpg",
  "notes": "A present-day (2017) photograph of the institution, not of the 2017 proceedings. Also institutionally relevant to AH-001 (Mathura), whose final appeal was decided by the same court in 1979, but not used there to avoid implying a contemporaneous image."
}
```

## All six cases now have a verified institutional image

Five background research agents (read-only, no file access) each verified one additional candidate via live fetch of its Commons file page. All five cleared license/author/date verification, and all five were then visually inspected directly (not just metadata-checked) to confirm no identifiable person appears as a subject. Full records for IMG-002 through IMG-006 are in `assets/ASSET_MANIFEST.md` (kept as the canonical human-readable version; summarized here for completeness):

- **IMG-002** — Bombay High Court (AH-001 Mathura) — A.Savin, 2016, FAL
- **IMG-003** — Rajasthan High Court, Jodhpur (AH-002 Bhanwari Devi) — TrendSPLEND, 2020, CC BY-SA 4.0
- **IMG-004** — Punjab & Haryana High Court, Chandigarh (AH-004 Kathua) — Harvinder Chandigarh, 2017, CC BY-SA 4.0
- **IMG-005** — Allahabad High Court (AH-005 Hathras) — Vroomtrapit, 2009, CC0
- **IMG-006** — Gujarat High Court (AH-006 Bilkis Bano) — Yash Y. Vadiwala, 2012, CC BY-SA 3.0

No survivor/victim portraits and no newspaper clippings were sourced for any case — see `assets/ASSET_MANIFEST.md`, "Images NOT included, and why," which still applies in full.

## What's decorative, not real

Everything else visual on the site — paper grain, torn edges, document-stack shadows, folder tabs, redaction-bar styling, pinned source tags, the archive constellation lines, the system diagram — is an original CSS/SVG design element. None of it depicts, simulates, or stands in for a real document, photograph, or person. This distinction is why only this file (and `assets/ASSET_MANIFEST.md`) exists — everything listed here is real and verifiable; everything not listed here is design.
