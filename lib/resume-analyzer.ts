type SkillCategory = "frontend" | "backend" | "database" | "cloud" | "testing" | "tools" | "language" | "other";

type StructuredData = {
  skills: string[];
  experience: string[];
  education: string[];
  projects: string[];
  certifications: string[];
};

type ScoreBreakdownDetail = {
  score: number;
  reasons: string[];
};

type ScoreBreakdown = {
  skills: number;
  context: number;
  experience: number;
  total: number;
  explanation: string[];
  details: {
    skills: ScoreBreakdownDetail;
    context: ScoreBreakdownDetail;
    experience: ScoreBreakdownDetail;
  };
};

type Feedback = {
  skills: string;
  experience: string;
  formatting: string;
};

type KeywordConcept = {
  key: string;
  label: string;
  tokens: string[];
  score: number;
};

export type JobDescriptionValidation = {
  isValid: boolean;
  warning: string | null;
  reasons: string[];
};

export type AnalyzerResult = {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  recommendedSkills: string[];
  suggestions: string[];
  matchedKeywords: string[];
  missingKeywords: string[];
  scoreBreakdown: ScoreBreakdown;
  feedback: Feedback;
  confidenceScore: number;
  jdValidation: JobDescriptionValidation;
  skillCategories: {
    resume: Record<SkillCategory, string[]>;
    jobDescription: Record<SkillCategory, string[]>;
    matched: Record<SkillCategory, string[]>;
    missing: Record<SkillCategory, string[]>;
  };
  extractedData: {
    resumeSkills: string[];
    jdSkills: string[];
    resumeKeywords: string[];
    jdKeywords: string[];
    resumeYears: number;
    requiredYears: number | null;
    structuredResume: StructuredData;
    structuredJobDescription: StructuredData;
  };
};

type SkillDefinition = {
  canonical: string;
  category: SkillCategory;
  aliases: string[];
};

const MAX_ANALYSIS_LENGTH = 50000;
const EMAIL_REGEX = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const PHONE_REGEX = /(?:\+?\d[\d\s().-]{7,}\d)/g;
const URL_REGEX = /https?:\/\/\S+/gi;
const CONTACT_LABEL_REGEX = /\b(?:email|phone|mobile|contact|location)\s*:/i;

const SECTION_ALIASES: Record<keyof StructuredData | "summary" | "other", string[]> = {
  summary: ["professional summary", "summary", "profile", "objective"],
  skills: ["skills", "technical skills", "core skills", "key skills"],
  experience: ["experience", "work experience", "professional experience", "employment history"],
  education: ["education", "academic background"],
  projects: ["projects", "project experience"],
  certifications: ["certifications", "certificates"],
  other: [],
};

const RESUME_ONLY_SECTION_HINTS = new Set([
  "education",
  "certifications",
  "projects",
  "objective",
  "profile",
  "academic background",
]);

const STOP_WORDS = new Set([
  "a", "about", "above", "across", "after", "again", "against", "all", "also", "am", "an", "and", "any",
  "applicant", "applicants", "are", "as", "at", "be", "because", "been", "before", "being", "below", "between",
  "both", "but", "by", "candidate", "candidates", "can", "could", "did", "do", "does", "doing", "done", "during",
  "each", "either", "etc", "for", "from", "further", "good", "great", "had", "has", "have", "having", "how",
  "if", "in", "into", "is", "it", "its", "itself", "just", "looking", "more", "most", "much", "must", "need",
  "needs", "no", "nor", "not", "now", "of", "off", "on", "once", "only", "or", "other", "our", "ours",
  "ourselves", "out", "over", "own", "required", "requirement", "requirements", "requiring", "role", "same",
  "should", "so", "some", "strong", "such", "than", "that", "the", "their", "theirs", "them", "themselves",
  "then", "there", "these", "they", "this", "those", "through", "to", "too", "under", "until", "up", "use",
  "using", "very", "was", "we", "were", "what", "when", "where", "which", "while", "who", "whom", "why", "will",
  "with", "within", "without", "would", "you", "your", "yours", "yourself", "yourselves",
]);

const GENERIC_TOKENS = new Set([
  "ability", "application", "applications", "background", "candidate", "certification", "certifications",
  "client", "clients", "collaborated", "collaboration", "company", "companies", "concept", "concepts", "create",
  "created", "creating", "current", "currently", "customer", "customers", "day", "days", "deliver", "delivered",
  "delivery", "demonstrated", "description", "design", "designed", "developer", "developers", "development",
  "education", "email", "employment", "engineer", "engineering", "environment", "environments", "example",
  "examples", "experience", "experienced", "formatting", "framework", "frameworks", "frontend", "fullstack",
  "history", "improved", "including", "information", "intern", "job", "jobs", "knowledge", "leadership", "line",
  "lines", "location", "locations", "maintained", "management", "modern", "month", "months", "name", "objective",
  "phone", "present", "professional", "profile", "project", "projects", "quality", "reliable", "reporting",
  "responsibilities", "responsibility", "responsible", "resume", "scalable", "section", "sections", "skill",
  "skills", "solid", "strong", "summary", "support", "supporting", "team", "teams", "technical", "technology",
  "tools", "user", "users", "web", "week", "weeks", "work", "worked", "working", "year", "years",
]);

const LOCATION_TERMS = new Set([
  "bangalore", "bengaluru", "india", "delhi", "mumbai", "pune", "hyderabad", "chennai", "kolkata", "remote",
  "gurgaon", "gurugram", "noida", "new", "york", "san", "francisco", "london", "dubai", "singapore",
]);

