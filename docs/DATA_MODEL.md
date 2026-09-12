# Local Data Model

The app intentionally avoids curriculum/master-data layers.

## Semester

User-defined academic period.

Fields:
- number (optional)
- name
- status: planned/current/completed
- start/end date
- description

Only one semester can be `current` at a time.

## Subject

Belongs directly to one Semester.

Fields:
- code
- name
- status: planned/studying/completed/dropped
- introduction
- my understanding
- importance 1–5
- importance reason
- general note

## Study Note

Represents one actual learning session.

Fields:
- week
- slot
- date
- title/topic
- raw note
- summary
- what I learned
- unresolved points
- mastery 1–5
- status: captured/reviewed/mastered
- optional original TXT/MD file

## Critical Note

Long-term knowledge extracted from the learning process.
Can optionally link back to a Study Note.

## Material

File or external URL belonging to a Subject.

## Lecturer

Stored directly under Subject. No global lecturer directory is required.

## Report

Belongs to Subject and has its own members and files.

## Grade Scheme

One optional scheme per Subject:
- numeric
- pass/fail
- no grade
- custom
