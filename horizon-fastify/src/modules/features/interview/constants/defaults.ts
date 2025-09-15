import { Session, Interviewer, Category } from '../domain/types';

export const DEFAULT_SESSION_VALUES = {
  progress: 0,
  score: 0,
  targetScore: 100,
  status: 'draft' as Session['status'],
  language: 'ko' as Session['language'],
  difficulty: 3 as const,
};

export const DEFAULT_INTERVIEWER_VALUES = {
  seniority: 'mid' as Interviewer['seniority'],
  style: 'structured' as Interviewer['style'],
  difficulty: 3 as const,
  language: 'ko' as Interviewer['language'],
  timezone: 'Asia/Seoul',
  version: '1.0.0',
  knowledgeScope: {
    usesCompanyTrends: false,
    refreshPolicy: 'manual' as const,
  },
};

export const DEFAULT_RETRY_POLICY = {
  minCooldownHours: 24,
  autoSuggestIfBelow: 70,
};

export const SESSION_STATUS_TRANSITIONS = {
  draft: ['active', 'archived'],
  active: ['paused', 'completed', 'archived'],
  paused: ['active', 'archived'],
  completed: ['archived'],
  archived: [],
} as const;

export const DIFFICULTY_LEVELS = [1, 2, 3, 4, 5] as const;

export const LANGUAGES = ['ko', 'en', 'ja'] as const;

export const SENIORITY_LEVELS = ['junior', 'mid', 'senior', 'staff', 'principal'] as const;

export const INTERVIEW_STYLES = ['friendly', 'socratic', 'bar-raiser', 'structured', 'conversational'] as const;

export const CATEGORY_TYPES = ['tech', 'leadership', 'behavioral'] as const;

export const TYPE_COVERAGE_OPTIONS = ['tech', 'leadership', 'behavioral'] as const;

export const KNOWLEDGE_REFRESH_POLICIES = ['manual', 'auto'] as const;