const SHORT_DOMAIN_TOKENS = new Set(["api", "ui", "ux", "qa", "seo", "aws", "sql"]);
const MONTH_TOKENS = new Set(["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "sept", "oct", "nov", "dec", "present", "current"]);
const MONTH_LOOKUP: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};
const PROTECTED_PLURAL_SUFFIXES = ["ss", "us", "is", "ous", "ics", "ios", "xis"];
const KEYWORD_SINGLE_TOKEN_ALLOWLIST = new Set([
  "accessibility", "architecture", "automation", "collaboration", "compliance", "components", "debugging",
  "deployment", "documentation", "metrics", "optimization", "performance", "responsive", "scalability",
  "security", "stakeholder", "testing", "workflow",
]);
const ACTION_KEYWORD_TOKENS = new Set([
  "build", "collaborate", "create", "design", "develop", "document", "handle", "implement", "improve",
  "increase", "integrate", "lead", "manage", "optimize", "reduce", "support", "test", "use",
]);
const PHRASE_EDGE_NOISE = new Set([
  "analyst", "backend", "candidate", "designer", "developer", "engineer", "frontend", "fullstack",
  "job", "manager", "opening", "opportunity", "position", "qualification", "require", "requirement",
  "responsibility", "role", "specialist",
]);
const GENERIC_KEYWORD_TOKENS = new Set([
  ...GENERIC_TOKENS,
  "achieve", "build", "built", "create", "created", "creating", "deliver", "delivered", "delivering",
  "develop", "developed", "developing", "handle", "handled", "handling", "implement", "implemented",
  "implementing", "maintain", "maintained", "maintaining", "require", "required", "requiring", "responsibility",
  "responsibilities", "support", "supporting", "task", "tasks", "work", "worked", "working",
]);
const IRREGULAR_LEMMAS: Record<string, string> = {
  apis: "api",
  built: "build",
  building: "build",
  created: "create",
  creating: "create",
  developed: "develop",
  developing: "develop",
  handled: "handle",
  handling: "handle",
  improved: "improve",
  improving: "improve",
  increased: "increase",
  increasing: "increase",
  integration: "integrate",
  integrations: "integrate",
  integrated: "integrate",
  integrating: "integrate",
  managed: "manage",
  managing: "manage",
  optimized: "optimize",
  optimizing: "optimize",
  required: "require",
  requiring: "require",
  reduced: "reduce",
  reducing: "reduce",
  responsibilities: "responsibility",
  tested: "test",
  testing: "test",
  used: "use",
  using: "use",
};

const ROLE_SIGNALS = ["frontend", "backend", "fullstack", "mobile", "devops", "cloud", "data", "qa", "ui", "ux", "design"];
const LEVEL_ORDER = ["intern", "junior", "mid", "senior", "lead", "manager"] as const;

const SKILL_DEFINITIONS: SkillDefinition[] = [
  { canonical: "html", category: "frontend", aliases: ["html", "html5"] },
  { canonical: "css", category: "frontend", aliases: ["css", "css3"] },
  { canonical: "javascript", category: "language", aliases: ["javascript", "js", "ecmascript", "es6", "es2015", "es2020"] },
  { canonical: "typescript", category: "language", aliases: ["typescript", "ts"] },
  { canonical: "react", category: "frontend", aliases: ["react", "react js", "reactjs", "react.js"] },
  { canonical: "next", category: "frontend", aliases: ["next", "next js", "nextjs", "next.js"] },
  { canonical: "angular", category: "frontend", aliases: ["angular", "angularjs", "angular js"] },
  { canonical: "vue", category: "frontend", aliases: ["vue", "vuejs", "vue js", "vue.js"] },
  { canonical: "node", category: "backend", aliases: ["node", "nodejs", "node js", "node.js"] },
  { canonical: "express", category: "backend", aliases: ["express", "expressjs", "express js", "express.js"] },
  { canonical: "mongodb", category: "database", aliases: ["mongodb", "mongo db", "mongo"] },
  { canonical: "mysql", category: "database", aliases: ["mysql"] },
  { canonical: "postgresql", category: "database", aliases: ["postgresql", "postgres", "psql"] },
  { canonical: "sql", category: "database", aliases: ["sql"] },
  { canonical: "firebase", category: "backend", aliases: ["firebase"] },
  { canonical: "redux", category: "frontend", aliases: ["redux"] },
  { canonical: "tailwind", category: "frontend", aliases: ["tailwind", "tailwind css", "tailwindcss"] },
  { canonical: "bootstrap", category: "frontend", aliases: ["bootstrap"] },
  { canonical: "sass", category: "frontend", aliases: ["sass", "scss"] },
  { canonical: "git", category: "tools", aliases: ["git"] },
  { canonical: "github", category: "tools", aliases: ["github"] },
  { canonical: "rest api", category: "backend", aliases: ["rest api", "rest apis", "restful api", "restful apis", "api integration", "api integrations"] },
  { canonical: "graphql", category: "backend", aliases: ["graphql"] },
  { canonical: "axios", category: "frontend", aliases: ["axios"] },
  { canonical: "fetch", category: "frontend", aliases: ["fetch"] },
  { canonical: "responsive design", category: "frontend", aliases: ["responsive design", "responsive ui", "responsive layouts"] },
  { canonical: "cross-browser compatibility", category: "frontend", aliases: ["cross browser compatibility", "cross-browser compatibility", "browser compatibility"] },
  { canonical: "accessibility", category: "frontend", aliases: ["accessibility", "a11y"] },
  { canonical: "performance optimization", category: "frontend", aliases: ["performance optimization", "performance tuning", "web performance"] },
  { canonical: "state management", category: "frontend", aliases: ["state management"] },
  { canonical: "design systems", category: "frontend", aliases: ["design systems", "design system"] },
  { canonical: "figma", category: "tools", aliases: ["figma"] },
  { canonical: "seo", category: "frontend", aliases: ["seo", "search engine optimization"] },
  { canonical: "testing", category: "testing", aliases: ["testing", "test automation", "qa testing"] },
  { canonical: "unit testing", category: "testing", aliases: ["unit testing", "unit tests"] },
  { canonical: "integration testing", category: "testing", aliases: ["integration testing", "integration tests"] },
  { canonical: "jest", category: "testing", aliases: ["jest"] },
  { canonical: "cypress", category: "testing", aliases: ["cypress"] },
  { canonical: "playwright", category: "testing", aliases: ["playwright"] },
  { canonical: "webpack", category: "tools", aliases: ["webpack"] },
  { canonical: "vite", category: "tools", aliases: ["vite"] },
  { canonical: "npm", category: "tools", aliases: ["npm"] },
  { canonical: "yarn", category: "tools", aliases: ["yarn"] },
  { canonical: "pnpm", category: "tools", aliases: ["pnpm"] },
  { canonical: "docker", category: "cloud", aliases: ["docker"] },
  { canonical: "kubernetes", category: "cloud", aliases: ["kubernetes", "k8s"] },
  { canonical: "aws", category: "cloud", aliases: ["aws", "amazon web services"] },
  { canonical: "jwt", category: "backend", aliases: ["jwt", "json web token", "json web tokens"] },
  { canonical: "oauth", category: "backend", aliases: ["oauth", "oauth2", "oauth 2"] },
  { canonical: "ci/cd", category: "tools", aliases: ["ci cd", "ci/cd", "continuous integration", "continuous delivery", "continuous deployment"] },
  { canonical: "agile", category: "other", aliases: ["agile"] },
  { canonical: "scrum", category: "other", aliases: ["scrum"] },
  { canonical: "python", category: "language", aliases: ["python"] },
  { canonical: "java", category: "language", aliases: ["java"] },
  { canonical: "cpp", category: "language", aliases: ["cpp", "c++"] },
  { canonical: "csharp", category: "language", aliases: ["csharp", "c#"] },
  { canonical: "dotnet", category: "backend", aliases: ["dotnet", ".net", "asp.net", "asp net"] },
  { canonical: "php", category: "language", aliases: ["php"] },
  { canonical: "laravel", category: "backend", aliases: ["laravel"] },
  { canonical: "django", category: "backend", aliases: ["django"] },
  { canonical: "flask", category: "backend", aliases: ["flask"] },
  { canonical: "spring", category: "backend", aliases: ["spring", "spring boot"] },
  { canonical: "react native", category: "frontend", aliases: ["react native"] },
  { canonical: "ui/ux", category: "frontend", aliases: ["ui ux", "ux ui", "user experience", "user interface"] },
  { canonical: "communication", category: "other", aliases: ["communication", "stakeholder communication"] },
  { canonical: "problem solving", category: "other", aliases: ["problem solving", "problem-solving"] },
];

const SKILL_LOOKUP = new Map(SKILL_DEFINITIONS.map((skill) => [skill.canonical, skill]));

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function roundScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function uniqueOrdered(values: string[]) {
  return Array.from(new Set(values));
}

function hasPattern(text: string, pattern: RegExp) {
  return Boolean(text.match(pattern));
}

function canonicalizeText(text: string) {
  return text
    .normalize("NFKD")
    .replace(/[\u2013\u2014]/g, "-")
    .toLowerCase()
    .replace(/front\s*[-]?\s*end/g, "frontend")
    .replace(/back\s*[-]?\s*end/g, "backend")
    .replace(/full\s*[-]?\s*stack/g, "fullstack")
    .replace(/next\s*[-]?\s*js/g, "next")
    .replace(/node\s*[-]?\s*js/g, "node")
    .replace(/react\s*[-]?\s*js/g, "react")
    .replace(/vue\s*[-]?\s*js/g, "vue")
    .replace(/\bhtml5\b/g, "html")
    .replace(/\bcss3\b/g, "css")
    .replace(/\brestful apis?\b/g, "rest api")
    .replace(/\brest apis?\b/g, "rest api")
    .replace(/\bjs\b/g, "javascript")
    .replace(/\bts\b/g, "typescript")
    .replace(/c\+\+/g, "cpp")
    .replace(/c#/g, "csharp")
    .replace(/\.net/g, "dotnet");
}

function limitText(text: string) {
  return text.slice(0, MAX_ANALYSIS_LENGTH);
}

function removeNoise(text: string) {
  return limitText(text)
    .replace(EMAIL_REGEX, " ")
    .replace(PHONE_REGEX, " ")
    .replace(URL_REGEX, " ")
    .replace(/\b(?:bangalore|bengaluru|india|delhi|mumbai|pune|hyderabad|chennai|kolkata|remote|gurgaon|gurugram|noida)\b/gi, " ");
}

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function toNormalizedText(text: string) {
  return normalizeWhitespace(canonicalizeText(removeNoise(text)).replace(/[^a-z0-9/+\-.\s]/g, " "));
}

function lemmatizeToken(token: string) {
  if (IRREGULAR_LEMMAS[token]) return IRREGULAR_LEMMAS[token];
  if (token.endsWith("ies") && token.length > 4) return `${token.slice(0, -3)}y`;
  if (token.endsWith("ing") && token.length > 5) {
    let base = token.slice(0, -3);
    if (/([b-df-hj-np-tv-z])\1$/.test(base)) {
      base = base.slice(0, -1);
    }
    if (/(?:at|iz|iv|ur|ag|dl|ndl|olv|ct|ut|us)$/.test(base)) {
      return `${base}e`;
    }
    return base;
  }
  if (token.endsWith("ed") && token.length > 4) {
    let base = token.slice(0, -2);
    if (/([b-df-hj-np-tv-z])\1$/.test(base)) {
      base = base.slice(0, -1);
    }
    if (/(?:at|iz|iv|ur|ag|dl|ndl|olv|ct|uc|duc|us)$/.test(base)) {
      return `${base}e`;
    }
    return base;
  }
  if (token.endsWith("es") && token.length > 4 && !PROTECTED_PLURAL_SUFFIXES.some((suffix) => token.endsWith(suffix))) {
    return token.slice(0, -2);
  }
  if (token.endsWith("s") && token.length > 3 && !PROTECTED_PLURAL_SUFFIXES.some((suffix) => token.endsWith(suffix))) {
    return token.slice(0, -1);
  }
  return token;
}

function tokenize(text: string) {
  return toNormalizedText(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => lemmatizeToken(token.trim()))
    .filter(Boolean);
}

function buildFrequencyMap(tokens: string[]) {
  const map = new Map<string, number>();
  for (const token of tokens) {
    map.set(token, (map.get(token) ?? 0) + 1);
  }
  return map;
}

function getSectionKey(line: string) {
  const normalized = normalizeWhitespace(canonicalizeText(line).replace(/[^a-z0-9 ]/g, " "));
  for (const [section, aliases] of Object.entries(SECTION_ALIASES)) {
    if (aliases.includes(normalized)) {
      return section as keyof typeof SECTION_ALIASES;
    }
  }
  return "other";
}

function extractSections(text: string) {
  const sections: Record<keyof StructuredData | "summary" | "other", string[]> = {
    summary: [],
    skills: [],
    experience: [],
    education: [],
    projects: [],
    certifications: [],
    other: [],
  };

  let currentSection: keyof typeof sections = "other";
  for (const rawLine of limitText(text).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const sectionKey = getSectionKey(line);
    if (sectionKey !== "other") {
      currentSection = sectionKey;
      continue;
    }

    sections[currentSection].push(line);
  }

  return Object.fromEntries(
    Object.entries(sections).map(([section, lines]) => [section, lines.join("\n")])
  ) as Record<keyof typeof sections, string>;
}

function getPersonalInfoTokens(text: string) {
  const tokens = new Set<string>();
  const lines = limitText(text).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const firstLine = lines[0] ?? "";
  const firstLineTokens = tokenize(firstLine);
  const looksLikeNameHeading =
    firstLineTokens.length >= 2 &&
    firstLineTokens.length <= 3 &&
    !/\b(?:developer|engineer|designer|manager|analyst|specialist|experience|skills|summary|project|requirement|responsibilities|qualification)\b/i.test(firstLine);

  if (looksLikeNameHeading) {
    for (const token of firstLineTokens) {
      if (token.length > 2) tokens.add(token);
    }
  }

  for (const line of lines.filter((item) => CONTACT_LABEL_REGEX.test(item))) {
    for (const token of tokenize(line)) {
      if (token.length > 2) tokens.add(token);
    }
  }

  return tokens;
}

function getOrganizationTokens(text: string) {
  const tokens = new Set<string>();
  const lines = limitText(text).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  for (const line of lines) {
    const [leftSide = "", rightSide = ""] = line.split("|").map((part) => part.trim());
    if (leftSide && rightSide && /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|\d{4}|present|current)\b/i.test(rightSide)) {
      for (const token of tokenize(leftSide)) {
        if (token.length > 2) tokens.add(token);
      }
      continue;
    }

    if (/\b(inc|llc|ltd|limited|corp|corporation|company|solutions|solution|technologies|technology|systems|system|services|service|university|college|school|institute|labs|lab|group|pvt|private)\b/i.test(line)) {
      for (const token of tokenize(line)) {
        if (token.length > 2) tokens.add(token);
      }
    }
  }

  return tokens;
}

function buildNoiseTokens(text: string) {
  return new Set([...getPersonalInfoTokens(text), ...getOrganizationTokens(text)]);
}

function buildJobDescriptionNoiseTokens(text: string) {
  return buildNoiseTokens(text);
}

function extractSkills(text: string) {
  const normalizedText = ` ${toNormalizedText(text)} `;
  const found: string[] = [];

  for (const skill of SKILL_DEFINITIONS) {
    const aliases = [skill.canonical, ...skill.aliases];
    const matched = aliases.some((alias) => {
      const aliasPattern = normalizeWhitespace(canonicalizeText(alias).replace(/[^a-z0-9 ]/g, " "));
      const regex = new RegExp(`(^|[^a-z0-9])${escapeRegExp(aliasPattern).replace(/\s+/g, "\\s+")}([^a-z0-9]|$)`, "i");
      return regex.test(normalizedText);
    });

    if (matched) {
      found.push(skill.canonical);
    }
  }

  return uniqueOrdered(found).sort((a, b) => a.localeCompare(b));
}

function extractStructuredData(text: string): StructuredData {
  const sections = extractSections(text);
  const skillSource = normalizeWhitespace(`${sections.skills}\n${sections.summary}`) || text;
  return {
    skills: extractSkills(skillSource),
    experience: sections.experience.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 12),
    education: sections.education.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 8),
    projects: sections.projects.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 10),
    certifications: sections.certifications.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 8),
  };
}

