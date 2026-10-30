# Phc Register Unifier

Read the attached PHC Register Unifier Build Plan and use it as the main specification. Build a functional web application for a hackathon demo.

Prioritize:

1. Upload JPG, PNG, and PDF sample records.

2. Extract patient information, using working OCR if feasible and clearly labelled sample extraction otherwise.

3. Let staff review, correct, and approve extracted fields before saving.

4. Assign demo patient IDs and let staff confirm suggested record matches.

5. Display a chronological patient timeline with program filters.

6. Export filtered records to CSV.

7. Provide a simple demo login or clearly labelled demo access.

Use fictional patient data only. Create a professional, responsive PHC dashboard with working interactions, not just a static mockup. Keep the implementation feasible, avoid unnecessary integrations, and do not claim production-level medical accuracy or official government-system integration.

After building, test the main workflow and fix any errors that prevent the app from running.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://phc-register-unifier.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8ee34bd0-bc93-4c57-b7c6-973ce22ddd45).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
