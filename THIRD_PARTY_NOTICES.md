# Third-party notices

## React Bits / Um só.

Aurora shader adapted from the runtime component in the user-supplied catalogue:

- Catalogue: https://teste-plataforma-delta.vercel.app/
- Component: https://teste-plataforma-delta.vercel.app/code/runtime/reactbits--aurora.json
- Upstream: https://reactbits.dev/backgrounds/aurora
- License: MIT + Commons Clause License Condition v1.0, copyright (c) 2026 David Haz.
- Full license included at `dist/licenses/react-bits.txt`.

The shader is integrated into this Quick GO website, not offered as a separate component product. Spotlight Card, Split Text and Star Border informed the lightweight HTML/CSS interactions; their standalone React components are not redistributed here.

## Fonts

Instrument Serif and DM Sans are provided under the SIL Open Font License. License files accompany the bundled fonts in `dist/licenses/`.

## Model viewer

The previous product presentation used Google model-viewer 3.3.0, the same viewer family identified in the supplied Coffee-Tech reference. The bundled viewer retains its source notices. Its Apache 2.0 license is included in `dist/licenses/model-viewer.txt`.

The Quick GO GLB is a newly authored visual reconstruction from the user's supplied machine photographs. It is not the Coffee-Tech model, a manufacturer CAD file, or a manufacturing specification.

## Reference structure

Coffee-Tech (`https://www.coffee-tech.com/`) was inspected as the user-requested layout and interaction reference. Its brand assets, roaster model, testimonials, contact details, tracking and application scripts are not included in this website. The implementation uses Quick GO content and newly authored layout code.

## Quick GO media

Logos, photography and source videos were supplied by the user. They remain subject to the rights of their respective owners. Only a curated selection is included in the site. Internal source documents are excluded.

## Catalogue icons
Animated icon SVG geometry was retrieved from the Animate UI / Hugeicons entries of the user-supplied Um só catalogue (sparkles, zap, heart, play, arrow-down-01). Motion is adapted to CSS. Source: https://animate-ui.com/docs/icons/hugeicons .


## Current Three.js hero

The complete-machine hero uses Three.js 0.187.0 and its GLTFLoader and RoomEnvironment addons under the MIT license, included in `dist/licenses/three.txt`. It no longer loads model-viewer or any previous cup viewer. esbuild bundles the scene for static hosting; Playwright Core is a development-only test dependency. The new GLB is authored from the user's eight visual references and contains full volumetric geometry with an open dispenser. The reference poster is user-supplied media and is not used to simulate rotation.


## Supplied CardStack

CardStack source was supplied by the user in `cardstack-07ba0d.zip`, with the archive notices retained in `dist/licenses/card-stack/`. The React implementation preserves its fan geometry, spring transitions, depth and drag interaction. Static native anchors replace `next/link`, and scoped CSS replaces Tailwind classes; a Next.js server is not needed. React, React DOM, Framer Motion and Lucide React are installed and bundled into the lazily loaded module; dependency licenses accompany the site. The stock car demo imagery and its outbound commercial links are not used.
