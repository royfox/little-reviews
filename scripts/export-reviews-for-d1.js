import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, '..');
const reviewsDirectory = path.join(projectDirectory, 'content', 'reviews');
const outputDirectory = path.join(projectDirectory, '.wrangler');
const outputFile = path.join(outputDirectory, 'reviews-import.sql');

const quote = value => value == null ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`;
const files = fs.readdirSync(reviewsDirectory)
  .filter(file => /\.ya?ml$/i.test(file))
  .sort();

const rows = files.map(file => {
  const review = yaml.load(fs.readFileSync(path.join(reviewsDirectory, file), 'utf8'));
  if (!review || typeof review !== 'object') throw new Error(`Could not parse ${file}.`);
  if (!Array.isArray(review.text)) throw new Error(`${file} must contain a text list.`);
  return {
    ...review,
    id: path.basename(file, path.extname(file)),
  };
});

const statements = [
  'DELETE FROM reviews;',
  ...rows.map(review => {
    const now = review.updatedDate || review.reviewDate;
    const values = [
      review.id, review.title, review.author ?? null, review.type, Number(review.rating),
      JSON.stringify(review.text.map(value => String(value).trim())), Number(review.releaseYear),
      review.reviewDate, review.updatedDate ?? null, review.reviewDate, now,
    ];
    return `INSERT INTO reviews (id, title, author, type, rating, text, release_year, review_date, updated_date, created_at, updated_at) VALUES (${values.map(quote).join(', ')});`;
  }),
  '',
];

fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(outputFile, statements.join('\n'));
console.log(`Exported ${rows.length} reviews to ${path.relative(projectDirectory, outputFile)}.`);
