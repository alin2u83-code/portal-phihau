# Knowledge Base Operating Rules

## Folder Roles
- `raw/` — inbox for source material (user drops files here)
- `wiki/` — maintained by Claude (structured articles)
- `output/` — query results and generated reports

## Linking
- Always use [[wiki links]] to connect related concepts across topics

## Compile Workflow (triggered by "compile")
1. Read each unprocessed file in `raw/`
2. Determine topic(s)
3. Create `wiki/<topic>/` folder if it doesn't exist
4. Create or update `wiki/<topic>/_index.md` (topic overview + article list)
5. Create article files inside the topic folder
6. Update `wiki/_master-index.md`
7. If a raw file spans multiple topics → create articles in both + cross-link

## Article Standards
- Bullet points over paragraphs
- Every article must include a `## Key Takeaways` section

## Navigation (when answering questions)
1. Read `wiki/_master-index.md` to find relevant topic(s)
2. Read `wiki/<topic>/_index.md` for topic structure
3. Read specific articles as needed

## Audit / Lint (triggered by "audit" or "lint")
- Review wiki for: inconsistencies, broken links, gaps, improvement suggestions
