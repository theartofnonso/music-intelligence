This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Interaction Events (Review Flow)

During the review experience, the client captures lightweight interaction events and batches them to `POST /api/events/batch`.

All events include:

- `sessionId`: stable client session id
- `trackId`: the track being reviewed
- `type`: event kind
- `positionMs`: reference timestamp in the track
- `clientTs`: `Date.now()` on the client
- `payload`: event-specific data

### Reaction Event

- `type`: `arcade_swipe`
- `positionMs`: section midpoint
- `payload`:
  - `sectionIndex`: number
  - `startMs`: number
  - `endMs`: number
  - `swipe`: -1 | 0 | +1
  - `event`: "LIKE" | "DISLIKE" | "NEUTRAL"
  - `weight`: +1 | 0 | -1

Weights:
- LIKE → +1
- DISLIKE → -1
- NEUTRAL → 0 (no action before section end)

### Skip Event

- `type`: `arcade_skip`
- `positionMs`: `fromMs`
- `payload`:
  - `fromMs`: number
  - `toMs`: number
  - `deltaMs`: number
  - `fromSectionIndex`: number
  - `toSectionIndex`: number
  - `event`: "SKIP"
  - `weight`: -1

Use to analyze drop-off latency (e.g., histogram of `fromMs`).

### Replay Event

- `type`: `arcade_replay`
- `positionMs`: `toMs`
- `payload`:
  - `fromMs`: number
  - `toMs`: number
  - `deltaMs`: number
  - `fromSectionIndex`: number
  - `toSectionIndex`: number
  - `event`: "REPLAY"
  - `weight`: +1

Replay frequency can be interpreted as positive engagement. Combine with swipe-derived valence/arousal as needed.
