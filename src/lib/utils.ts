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

