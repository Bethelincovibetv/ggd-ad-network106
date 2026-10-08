# Project Architecture Rules

- Keep GGD AI's model calls in authenticated Lovable Cloud Edge Functions and persist each user's separate conversations in owner-scoped database tables, so AI credentials stay server-side and chat history stays private across devices.