function buildSkillTokenSet(skills: string[]) {
  const tokens = new Set<string>();
  for (const skill of skills) {
    for (const token of skill.split(/[^a-z0-9]+/).filter(Boolean)) {
      tokens.add(token);
    }
  }
  return tokens;
}

function isMeaningfulContextToken(token: string, excludedTokens: Set<string>) {
  if (!token) return false;
  if (/^\d+$/.test(token)) return false;
  if (token.length < 4 && !SHORT_DOMAIN_TOKENS.has(token)) return false;
  if (STOP_WORDS.has(token) || GENERIC_KEYWORD_TOKENS.has(token) || MONTH_TOKENS.has(token) || excludedTokens.has(token) || LOCATION_TERMS.has(token)) return false;
  return true;
}

function isMeaningfulKeywordToken(token: string, excludedTokens: Set<string>, skillTokens: Set<string>) {
  if (!isMeaningfulContextToken(token, excludedTokens)) return false;
  if (GENERIC_KEYWORD_TOKENS.has(token) || skillTokens.has(token)) return false;
  return true;
}

function toDisplayKeywordToken(token: string) {
  const displayMap: Record<string, string> = {
    integrate: "integration",
    optimize: "optimization",
    automate: "automation",
    collaborate: "collaboration",
    document: "documentation",
  };

  return displayMap[token] ?? token;
}

