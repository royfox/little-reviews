import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

// Replicate __dirname functionality in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
// We output to 'public' so that Vite/Bundlers copy it to the final 'dist' folder
const PUBLIC_DIR = path.join(__dirname, '../public');
const CONTENT_DIR = path.join(__dirname, '../content/reviews');
const OUTPUT_FILE = path.join(PUBLIC_DIR, 'reviews.json');

console.log('🏗️  Building reviews...');

// 1. Ensure public directory exists
if (!fs.existsSync(PUBLIC_DIR)) {
  console.log(`Creating public directory at ${PUBLIC_DIR}...`);
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

// 2. Ensure content directory exists
if (!fs.existsSync(CONTENT_DIR)) {
  console.log(`Creating content directory at ${CONTENT_DIR}...`);
  fs.mkdirSync(CONTENT_DIR, { recursive: true });
}

// 3. Read all YAML files
const files = fs.readdirSync(CONTENT_DIR).filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));

if (files.length === 0) {
  console.warn('⚠️  No YAML files found in content/reviews.');
  fs.writeFileSync(OUTPUT_FILE, '[]');
  // We don't exit here, we let it finish successfully with empty array
} else {
  // 4. Parse and aggregate
  const reviews = files.map(file => {
    try {
      const fileContent = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8');
      const data = yaml.load(fileContent);
      
      if (!data || typeof data !== 'object') return null;

      // Use filename (without extension) as the stable ID
      const slug = path.basename(file, path.extname(file));
      
      return {
        ...data,
        id: slug // Override/Inject ID from filename
      };
    } catch (e) {
      console.error(`❌ Error parsing ${file}:`, e);
      return null;
    }
  }).filter(Boolean); // Remove nulls

  // 5. Sort by date (newest first)
  reviews.sort((a, b) => new Date(b.reviewDate) - new Date(a.reviewDate));

  // 6. Write to JSON
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(reviews, null, 2));

  console.log(`✅ Successfully built ${reviews.length} reviews to ${OUTPUT_FILE}`);
}