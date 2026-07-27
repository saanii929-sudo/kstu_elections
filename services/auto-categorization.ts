// Auto-categorization service for nominees using keyword matching and ML-like scoring

interface CategoryKeywords {
  categoryName: string;
  keywords: string[];
  weight: number;
}

const categoryPatterns: CategoryKeywords[] = [
  {
    categoryName: 'Best Artist',
    keywords: ['artist', 'musician', 'singer', 'performer', 'music', 'song', 'album', 'concert'],
    weight: 1.0,
  },
  {
    categoryName: 'Best Actor',
    keywords: ['actor', 'actress', 'film', 'movie', 'cinema', 'performance', 'role', 'character'],
    weight: 1.0,
  },
  {
    categoryName: 'Best Student',
    keywords: ['student', 'academic', 'scholar', 'education', 'school', 'university', 'grade', 'gpa'],
    weight: 1.0,
  },
  {
    categoryName: 'Best Teacher',
    keywords: ['teacher', 'educator', 'professor', 'instructor', 'teaching', 'education', 'mentor'],
    weight: 1.0,
  },
  {
    categoryName: 'Best Entrepreneur',
    keywords: ['entrepreneur', 'business', 'startup', 'founder', 'ceo', 'company', 'innovation'],
    weight: 1.0,
  },
  {
    categoryName: 'Best Athlete',
    keywords: ['athlete', 'sports', 'player', 'champion', 'competition', 'game', 'team', 'coach'],
    weight: 1.0,
  },
  {
    categoryName: 'Best Doctor',
    keywords: ['doctor', 'physician', 'medical', 'health', 'hospital', 'clinic', 'patient', 'treatment'],
    weight: 1.0,
  },
  {
    categoryName: 'Best Nurse',
    keywords: ['nurse', 'nursing', 'healthcare', 'patient care', 'medical', 'hospital', 'clinic'],
    weight: 1.0,
  },
  {
    categoryName: 'Community Leader',
    keywords: ['leader', 'community', 'volunteer', 'service', 'charity', 'social', 'impact', 'development'],
    weight: 1.0,
  },
  {
    categoryName: 'Best Journalist',
    keywords: ['journalist', 'reporter', 'news', 'media', 'press', 'article', 'story', 'broadcast'],
    weight: 1.0,
  },
];

export interface CategorizationResult {
  suggestedCategory: string;
  confidence: number;
  alternativeCategories: Array<{ category: string; confidence: number }>;
  reasoning: string;
}

export function autoCategorizNominee(
  nomineeName: string,
  nomineeDescription: string,
  availableCategories: Array<{ _id: string; name: string }>
): CategorizationResult {
  const text = `${nomineeName} ${nomineeDescription}`.toLowerCase();
  const scores: Map<string, number> = new Map();

  // Calculate scores for each available category
  for (const availableCategory of availableCategories) {
    const categoryName = availableCategory.name.toLowerCase();
    let score = 0;

    // Find matching pattern
    for (const pattern of categoryPatterns) {
      if (categoryName.includes(pattern.categoryName.toLowerCase()) || 
          pattern.categoryName.toLowerCase().includes(categoryName)) {
        
        // Count keyword matches
        for (const keyword of pattern.keywords) {
          if (text.includes(keyword.toLowerCase())) {
            score += pattern.weight;
          }
        }
      }
    }

    // Boost score if category name appears in text
    if (text.includes(categoryName)) {
      score += 5;
    }

    if (score > 0) {
      scores.set(availableCategory._id, score);
    }
  }

  // Sort by score
  const sortedScores = Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([categoryId, score]) => {
      const category = availableCategories.find(c => c._id === categoryId);
      return {
        categoryId,
        categoryName: category?.name || '',
        score,
      };
    });

  if (sortedScores.length === 0) {
    return {
      suggestedCategory: '',
      confidence: 0,
      alternativeCategories: [],
      reasoning: 'No matching category found based on nominee information.',
    };
  }

  const topScore = sortedScores[0].score;
  const confidence = Math.min(topScore / 10, 1); // Normalize to 0-1

  return {
    suggestedCategory: sortedScores[0].categoryId,
    confidence,
    alternativeCategories: sortedScores.slice(1, 4).map(s => ({
      category: s.categoryId,
      confidence: Math.min(s.score / 10, 1),
    })),
    reasoning: `Matched ${Math.floor(topScore)} relevant keywords for "${sortedScores[0].categoryName}"`,
  };
}

export function generateCategoryDescription(categoryName: string): string {
  const pattern = categoryPatterns.find(p => 
    categoryName.toLowerCase().includes(p.categoryName.toLowerCase())
  );

  if (!pattern) {
    return 'This category recognizes outstanding achievement and excellence.';
  }

  const descriptions: { [key: string]: string } = {
    'Best Artist': 'Recognizing exceptional talent in music, performance, and artistic expression.',
    'Best Actor': 'Celebrating outstanding performances in film, television, and theater.',
    'Best Student': 'Honoring academic excellence, leadership, and dedication to learning.',
    'Best Teacher': 'Recognizing educators who inspire, mentor, and transform lives.',
    'Best Entrepreneur': 'Celebrating innovation, business acumen, and entrepreneurial success.',
    'Best Athlete': 'Honoring exceptional athletic performance, sportsmanship, and dedication.',
    'Best Doctor': 'Recognizing medical excellence, patient care, and healthcare innovation.',
    'Best Nurse': 'Celebrating compassionate care, professionalism, and nursing excellence.',
    'Community Leader': 'Honoring those who serve, inspire, and uplift their communities.',
    'Best Journalist': 'Recognizing excellence in reporting, storytelling, and media integrity.',
  };

  return descriptions[pattern.categoryName] || 'This category recognizes outstanding achievement and excellence.';
}