function normalizeKeywordDisplayText(text: string) {
  return normalizeWhitespace(
    canonicalizeText(removeNoise(text))
      .replace(/^[\u2022*-]\s*/, "")
      .replace(/\b\d+(?:\.\d+)?%?\b/g, " ")
      .replace(/[^a-z0-9\s/-]/g, " ")
  );
}

function trimPhraseWords(words: string[]) {
  let start = 0;
  let end = words.length;

  while (start < end) {
    const token = lemmatizeToken(words[start]);
    if (!STOP_WORDS.has(token) && !PHRASE_EDGE_NOISE.has(token)) break;
    start += 1;
  }

  while (end > start) {
    const token = lemmatizeToken(words[end - 1]);
    if (!STOP_WORDS.has(token) && !PHRASE_EDGE_NOISE.has(token)) break;
    end -= 1;
  }

  return words.slice(start, end);
}

function isReadableKeywordPhrase(words: string[], excludedTokens: Set<string>, skillTokens: Set<string>) {
  if (words.length < 2 || words.length > 6) return false;

  const normalizedTokens = words.map((word) => lemmatizeToken(word));
  const significantTokens = normalizedTokens.filter((token) =>
    !STOP_WORDS.has(token) &&
    !GENERIC_KEYWORD_TOKENS.has(token) &&
    !excludedTokens.has(token) &&
    !skillTokens.has(token) &&
    !LOCATION_TERMS.has(token) &&
    !MONTH_TOKENS.has(token)
  );

  if (significantTokens.length >= 2) return true;

  return (
    significantTokens.length === 1 &&
    normalizedTokens.some((token) => ACTION_KEYWORD_TOKENS.has(token) || SHORT_DOMAIN_TOKENS.has(token))
  );
}

function buildPhraseCandidates(line: string) {
  const baseFragments = line
    .split(/[;,|]/)
    .map((fragment) => normalizeKeywordDisplayText(fragment))
    .filter(Boolean);

  const segments = baseFragments
    .flatMap((fragment) => fragment.split(/\b(?:and|while|plus)\b/))
    .map((segment) => trimPhraseWords(segment.split(/\s+/).filter(Boolean)))
    .filter((segment) => segment.length > 0);

  const phrases: string[] = [];
  for (const words of segments) {
    phrases.push(words.join(" "));

    if (ACTION_KEYWORD_TOKENS.has(lemmatizeToken(words[0])) && words.length >= 2) {
      phrases.push(words.slice(0, Math.min(words.length, 4)).join(" "));

      const objectPhrase = trimPhraseWords(words.slice(1));
      if (objectPhrase.length >= 2) {
        phrases.push(objectPhrase.slice(0, Math.min(objectPhrase.length, 4)).join(" "));
      }
    }

    for (let start = 0; start < words.length; start += 1) {
      for (let size = 2; size <= 4; size += 1) {
        const candidate = words.slice(start, start + size);
        if (candidate.length === size) {
          phrases.push(candidate.join(" "));
        }
      }
    }
  }

  return uniqueOrdered(phrases);
}

