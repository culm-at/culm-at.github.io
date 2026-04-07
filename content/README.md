# Content Sources

The main website ingests decentralized content from app repositories.

Each source repository should expose content at:

```text
site/
  index.md
  nav.yml
  *.md
  assets/
```

The source configuration is defined in `content/sources.json`.

## Local development

1. Run `npm run setup:sources`.
2. If repositories are missing, follow the printed guidance or run with `--clone`.
3. Start dev server with `npm run dev`.

## Page frontmatter contract

Each Markdown page should include:

- `title` (string, required)
- `description` (string, required)
- `section` (string, required)
- `order` (number, required)
- `slug` (string, optional)
- `draft` (boolean, optional)
- `updated` (string, optional)
- `nav_title` (string, optional)
