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

## Regression checks

```bash
npm ci
npm test
npm run build
npm run start -- --port 3001
```

In another terminal, run `npm run test:browser`. Install the matching browser with
`npx playwright install chromium`, or set `CHROMIUM_PATH` to an installed Chromium
binary (for this cloud environment: `/usr/bin/chromium`). `BASE_URL` can override
the default test server at port 3001; `QA_ARTIFACTS` selects the screenshot directory.
The tests cover all three pages, disabled WebGL/context loss, mobile input, simulator
retry and service-worker storage preservation/offline navigation.

Use the Vercel **Next.js** preset. The application requires the standard Next runtime
for host-based routing; remove any manually configured `out` output directory.
Fonts are bundled locally with their license. See [the detailed bug audit](docs/bug-audit.md)
for architecture, diagnosed fixes and the remaining lint/production-validation limits.
