export interface Session {
  id: string;
  userId: string;          // Added for protected access

  topicIds: string[];     // 카탈로그 도입 시 사용 (선택)
  topicLabels?: string[]; // Topic names for display

  title: string;           // ex) "System Design: Scale a Chat App"

  // 진행/점수
  progress: number;        // 0–100 (저장)
  score: number;           // 0–100 (최적화 대상)
  targetScore?: number;    // 기본 100 권장, 재도전 정책에 활용

  // 시간
  createdAt: string;       // ISO
  updatedAt: string;       // ISO
  lastInteractionAt?: string; // ISO, 마지막 사용자 응답 시각

  // 인터뷰어(페르소나) 참조
  interviewerId: string;

  // OpenAI conversation reference
  conversationId?: string;

  // 세션 상태
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';

  // 재도전 정책(선택)
  retryPolicy?: {
    minCooldownHours?: number; // 재도전 쿨다운
    autoSuggestIfBelow?: number; // ex) 70 미만이면 재도전 제안
  };

  // 메타(선택)
  labels?: string[];
  notes?: string;
  language?: 'ko' | 'en' | 'ja';
  difficulty?: 1 | 2 | 3 | 4 | 5; // 전반 난이도 태그

  // Recent messages (optional, populated when fetching session details)
  recentMessages?: Array<{
    id: string;
    conversationId: string;
    status: string;
    model?: string;
    output: any;
    temperature?: number;
    usage?: any;
    metadata?: any;
    createdAt: string;
  }>;
}

export interface Interviewer {
  id: string;

  // 식별/표시
  displayName: string;     // ex) "Google EM (Bar Raiser)"
  company?: string;        // ex) "Google"
  role?: string;           // ex) "SWE", "EM", "TL"
  seniority?: 'junior' | 'mid' | 'senior' | 'staff' | 'principal';

  // 커버리지
  typeCoverage: ('tech' | 'leadership' | 'behavioral')[];
  topicIds: string[];     // 카탈로그 도입 시 특정 주제 바인딩(선택)

  // 인터뷰 스타일/난이도
  style?: 'friendly' | 'socratic' | 'bar-raiser' | 'structured' | 'conversational';
  difficulty?: 1 | 2 | 3 | 4 | 5;

  // 회사/트렌드 맥락
  knowledgeScope?: {
    usesCompanyTrends?: boolean;   // 회사 최신 동향 반영 여부
    refreshPolicy?: 'manual' | 'auto';
    knowledgeCutoff?: string;      // ISO (페르소나 기준 컷오프)
  };

  // 프롬프트/옵션(선택)
  promptTemplateId?: string; // 사전 정의 템플릿 참조
  language?: 'ko' | 'en' | 'ja';
  timezone?: string;         // ex) "Asia/Seoul"

  // 운영 메타
  createdAt: string;         // ISO
  updatedAt: string;         // ISO
  version?: string;          // 페르소나 버전 관리
}

export interface Category {
  id: string;

  // 분류 타입 (MVP 기준)
  type: 'tech' | 'leadership' | 'behavioral';

  // 표시용
  name: string;        // ex) "System Design", "Frontend", "Team Management"
  description?: string;

  // 계층
  topics?: Topic[];

  // 메타
  createdAt: string;
  updatedAt: string;
}

export interface Topic {
  id: string;

  // 부모 category 참조
  categoryId: string;
  categoryName?: string;  // Added for joined query results

  // 표시용
  name: string;        // ex) "Rate Limiter", "React Performance", "Conflict Resolution"
  description?: string;

  // 난이도/태그
  difficulty?: 1 | 2 | 3 | 4 | 5;
  tags?: string[];     // ex) ["scalability", "networking", "ownership"]

  // 메타
  createdAt: string;
  updatedAt: string;
}