function extractContextTerms(text: string, excludedTokens: Set<string>, knownSkills: string[]) {
  const terms: string[] = [];
  const normalizedSkills = uniqueOrdered(knownSkills);
  const keywordConcepts = extractKeywordConcepts(text, excludedTokens, knownSkills).slice(0, 12);

  for (const concept of keywordConcepts) {
    terms.push(`concept:${concept.key}`);
  }

  for (const skill of normalizedSkills) {
    terms.push(`skill:${skill}`);
  }

  for (const role of extractRoleSignals(text)) {
    terms.push(`role:${role}`);
  }

  if (terms.length > 0) return uniqueOrdered(terms);

  const skillTokens = buildSkillTokenSet(normalizedSkills);
  return uniqueOrdered(tokenize(text)
    .filter((token) => isMeaningfulContextToken(token, excludedTokens) && !skillTokens.has(token))
    .map((token) => `token:${token}`));
}

function extractKeywordConcepts(text: string, excludedTokens: Set<string>, knownSkills: string[]) {
  const skillTokens = buildSkillTokenSet(knownSkills);
  const concepts = new Map<string, KeywordConcept>();

  const addConcept = (label: string, scoreBoost: number) => {
    const normalizedLabel = normalizeKeywordDisplayText(label);
    if (!normalizedLabel) return;

    const displayWords = trimPhraseWords(normalizedLabel.split(/\s+/).filter(Boolean));
    if (!isReadableKeywordPhrase(displayWords, excludedTokens, skillTokens)) return;

    const tokens = displayWords
      .map((token) => lemmatizeToken(token))
      .filter(Boolean);

    if (tokens.length === 0) return;
    if (tokens.every((token) => GENERIC_KEYWORD_TOKENS.has(token) || STOP_WORDS.has(token))) return;
    if (tokens.every((token) => skillTokens.has(token))) return;

    const key = tokens.join(" ");
    const existing = concepts.get(key);
    if (existing) {
      existing.score += scoreBoost;
      return;
    }

    concepts.set(key, {
      key,
      label: displayWords.map((token) => toDisplayKeywordToken(token)).join(" "),
      tokens,
      score: scoreBoost,
    });
  };

  for (const line of limitText(text).split(/\r?\n/)) {
    const cleanedLine = normalizeKeywordDisplayText(line);
    if (!cleanedLine) continue;

    const lineTokens = cleanedLine
      .split(/\s+/)
      .map((token) => lemmatizeToken(token))
      .filter((token) => isMeaningfulKeywordToken(token, excludedTokens, skillTokens));

    for (const token of lineTokens) {
      if (KEYWORD_SINGLE_TOKEN_ALLOWLIST.has(token)) {
        addConcept(token, 1);
      }
    }

    for (const phrase of buildPhraseCandidates(line)) {
      const wordCount = phrase.split(/\s+/).length;
      const scoreBoost = ACTION_KEYWORD_TOKENS.has(lemmatizeToken(phrase.split(/\s+/)[0])) ? 5 : wordCount >= 3 ? 4 : 3;
      addConcept(phrase, scoreBoost);
    }
  }

  return Array.from(concepts.values()).sort((left, right) =>
    right.score - left.score || right.tokens.length - left.tokens.length || left.label.localeCompare(right.label)
  );
}

function topKeywords(concepts: KeywordConcept[], limit = 10) {
  return concepts.slice(0, limit).map((concept) => concept.label);
}

function intersection<T>(left: T[], right: T[]) {
  const rightSet = new Set(right);
  return left.filter((item) => rightSet.has(item));
}

function difference<T>(left: T[], right: T[]) {
  const rightSet = new Set(right);
  return left.filter((item) => !rightSet.has(item));
}

function tfIdfCosineSimilarity(documents: string[][], leftDocumentIndex: number, rightDocumentIndex: number, vocabularyOverride?: string[]) {
  const leftTokens = documents[leftDocumentIndex] ?? [];
  const rightTokens = documents[rightDocumentIndex] ?? [];
  if (leftTokens.length === 0 || rightTokens.length === 0) return 0;

  const vocabulary = uniqueOrdered(vocabularyOverride?.length ? vocabularyOverride : documents.flat());
  const documentFrequency = new Map<string, number>();
  for (const token of vocabulary) {
    let count = 0;
    for (const document of documents) {
      if (document.includes(token)) {
        count += 1;
      }
    }
    documentFrequency.set(token, count);
  }

  const buildVector = (tokens: string[]) => {
    const frequency = buildFrequencyMap(tokens);
    const totalTerms = tokens.length || 1;
    const vector = new Map<string, number>();

    for (const token of vocabulary) {
      const tf = (frequency.get(token) ?? 0) / totalTerms;
      if (tf === 0) continue;
      const idf = Math.log((documents.length + 1) / ((documentFrequency.get(token) ?? 0) + 1)) + 1;
      vector.set(token, (1 + Math.log1p(tf * totalTerms)) * idf);
    }

    return vector;
  };

  const leftVector = buildVector(leftTokens);
  const rightVector = buildVector(rightTokens);

  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (const token of vocabulary) {
    const leftWeight = leftVector.get(token) ?? 0;
    const rightWeight = rightVector.get(token) ?? 0;
    dot += leftWeight * rightWeight;
    leftMagnitude += leftWeight * leftWeight;
    rightMagnitude += rightWeight * rightWeight;
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) return 0;
  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

function extractRequiredYears(jobDescription: string) {
  const text = canonicalizeText(jobDescription);
  const rangeMatch = text.match(/(\d+)\s*(?:-|to)\s*(\d+)\s+years?/);
  if (rangeMatch) return Number(rangeMatch[1]);

  const plusMatch = text.match(/(\d+)\+?\s+years?/);
  if (plusMatch) return Number(plusMatch[1]);

  return null;
}

function parseMonthYearLabel(label: string, isEndDate = false) {
  const normalized = canonicalizeText(label).replace(/[^a-z0-9\s]/g, " ").trim();
  if (!normalized) return null;

  if (/\b(?:present|current|now)\b/.test(normalized)) {
    const currentDate = new Date();
    return { year: currentDate.getFullYear(), month: currentDate.getMonth() };
  }

  const monthYearMatch = normalized.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{4})\b/
  );
  if (monthYearMatch) {
    return {
      year: Number(monthYearMatch[2]),
      month: MONTH_LOOKUP[monthYearMatch[1]] ?? 0,
    };
  }

  const yearMatch = normalized.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) {
    return {
      year: Number(yearMatch[0]),
      month: isEndDate ? 11 : 0,
    };
  }

  return null;
}

function monthsBetweenDates(
  start: { year: number; month: number },
  end: { year: number; month: number }
) {
  return (end.year - start.year) * 12 + (end.month - start.month) + 1;
}

