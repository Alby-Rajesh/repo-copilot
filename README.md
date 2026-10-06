# Repo Copilot: an agent for GitHub repositories

Point it at a GitHub repository and ask how something works or what is broken. A tool-calling agent on Groq searches the code, opens files, checks commit history, and answers with `path:line` references. When it finds a real bug it drafts a GitHub issue, which you review and edit before anything is posted.

## Architecture

```
Index:  GitHub tree → filter source files → fetch (8 in parallel)
        → line chunks (60 lines, 10 overlap) → Gemini embeddings
        → Supabase: content + identifier terms + tsvector + pgvector

Agent loop (max 8 steps, Groq tool calling):
  question → LLM chooses a tool → run it → feed result back → repeat
     ├─ search_code     hybrid keyword + vector search, RRF fused
     ├─ read_file       exact lines from GitHub
     ├─ list_files      indexed layout
     ├─ recent_commits  history for repo or file
     └─ draft_issue     stored as a draft only
  → answer + step trace + code sources + optional issue draft

Human in the loop: you edit the draft → POST /api/issue → GitHub issue
```

Code search splits identifiers, so a question about "user by id" still matches `getUserById` by keyword, not just by meaning.

## Project structure

```
src/
  app/
    api/agent/route.ts     run the agent
    api/index/route.ts     index a repository
    api/issue/route.ts     post an approved issue
    layout.tsx
    page.tsx
    globals.css
  components/
    AskForm.tsx
    CodeSources.tsx
    IssueDraftPanel.tsx
    RepoPanel.tsx
    StepTrace.tsx
  lib/
    agent/
      prompt.ts            system prompt
      run.ts               tool-calling loop
      tools.ts             tool schemas and handlers
    chunk.ts               line chunking
    client.ts
    concurrency.ts         bounded parallel map
    db.ts
    embed.ts
    env.ts
    github.ts              GitHub REST client
    groq.ts
    http.ts
    indexer.ts             repo → chunks → embeddings → database
    repos.ts
    search.ts              hybrid code search
    tokens.ts              identifier splitting and keyword queries
  types/index.ts
supabase/schema.sql
```

## Step by step

### 1. Get the keys

- Groq: https://console.groq.com/keys
- Gemini: https://aistudio.google.com/apikey
- Supabase: free project at https://supabase.com/dashboard. Copy the Project URL and `service_role` key from Project Settings → API.
- GitHub token: https://github.com/settings/personal-access-tokens/new. Create a fine-grained token with Contents: read-only and Issues: read and write on the repositories you want to use. Without a token GitHub allows only 60 requests an hour, which is not enough to index a repo.

### 2. Create the database

Use a separate Supabase project from Project 1, or the same one; the table names do not clash. Paste `supabase/schema.sql` into SQL Editor and run it.

### 3. Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000, enter `owner/name`, click Index repo, then ask a question.

### 4. Push to GitHub and deploy

Same as Project 1: push the repo, import it at https://vercel.com/new, and add all keys from `.env.example` as environment variables.

### 5. Test the API

```bash
curl -X POST https://<your-app>.vercel.app/api/index \
  -H "Content-Type: application/json" -H "x-admin-key: <ADMIN_KEY>" \
  -d '{"repo":"<owner>/<name>"}'

curl -X POST https://<your-app>.vercel.app/api/agent \
  -H "Content-Type: application/json" \
  -d '{"repo":"<owner>/<name>","question":"How is authentication handled?"}'
```

## Good demo questions

- How does a request flow from the API route to the database?
- Where are errors handled, and is anything swallowed silently?
- What changed recently in the auth code, and could it break login?
- Find input that is never validated and draft an issue for it.

## Limits to know

- Indexing takes the first 150 supported files under 100 KB each, README first and docs last. Change `MAX_FILES` in `lib/indexer.ts`.
- Indexing a mid-size repo can take a few minutes on the Gemini free tier. The route allows up to 300 seconds.
- On the Groq free tier, long agent runs can hit tokens-per-minute limits. If that happens, set `GROQ_MODEL=openai/gpt-oss-20b` or lower `MAX_STEPS` in `lib/agent/run.ts`.
- File contents are treated as untrusted data, and issues are only posted after you approve them.

## Ideas to extend

- Stream each agent step to the UI as it happens.
- Re-index incrementally from a GitHub webhook on push.
- Add a `propose_patch` tool that drafts a diff for a pull request.
- Log runs and score answers against a small benchmark of questions.
