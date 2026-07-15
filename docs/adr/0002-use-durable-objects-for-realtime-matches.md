# Use Durable Objects for realtime matches

Online play requires authoritative room state, persistent WebSockets, clocks, matchmaking, and reconnectable seats without a database in the first release. We will use one Cloudflare Durable Object per match and a separate coordinator for the casual queue, accepting Cloudflare platform coupling in exchange for serialized room execution, WebSocket hibernation, and minimal server operations.
