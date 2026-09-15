# Study Projects — v2.4.0

This release adds a first-class self-directed learning workspace.

## Example

Create a project called **RAG — Retrieval-Augmented Generation** and build a roadmap such as:

1. Embeddings
2. Vector databases
3. Chunking strategies
4. Retrieval
5. Reranking
6. Generation
7. Evaluation
8. Final demo

Each project can store notes, files/links, experiments, and distilled knowledge independently from semesters.

## Local data

The database migration is automatic when the app starts. Existing semester and subject data is preserved. Project files are stored under the app data folder in `files/study-projects/<project-id>/`.

## Backup

Existing backup/restore includes Study Project database records and local project files.