function extractResumeYears(resumeText: string) {
  const lines = limitText(resumeText)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let totalYears = 0;
  const rangePattern =
    /\b((?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?\s+\d{4}|\d{4}))\s*(?:-|–|—|to)\s*((?:present|current|now|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?\s+\d{4}|\d{4})))\b/gi;

  for (const [index, line] of lines.entries()) {
    const matches = Array.from(line.matchAll(rangePattern));
    for (const match of matches) {
      const start = parseMonthYearLabel(match[1], false);
      const end = parseMonthYearLabel(match[2], true);
      if (!start || !end) continue;

      const months = monthsBetweenDates(start, end);
      if (months <= 0) continue;

      const nearbyContext = `${lines[index - 1] ?? ""} ${line} ${lines[index + 1] ?? ""}`;
      const yearsFromRange = months / 12;
      totalYears += /\bintern(ship)?\b/i.test(nearbyContext)
        ? Math.max(0.2, yearsFromRange)
        : yearsFromRange;
    }
  }

  if (totalYears > 0) {
    return Math.min(40, Number(totalYears.toFixed(1)));
  }

  const text = canonicalizeText(resumeText);
  const explicitMatch = text.match(/(\d+(?:\.\d+)?)\+?\s+years? of experience/);
  if (explicitMatch) return Number(explicitMatch[1]);

  if (/\bintern(ship)?\b/i.test(text)) {
    return 0.2;
  }

  return 0;
}

function extractLevel(text: string) {
  const normalized = canonicalizeText(text);
  return LEVEL_ORDER.find((level) => normalized.includes(level)) ?? null;
}

function levelDistance(left: (typeof LEVEL_ORDER)[number] | null, right: (typeof LEVEL_ORDER)[number] | null) {
  if (!left || !right) return 1;
  return Math.abs(LEVEL_ORDER.indexOf(left) - LEVEL_ORDER.indexOf(right));
}

function extractRoleSignals(text: string) {
  const normalized = canonicalizeText(text);
  return ROLE_SIGNALS.filter((signal) => normalized.includes(signal));
}

function hasMetrics(text: string) {
  return /(?:\b\d+%|\b\d+\+?\s*(?:user|users|project|projects|feature|features|day|days|week|weeks|month|months|year|years|ms|second|seconds|hour|hours)|improved|reduced|increased|decreased|optimized)/i.test(text);
}

function hasBulletPoints(text: string) {
  return /^[\s]*[\u2022*-]/m.test(text);
}

function formatList(items: string[], limit = 5) {
  return items.slice(0, limit).join(", ");
}

function categorizeSkills(skills: string[]) {
  const categorized: Record<SkillCategory, string[]> = {
    frontend: [],
    backend: [],
    database: [],
    cloud: [],
    testing: [],
    tools: [],
    language: [],
    other: [],
  };

  for (const skill of skills) {
    const definition = SKILL_LOOKUP.get(skill);
    categorized[definition?.category ?? "other"].push(skill);
  }

  for (const category of Object.keys(categorized) as SkillCategory[]) {
    categorized[category].sort((a, b) => a.localeCompare(b));
  }

  return categorized;
}

function validateJobDescription(jobDescription: string): JobDescriptionValidation {
  const text = limitText(jobDescription);
  const reasons: string[] = [];
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  if (hasPattern(text, EMAIL_REGEX) || hasPattern(text, PHONE_REGEX) || CONTACT_LABEL_REGEX.test(text)) {
    reasons.push("The input contains personal contact information, which looks resume-like rather than JD-like.");
  }

  const detectedSections = uniqueOrdered(
    lines
      .map((line) => getSectionKey(line))
      .filter((section) => section !== "other" && RESUME_ONLY_SECTION_HINTS.has(section))
  );

  if (detectedSections.length >= 2) {
    reasons.push(`The input contains resume-style sections such as ${detectedSections.join(", ")}.`);
  }

  const firstLineTokens = tokenize(lines[0] ?? "");
  const normalizedText = canonicalizeText(text);
  if (
    lines.length > 0 &&
    firstLineTokens.length >= 2 &&
    firstLineTokens.length <= 3 &&
    !normalizedText.includes("responsibilities") &&
    !normalizedText.includes("requirements") &&
    !normalizedText.includes("qualification")
  ) {
    reasons.push("The opening line looks like a personal heading instead of a JD summary.");
  }

  return {
    isValid: reasons.length === 0,
    warning: reasons.length > 0 ? "Invalid Job Description detected" : null,
    reasons,
  };
}

function calculateExperienceComponent(resumeText: string, jobDescription: string, matchedSkills: string[]) {
  const resumeYears = extractResumeYears(resumeText);
  const requiredYears = extractRequiredYears(jobDescription);
  const resumeRoles = extractRoleSignals(resumeText);
  const jdRoles = extractRoleSignals(jobDescription);
  const jdLevel = extractLevel(jobDescription);
  const resumeLevel = extractLevel(resumeText);

  const roleScore =
    jdRoles.length > 0
      ? intersection(jdRoles, resumeRoles).length / jdRoles.length
      : resumeRoles.length > 0
        ? 0.75
        : 0.55;

  const levelScore =
    !jdLevel
      ? 0.75
      : resumeLevel
        ? Math.max(0.2, 1 - levelDistance(jdLevel, resumeLevel) * 0.35)
        : 0.4;

  const yearsScore =
    requiredYears && requiredYears > 0
      ? Math.min(resumeYears / requiredYears, 1)
      : resumeYears > 0
        ? 0.8
        : 0.45;

  const skillSupportScore = matchedSkills.length > 0 ? Math.min(1, matchedSkills.length / 4) : 0.25;
  const score = roundScore((roleScore * 0.35 + levelScore * 0.15 + yearsScore * 0.35 + skillSupportScore * 0.15) * 100);

  const reasons: string[] = [];
  if (requiredYears) {
    reasons.push(`The resume shows about ${resumeYears} year(s) of relevant experience against a JD target of ${requiredYears}+ year(s).`);
  } else {
    reasons.push(`The resume shows about ${resumeYears} year(s) of relevant experience.`);
  }

  if (jdRoles.length > 0) {
    const matchedRoles = intersection(jdRoles, resumeRoles);
    reasons.push(
      matchedRoles.length > 0
        ? `Role alignment is strong because both the resume and JD emphasize ${matchedRoles.join(", ")} work.`
        : "The resume uses less direct role language than the JD."
    );
  }

  if (matchedSkills.length > 0) {
    reasons.push(`Relevant responsibilities are reinforced by overlapping technologies such as ${formatList(matchedSkills, 4)}.`);
  }

  return {
    score,
    reasons,
    resumeYears,
    requiredYears,
  };
}

