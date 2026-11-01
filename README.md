# PHC Register Unifier

**An AI-assisted patient record unification prototype for Primary Health Centres (PHCs) in India.**

## Problem Statement

Primary Health Centre staff may need to work with patient information scattered across different registers and program-specific records. Retrieving a patient's previous information can consume time that could otherwise be spent on patient care.

## Proposed Solution

PHC Register Unifier demonstrates a workflow for uploading patient records, reviewing extracted information, linking records to demo patient IDs, and viewing a consolidated chronological timeline.

## Key Features

- **Document Upload:** Supports JPG, PNG, and PDF sample records.
- **Information Extraction:** Extracts or demonstrates extraction of patient fields for staff review.
- **Staff Verification:** Allows staff to review and correct extracted information before saving.
- **Demo Patient Identification:** Assigns demo patient IDs and supports confirmation of suggested record matches.
- **Patient Timeline:** Organizes records chronologically with program-based filtering.
- **CSV Export:** Exports filtered records for further analysis.
- **Demo Access:** Provides a simple demonstration login.

## Technology Stack

- TypeScript
- React-based frontend
- Vite
- TanStack Start
- Additional dependencies are listed in `package.json`.

## Live Demo

https://phc-register-unifier.lovable.app

## Run Locally

Prerequisites: Node.js and npm.

```bash
git clone https://github.com/ASMA31-pixel/PHC-Register-Unifier.git
cd PHC-Register-Unifier
npm install
npm run dev
```

Follow the terminal output to open the local development server.

## Data and Safety

- Use fictional patient information for demonstrations.
- Staff verification is required before extracted information is treated as an approved record.
- This is a hackathon prototype, not a production-ready medical records system.
- It does not claim official integration with Indian government health systems or production-level medical accuracy.
- Do not upload real patient records or sensitive personal information.

## Project Status

Hackathon demonstration prototype. Features should be evaluated using the live application and its source code.

---

Built with [Lovable](https://lovable.dev/).
