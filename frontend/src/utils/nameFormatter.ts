/**
 * Formats a username to display as "First Last" format
 * Converts lowercase usernames like "snoopdogg" to "Snoop Dogg"
 * Handles various name patterns including single names and multiple words
 */
export function formatUserName(username: string): string {
  if (!username) return '';

  // If username already has spaces and proper capitalization, return as is
  if (username.includes(' ') && username !== username.toLowerCase()) {
    return username;
  }

  // Common name mappings for famous people and standard names
  const nameMappings: { [key: string]: string } = {
    // Famous singers/rappers (all with first and last names)
    snoopdogg: 'Snoop Dogg',
    taylorswift: 'Taylor Swift',
    dojacat: 'Doja Cat',
    kendricklamar: 'Kendrick Lamar',
    arianagrande: 'Ariana Grande',
    marshallmathers: 'Marshall Mathers', // Eminem (replaces Drake)
    billieeilish: 'Billie Eilish',
    brunomars: 'Bruno Mars', // Replaces The Weeknd
    'beyoncéknowles': 'Beyoncé Knowles', // Replaces Beyonce (with accent)
    beyonceknowles: 'Beyoncé Knowles', // Alternative without accent
    // Handle variations
    'beyonce': 'Beyoncé Knowles', // Old single name format
    postmalone: 'Post Malone',
    // Original trainees
    sarahjohnson: 'Sarah Johnson',
    michaelchen: 'Michael Chen',
    emilyrodriguez: 'Emily Rodriguez',
    davidthompson: 'David Thompson',
    jessicamartinez: 'Jessica Martinez',
    jameswilson: 'James Wilson',
    amandalee: 'Amanda Lee',
    robertbrown: 'Robert Brown',
    lisaanderson: 'Lisa Anderson',
    christopherdavis: 'Christopher Davis',
    // System users
    admin: 'Admin',
    manager: 'Manager',
    trainer: 'Trainer',
    trainee1: 'Trainee 1',
    trainee2: 'Trainee 2',
    trainee3: 'Trainee 3',
  };

  // Check if we have a direct mapping
  const lowerUsername = username.toLowerCase();
  if (nameMappings[lowerUsername]) {
    return nameMappings[lowerUsername];
  }

  // Try to intelligently split and capitalize
  // For usernames without spaces, try to infer where word breaks should be
  // This is a heuristic approach for unknown names
  const words = username.toLowerCase().split(/(?=[A-Z])|(?<=[a-z])(?=[0-9])/);
  
  if (words.length > 1) {
    // Has capital letters, split on them
    return words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  // For single-word usernames, try common patterns
  // Look for common word boundaries (not perfect, but better than nothing)
  const commonPatterns = [
    /^([a-z]+)([A-Z][a-z]+)$/, // camelCase
    /^([a-z]{3,})([a-z]{3,})$/i, // two roughly equal parts
  ];

  for (const pattern of commonPatterns) {
    const match = username.match(pattern);
    if (match) {
      return match.slice(1)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
  }

  // Fallback: capitalize first letter
  return username.charAt(0).toUpperCase() + username.slice(1).toLowerCase();
}