function detectJobDomain(jobDescription: string, jdSkills: string[]) {
  const normalizedText = canonicalizeText(jobDescription);
  const normalizedSkills = canonicalizeText(jdSkills.join(" "));

  if (/\b(?:java|spring|sql|orm|backend|c#|api)\b/.test(normalizedText) || /\b(?:java|spring|sql|orm|backend|c#|api)\b/.test(normalizedSkills)) {
    return "backend";
  }
  if (/\b(?:react|css|html|frontend)\b/.test(normalizedText) || /\b(?:react|css|html|frontend)\b/.test(normalizedSkills)) {
    return "frontend";
  }
  return "general";
}

function buildRecommendedSkills(jdSkills: string[], _resumeSkills: string[], jobDescription: string) {
  const recommendationSets: Record<"frontend" | "backend" | "general", string[]> = {
    frontend: ["TypeScript", "Jest", "Accessibility", "Performance optimization"],
    backend: ["Spring Boot", "Hibernate / ORM", "REST API design", "Microservices", "System Design basics"],
    general: ["Data Structures", "System Design", "Problem Solving"],
  };

  const domain = detectJobDomain(jobDescription, jdSkills);
  return recommendationSets[domain];
}

function buildSuggestions(params: {
  missingSkills: string[];
  missingKeywords: string[];
  recommendedSkills: string[];
  structuredResume: StructuredData;
  requiredYears: number | null;
  resumeYears: number;
  feedbackNeedsMetrics: boolean;
  feedbackNeedsBullets: boolean;
  jdSkills: string[];
  matchedSkills: string[];
  contextScore: number;
  experienceScore: number;
}) {
  const suggestions: string[] = [];

  if (params.missingSkills.length > 0) {
    suggestions.push(`Add or highlight these missing JD skills if you genuinely have them: ${formatList(params.missingSkills, 4)}.`);
  }

  if (params.missingKeywords.length > 0 && params.contextScore < 80) {
    suggestions.push(`Reflect these JD themes more clearly in your experience bullets if they are true for your work: ${formatList(params.missingKeywords, 3)}.`);
  }

  if (!params.structuredResume.skills.length) {
    suggestions.push("Add a dedicated Skills section so ATS systems can parse your stack more reliably.");
  }

  if (params.feedbackNeedsMetrics) {
    suggestions.push("Add measurable achievements to your experience section, such as performance gains, user impact, or delivery metrics.");
  }

  if (params.feedbackNeedsBullets) {
    suggestions.push("Use bullet points for experience and projects so accomplishments scan more clearly in ATS systems.");
  }

  if ((params.requiredYears && params.resumeYears < params.requiredYears) || params.experienceScore < 70) {
    suggestions.push(
      params.requiredYears
        ? `Strengthen your most relevant experience because the JD asks for about ${params.requiredYears}+ years.`
        : "Make the relevance of your experience clearer by aligning responsibilities and results with the target role."
    );
  }

  if (params.recommendedSkills.length > 0) {
    suggestions.push(`Consider adding adjacent strengths that often improve ATS alignment for similar roles: ${formatList(params.recommendedSkills, 3)}.`);
  }

  if (params.jdSkills.length > 0 && params.matchedSkills.length === params.jdSkills.length && params.contextScore >= 75) {
    suggestions.push("The core match is strong; tailor your summary and project bullets to mirror the target role title, outcomes, and workflow language.");
  }

  return uniqueOrdered(suggestions).slice(0, 5);
}

function calculateConfidenceScore(jdSkills: string[], resumeSkills: string[], jdKeywords: string[], resumeKeywords: string[], contextScore: number) {
  const skillSignal = jdSkills.length > 0 ? Math.min(1, resumeSkills.length / Math.max(jdSkills.length, 1)) : 0.55;
  const keywordSignal = jdKeywords.length > 0 ? Math.min(1, resumeKeywords.length / Math.max(jdKeywords.length, 1)) : 0.65;
  const contextSignal = contextScore / 100;
  const dataSignal = resumeSkills.length > 0 || resumeKeywords.length > 0 ? 1 : 0.3;
  return roundScore((skillSignal * 0.35 + keywordSignal * 0.2 + contextSignal * 0.25 + dataSignal * 0.2) * 100);
}

export { validateJobDescription };

export function analyzeResume(resumeTextInput: string, jobDescriptionInput: string): AnalyzerResult {
  const resumeText = limitText(resumeTextInput || "");
  const jobDescription = limitText(jobDescriptionInput || "");

  if (!resumeText.trim()) {
    throw new Error("Resume contains no analyzable text.");
  }

  if (!jobDescription.trim()) {
    throw new Error("Job description is required.");
  }

  const jdValidation = validateJobDescription(jobDescription);
  if (!jdValidation.isValid) {
    throw new Error(`${jdValidation.warning}. ${jdValidation.reasons.join(" ")}`);
  }

  const structuredResume = extractStructuredData(resumeText);
  const structuredJobDescription = extractStructuredData(jobDescription);
  const resumeSections = extractSections(resumeText);

  const resumeNoiseTokens = buildNoiseTokens(resumeText);
  const jdNoiseTokens = buildJobDescriptionNoiseTokens(jobDescription);

  const resumeSkillSource = normalizeWhitespace(
    `${resumeSections.skills}\n${resumeSections.summary}\n${resumeSections.experience}\n${resumeSections.projects}`
  ) || resumeText;
  const resumeContextSource = normalizeWhitespace(
    `${resumeSections.summary}\n${resumeSections.experience}\n${resumeSections.projects}\n${resumeSections.skills}`
  ) || resumeText;
  const rawResumeKeywordSource = `${resumeSections.summary}\n${resumeSections.experience}\n${resumeSections.projects}\n${resumeSections.skills}`;
  const resumeKeywordSource = rawResumeKeywordSource.trim() ? rawResumeKeywordSource : resumeText;
  const resumeExperienceSource = normalizeWhitespace(
    `${resumeSections.experience}\n${resumeSections.summary}\n${resumeSections.projects}`
  ) || resumeText;

  const resumeSkills = extractSkills(resumeSkillSource);
  const jdSkills = extractSkills(jobDescription);
  const resumeContextTerms = extractContextTerms(resumeContextSource, resumeNoiseTokens, resumeSkills);
  const jdContextTerms = extractContextTerms(jobDescription, jdNoiseTokens, jdSkills);
  const normalizedResumeContext = normalizeWhitespace(toNormalizedText(resumeContextSource));
  const normalizedJdContext = normalizeWhitespace(toNormalizedText(jobDescription));
  const contextSimilarity =
    normalizedResumeContext === normalizedJdContext
      ? 1
      : tfIdfCosineSimilarity([resumeContextTerms, jdContextTerms], 0, 1, jdContextTerms);
  const contextScore = roundScore(contextSimilarity * 100);

  const resumeKeywordConcepts = extractKeywordConcepts(resumeKeywordSource, resumeNoiseTokens, resumeSkills);
  const jdKeywordConcepts = extractKeywordConcepts(jobDescription, jdNoiseTokens, jdSkills);
  const resumeKeywordLookup = new Set(resumeKeywordConcepts.flatMap((concept) => [concept.key, ...concept.tokens]));
  const matchedKeywordConcepts = jdKeywordConcepts.filter((concept) =>
    concept.tokens.every((token) => resumeKeywordLookup.has(token)) || resumeKeywordLookup.has(concept.key)
  );
  const missingKeywordConcepts = jdKeywordConcepts.filter((concept) =>
    !matchedKeywordConcepts.some((matchedConcept) => matchedConcept.key === concept.key)
  );
  const resumeKeywords = topKeywords(resumeKeywordConcepts);
  const jdKeywords = topKeywords(jdKeywordConcepts);

  const matchedSkills = intersection(jdSkills, resumeSkills);
  const missingSkills = difference(jdSkills, matchedSkills);
  const matchedKeywords = topKeywords(matchedKeywordConcepts, 8).filter((token) => !resumeNoiseTokens.has(token));
  const missingKeywords = topKeywords(missingKeywordConcepts, 8).filter((token) => !resumeNoiseTokens.has(token));
  const recommendedSkills = buildRecommendedSkills(jdSkills, resumeSkills, jobDescription);

  const skillScore =
    jdSkills.length > 0
      ? roundScore((matchedSkills.length / jdSkills.length) * 100)
      : resumeSkills.length > 0
        ? 55
        : 25;

  const experienceComponent = calculateExperienceComponent(
    resumeExperienceSource,
    jobDescription,
    matchedSkills
  );

  const score = roundScore(skillScore * 0.5 + contextScore * 0.3 + experienceComponent.score * 0.2);

  const skillReasons = jdSkills.length > 0
    ? [
        `${matchedSkills.length} of ${jdSkills.length} recognized JD skills were found in the resume.`,
        missingSkills.length > 0 ? `The clearest missing skill signals are ${formatList(missingSkills, 4)}.` : "All recognized JD skills were covered by the resume.",
      ]
    : ["The JD did not expose a strong recognizable skill list, so the skill score used a neutral fallback."];

  const contextReasons: string[] = [
    `Context similarity is ${contextScore}% after comparing normalized resume and JD language with TF-IDF and cosine similarity.`,
  ];
  if (matchedSkills.length > 0) {
    contextReasons.push(`The resume and JD share strong technology overlap, including ${formatList(matchedSkills, 4)}.`);
  }
  if (matchedKeywords.length > 0) {
    contextReasons.push(`Shared responsibility phrases include ${formatList(matchedKeywords, 3)}.`);
  }
  if (missingKeywords.length > 0) {
    contextReasons.push(`Less visible JD phrases include ${formatList(missingKeywords, 3)}.`);
  } else {
    contextReasons.push("The main JD themes were already reflected in the resume wording.");
  }

  const explanation = [
    `Skills Score: ${skillScore}%${missingSkills.length ? ` because ${matchedSkills.length} of ${jdSkills.length} recognized JD skills were matched.` : " because all recognized JD skills were matched."}`,
    `Context Score: ${contextScore}%${missingKeywords.length ? ` with strong overlap, but weaker wording around ${formatList(missingKeywords, 3)}.` : " because the resume and JD use very similar role and workflow language."}`,
    `Experience Score: ${experienceComponent.score}%${experienceComponent.requiredYears ? ` after comparing the resume against a ${experienceComponent.requiredYears}+ year requirement.` : " after comparing role alignment, responsibilities, and evidence of relevant experience."}`,
  ];

  const needsMetrics = !hasMetrics(resumeSections.experience || resumeText);
  const needsBullets = !hasBulletPoints(resumeSections.experience || resumeText);

  const suggestions = buildSuggestions({
    missingSkills,
    missingKeywords,
    recommendedSkills,
    structuredResume,
    requiredYears: experienceComponent.requiredYears,
    resumeYears: experienceComponent.resumeYears,
    feedbackNeedsMetrics: needsMetrics,
    feedbackNeedsBullets: needsBullets,
    jdSkills,
    matchedSkills,
    contextScore,
    experienceScore: experienceComponent.score,
  });

  const feedback: Feedback = {
    skills:
      jdSkills.length > 0
        ? `${matchedSkills.length} of ${jdSkills.length} recognized JD skills matched.${missingSkills.length ? ` Missing skills include ${formatList(missingSkills, 5)}.` : " The main requested skills were covered."}`
        : "The JD did not provide enough recognizable skill terms, so the analyzer leaned more on context and experience.",
    experience: experienceComponent.reasons.join(" "),
    formatting: [
      structuredResume.skills.length > 0 ? "Skills section detected." : "No dedicated Skills section detected.",
      needsBullets ? "Experience bullets are limited." : "Bullet points detected in experience.",
      needsMetrics ? "Few measurable achievements were detected." : "Measurable achievements detected.",
    ].join(" "),
  };

  return {
    score,
    matchedSkills,
    missingSkills,
    recommendedSkills,
    suggestions: suggestions.length > 0 ? suggestions : ["No major ATS gaps were detected. Keep tailoring the summary and experience bullets to the target role."],
    matchedKeywords,
    missingKeywords,
    scoreBreakdown: {
      skills: skillScore,
      context: contextScore,
      experience: experienceComponent.score,
      total: score,
      explanation,
      details: {
        skills: { score: skillScore, reasons: skillReasons },
        context: { score: contextScore, reasons: contextReasons },
        experience: { score: experienceComponent.score, reasons: experienceComponent.reasons },
      },
    },
    feedback,
    confidenceScore: calculateConfidenceScore(jdSkills, resumeSkills, jdKeywords, resumeKeywords, contextScore),
    jdValidation,
    skillCategories: {
      resume: categorizeSkills(resumeSkills),
      jobDescription: categorizeSkills(jdSkills),
      matched: categorizeSkills(matchedSkills),
      missing: categorizeSkills(missingSkills),
    },
    extractedData: {
      resumeSkills,
      jdSkills,
      resumeKeywords,
      jdKeywords,
      resumeYears: experienceComponent.resumeYears,
      requiredYears: experienceComponent.requiredYears,
      structuredResume,
      structuredJobDescription,
    },
  };
}
