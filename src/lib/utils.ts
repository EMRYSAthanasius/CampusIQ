export function getInitials(name: string | null | undefined): string {
  if (!name) return 'IQ'
  
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return 'IQ'
  
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function formatCourseTitle(code: string, title: string): string {
  const cleanCode = code.trim().toUpperCase();
  const cleanTitle = title.trim();
  const lowerTitle = cleanTitle.toLowerCase();
  const lowerCode = cleanCode.toLowerCase();

  // If the title matches patterns like "course csc101", "course: csc101", "csc101 course"
  if (
    lowerTitle === `course ${lowerCode}` ||
    lowerTitle === `course: ${lowerCode}` ||
    lowerTitle === `course:${lowerCode}` ||
    lowerTitle === lowerCode ||
    lowerTitle === 'course'
  ) {
    return `Course: ${cleanCode}`;
  }

  // If the title contains the word "course" and the code
  if (lowerTitle.includes('course') && lowerTitle.includes(lowerCode)) {
    return `Course: ${cleanCode}`;
  }

  // If the title is generic or placeholder-ish
  if (lowerTitle.startsWith('course ') || lowerTitle.startsWith('course:')) {
    return `Course: ${cleanCode}`;
  }

  // If the title already contains the course code (e.g. "CSC101: Introduction..."), return title as is
  if (lowerTitle.includes(lowerCode)) {
    return cleanTitle;
  }

  // Standard case: "Code: Title"
  return `${cleanCode}: ${cleanTitle}`;
}

export function htmlToPlainText(html: string): string {
  let text = html;
  
  // 1. Remove head, style, script, svg, iframe, noscript, header, footer, nav
  text = text.replace(/<head[^>]*?>[\s\S]*?<\/head>/gi, '');
  text = text.replace(/<style[^>]*?>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<script[^>]*?>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<svg[^>]*?>[\s\S]*?<\/svg>/gi, '');
  text = text.replace(/<iframe[^>]*?>[\s\S]*?<\/iframe>/gi, '');
  text = text.replace(/<noscript[^>]*?>[\s\S]*?<\/noscript>/gi, '');
  text = text.replace(/<header[^>]*?>[\s\S]*?<\/header>/gi, '');
  text = text.replace(/<footer[^>]*?>[\s\S]*?<\/footer>/gi, '');
  text = text.replace(/<nav[^>]*?>[\s\S]*?<\/nav>/gi, '');

  // 2. Replace common structural tags with newlines to preserve question boundaries
  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<br[^>]*?>/gi, '\n');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<\/tr>/gi, '\n');
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');

  // 3. Strip all remaining HTML tags
  text = text.replace(/<[^>]*?>/g, '');

  // 4. Decode HTML entities
  const entities: Record<string, string> = {
    '&nbsp;': ' ',
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&',
    '&quot;': '"',
    '&apos;': "'",
    '&#39;': "'",
    '&cent;': '¢',
    '&pound;': '£',
    '&yen;': '¥',
    '&euro;': '€',
    '&copy;': '©',
    '&reg;': '®',
    '&deg;': '°'
  };
  text = text.replace(/&[a-z0-9#]+;/gi, (match) => entities[match.toLowerCase()] || match);

  // 5. Normalize whitespace and newlines
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n\s*\n/g, '\n\n');

  return text.trim();
}


