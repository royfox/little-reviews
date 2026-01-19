# Little Reviews

A static, file-based React application for rating and reviewing media. Reviews are stored as YAML files and compiled into a JSON api for the frontend.

## Features

- **Static Architecture**: No database required at runtime. Content lives in the repository.
- **YAML Content**: Easy to edit, human-readable data files.
- **Search & Filter**: Instant filtering by media type, rating, or text.

## Prerequisites

- Node.js (v18+)
- npm

## Local Development

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Generate Content**
   The app relies on a `reviews.json` file generated from the YAML files in `content/reviews/`.
   ```bash
   node scripts/build-reviews.js
   ```

3. **Start Dev Server**
   ```bash
   npm run dev
   ```
   Open http://localhost:5173 to view the app.

## Managing Content

To add a review, you can use the UI or create a file manually.

### Option A: Using the UI
1. Click "New Review File" in the app.
2. Fill out the form.
3. Click "Download YAML".
4. Move the downloaded file into the `content/reviews/` folder of this project.
5. Run `node scripts/build-reviews.js` to update the content.

### Option B: Manually
Create a `.yaml` file in `content/reviews/`:

```yaml
id: "unique-id"
title: "Movie Title"
type: "Movie"
rating: 5
releaseYear: 2024
reviewDate: "2024-03-20T12:00:00.000Z"
text: |
  Review text here.
```

## Deployment

### Netlify
This project is configured for Netlify.
1. Link your repository to Netlify.
2. The `netlify.toml` file will automatically configure the build settings:
   - **Command**: `npm install && node scripts/build-reviews.js && npm run build`
   - **Output**: `dist`
