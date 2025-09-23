# 📚 Documentation Structure

This documentation is organized using [Obsidian](https://obsidian.md/) for better navigation and linking.

## 🗂️ Folder Organization

```
docs/
├── 00-overview/        # Project overview and getting started
├── 01-architecture/    # Architecture documentation and ADRs
├── 02-guides/          # Development and operational guides
├── 03-api/             # API documentation and references
├── 04-features/        # Feature-specific documentation
├── 05-frontend/        # Frontend integration guides
├── 06-testing/         # Testing strategies and guides
├── 07-deployment/      # Deployment and infrastructure
├── 08-maintenance/     # Maintenance and troubleshooting
├── 99-templates/       # Documentation templates
└── assets/             # Images and attachments
```

## 📝 Naming Conventions

### File Names
- Use lowercase with hyphens: `feature-name.md`
- API docs: `{module}-api.md`
- Guides: `{topic}-guide.md`
- Architecture Decision Records: `adr-{number}-{title}.md`

### Document Metadata
All markdown files should include frontmatter:
```yaml
---
title: Document Title
type: guide | api | feature | adr
tags: [relevant, tags]
created: YYYY-MM-DD
updated: YYYY-MM-DD
---
```

## 🔗 Linking
- Use Obsidian wiki-style links: `[[docs/path/to/file|Display Name]]`
- Use relative paths from the root
- Create bidirectional links where appropriate

## 🏷️ Tags
Common tags to use:
- `#architecture` - Architecture-related docs
- `#api` - API documentation
- `#feature/{name}` - Feature-specific docs
- `#guide` - How-to guides
- `#frontend` - Frontend integration
- `#testing` - Testing documentation
- `#deployment` - Deployment docs
- `#maintenance` - Operational docs

## 📄 Templates
Use templates in `docs/99-templates/` for consistency:
- `feature-documentation.md` - For new features
- `api-documentation.md` - For API endpoints
- `architecture-decision-record.md` - For ADRs
- `frontend-integration-guide.md` - For frontend guides

## 🚀 Getting Started with Obsidian
1. Download [Obsidian](https://obsidian.md/)
2. Open this repository as a vault
3. The `.obsidian/` folder contains pre-configured settings
4. Use `Cmd/Ctrl + P` to quickly search and open files
5. Use the graph view to visualize document relationships

## 📊 Document Status
- `draft` - Work in progress
- `review` - Ready for review
- `approved` - Reviewed and approved
- `deprecated` - No longer maintained

## ✅ Checklist for New Documents
- [ ] Use appropriate template from `99-templates/`
- [ ] Add frontmatter with metadata
- [ ] Include relevant tags
- [ ] Create links to related documents
- [ ] Place in correct folder
- [ ] Follow naming conventions
- [ ] Update index if needed