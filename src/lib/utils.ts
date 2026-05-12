export function getInitials(name: string | null | undefined): string {
  if (!name) return 'IQ'
  
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return 'IQ'
  
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
