# Use Vite for the game client

The first release is a client-rendered, guest-only game with no profiles, history, SEO, or application server endpoints. We will use React with Vite instead of the originally proposed Next.js so the game can ship as static assets while its authoritative realtime service remains independently deployable; adopting SSR or a full-stack framework would add complexity without serving a current requirement.
