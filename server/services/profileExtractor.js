/**
 * Extract patient profile fields (name, age, gender, etc.) from blood-report text
 * using regex patterns commonly found in Indian and international lab reports.
 */

export function extractProfileFromText(text) {
  if (!text || typeof text !== 'string') return {};
  const profile = {};

  // Normalize: collapse multiple spaces, keep newlines
  const t = text.replace(/[ \t]+/g, ' ');

  // --- Name ---
  const namePatterns = [
    /(?:patient\s*name|name\s*of\s*patient|patient|name)\s*[:\-–]\s*(.+)/i,
    /(?:mr\.|mrs\.|ms\.|dr\.)\s+([A-Za-z][A-Za-z .']{2,40})/i,
  ];
  for (const re of namePatterns) {
    const m = t.match(re);
    if (m) {
      let name = m[1].trim()
        .replace(/\s*(age|sex|gender|date|ref|lab|sample|report|reg).*$/i, '')
        .replace(/[|/\\]+$/, '')
        .trim();
      if (name.length >= 2 && name.length <= 60) {
        profile.name = name;
        break;
      }
    }
  }

  // --- Age ---
  const agePatterns = [
    /(?:age)\s*[:\-–/]\s*(\d{1,3})\s*(?:years?|yrs?|y\b)?/i,
    /(?:age\s*\/\s*sex|age\s*\/\s*gender)\s*[:\-–]\s*(\d{1,3})/i,
    /\b(\d{1,3})\s*(?:years?|yrs?)\s*(?:old)?/i,
  ];
  for (const re of agePatterns) {
    const m = t.match(re);
    if (m) {
      const age = parseInt(m[1], 10);
      if (age >= 1 && age <= 120) {
        profile.age = String(age);
        break;
      }
    }
  }

  // --- Gender ---
  const genderPatterns = [
    /(?:sex|gender)\s*[:\-–/]\s*(male|female|m|f|other)/i,
    /(?:age\s*\/\s*sex|age\s*\/\s*gender)\s*[:\-–]\s*\d+\s*[/\s]*(?:years?|yrs?)?\s*[/\s]*(male|female|m|f)/i,
    /\b(male|female)\b/i,
  ];
  for (const re of genderPatterns) {
    const m = t.match(re);
    if (m) {
      const raw = m[1].trim().toLowerCase();
      if (raw === 'male' || raw === 'm') { profile.gender = 'Male'; break; }
      if (raw === 'female' || raw === 'f') { profile.gender = 'Female'; break; }
      if (raw === 'other') { profile.gender = 'Other'; break; }
    }
  }

  // --- Date of Birth → compute age if age not found ---
  if (!profile.age) {
    const dobPatterns = [
      /(?:d\.?o\.?b\.?|date\s*of\s*birth|birth\s*date)\s*[:\-–]\s*(\d{1,2})[/\-.]\s*(\d{1,2})[/\-.]\s*(\d{4})/i,
      /(?:d\.?o\.?b\.?|date\s*of\s*birth|birth\s*date)\s*[:\-–]\s*(\d{4})[/\-.]\s*(\d{1,2})[/\-.]\s*(\d{1,2})/i,
    ];
    for (const re of dobPatterns) {
      const m = t.match(re);
      if (m) {
        let year;
        if (m[3] && m[3].length === 4) year = parseInt(m[3], 10);
        else if (m[1] && m[1].length === 4) year = parseInt(m[1], 10);
        if (year && year > 1900 && year < new Date().getFullYear()) {
          const age = new Date().getFullYear() - year;
          if (age >= 1 && age <= 120) {
            profile.age = String(age);
            break;
          }
        }
      }
    }
  }

  // --- Weight (less common in blood reports but some have it) ---
  const weightMatch = t.match(/(?:weight|wt)\s*[:\-–]\s*(\d{2,3}(?:\.\d{1,2})?)\s*(?:kg|kgs?)?/i);
  if (weightMatch) {
    const w = parseFloat(weightMatch[1]);
    if (w >= 20 && w <= 400) profile.weight = String(w);
  }

  // --- Height ---
  const heightMatch = t.match(/(?:height|ht)\s*[:\-–]\s*(\d{2,3}(?:\.\d{1,2})?)\s*(?:cm)?/i);
  if (heightMatch) {
    const h = parseFloat(heightMatch[1]);
    if (h >= 80 && h <= 250) profile.height = String(h);
  }

  return profile;
}
