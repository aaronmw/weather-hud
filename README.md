This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
pnpm dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [https://weather-hud.localhost](https://weather-hud.localhost) with your
browser. The dotfiles-managed router proxies it to strict upstream
`127.0.0.1:3035`.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Netlify

This project is set up for local Netlify deploys. Run these once if the repo is not linked to the Netlify site yet:

```bash
pnpm dlx netlify-cli@26.1.0 login
pnpm dlx netlify-cli@26.1.0 link
```

Then deploy from this machine:

```bash
pnpm deploy:prod
```

`deploy:prod` runs a local Netlify build, then publishes the production deploy. If you have already run `pnpm netlify:build` and only want to upload that existing output, use:

```bash
pnpm deploy:prod:no-build
```

For a draft deploy, run `pnpm deploy:preview`.
