export interface InterviewQuestion {
  id: string
  category: string
  topics: string[]
  difficulty: 1 | 2 | 3 | 4 | 5
  korean: string
  english: string
  assessmentFocus: string[]
}

// Question bank organized by category and difficulty
export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  // System Design Questions (Senior Level)
  {
    id: "sd-1",
    category: "system-design",
    topics: ["scalability", "architecture", "distributed-systems"],
    difficulty: 4,
    korean: "대규모 트래픽을 처리하는 URL 단축 서비스를 설계해주세요. 먼저 기능 요구사항부터 정의해볼까요?",
    english: "Design a URL shortening service that handles high traffic. Let's start by defining functional requirements.",
    assessmentFocus: ["requirements-gathering", "scalability", "data-modeling"],
  },
  {
    id: "sd-2",
    category: "system-design",
    topics: ["scalability", "architecture", "messaging"],
    difficulty: 4,
    korean: "실시간 채팅 시스템을 설계해주세요. 1억 명의 사용자를 지원해야 합니다. 어떻게 접근하시겠습니까?",
    english: "Design a real-time chat system supporting 100M users. How would you approach this?",
    assessmentFocus: ["real-time-systems", "scalability", "messaging"],
  },
  {
    id: "sd-3",
    category: "system-design",
    topics: ["scalability", "architecture", "storage"],
    difficulty: 5,
    korean: "Netflix와 같은 비디오 스트리밍 서비스의 백엔드를 설계해주세요. CDN 전략부터 시작해볼까요?",
    english: "Design the backend for a video streaming service like Netflix. Let's start with CDN strategy.",
    assessmentFocus: ["cdn", "video-streaming", "storage"],
  },
  {
    id: "sd-4",
    category: "system-design",
    topics: ["scalability", "architecture", "search"],
    difficulty: 3,
    korean: "전자상거래 사이트의 상품 검색 시스템을 설계해주세요. 검색 인덱싱 전략은 어떻게 하시겠습니까?",
    english: "Design a product search system for an e-commerce site. What's your indexing strategy?",
    assessmentFocus: ["search", "indexing", "relevance"],
  },

  // Frontend Technical Questions
  {
    id: "fe-1",
    category: "frontend",
    topics: ["react", "performance", "hooks"],
    difficulty: 3,
    korean: "React에서 useMemo와 useCallback의 차이점과 각각 언제 사용해야 하는지 예시와 함께 설명해주세요.",
    english: "Explain the difference between useMemo and useCallback in React with examples of when to use each.",
    assessmentFocus: ["react-hooks", "performance", "optimization"],
  },
  {
    id: "fe-2",
    category: "frontend",
    topics: ["javascript", "async", "promises"],
    difficulty: 3,
    korean: "Promise.all()과 Promise.allSettled()의 차이점을 설명하고, 각각의 사용 사례를 제시해주세요.",
    english: "Explain the difference between Promise.all() and Promise.allSettled() with use cases for each.",
    assessmentFocus: ["async-programming", "error-handling", "promises"],
  },
  {
    id: "fe-3",
    category: "frontend",
    topics: ["react", "state-management", "architecture"],
    difficulty: 4,
    korean: "대규모 React 애플리케이션에서 상태 관리 전략을 어떻게 설계하시겠습니까? Context API vs Redux vs Zustand를 비교해주세요.",
    english: "How would you design state management for a large React app? Compare Context API vs Redux vs Zustand.",
    assessmentFocus: ["state-management", "architecture", "scalability"],
  },
  {
    id: "fe-4",
    category: "frontend",
    topics: ["performance", "optimization", "metrics"],
    difficulty: 3,
    korean: "웹 애플리케이션의 First Contentful Paint를 개선하기 위한 5가지 전략을 설명해주세요.",
    english: "Explain 5 strategies to improve First Contentful Paint in a web application.",
    assessmentFocus: ["web-vitals", "performance", "optimization"],
  },
  {
    id: "fe-5",
    category: "frontend",
    topics: ["css", "responsive", "layout"],
    difficulty: 2,
    korean: "CSS Grid와 Flexbox의 차이점을 설명하고, 각각 어떤 레이아웃 문제에 적합한지 예시를 들어주세요.",
    english: "Explain the differences between CSS Grid and Flexbox, with examples of layout problems each solves best.",
    assessmentFocus: ["css-layout", "responsive-design", "modern-css"],
  },

  // Backend Technical Questions
  {
    id: "be-1",
    category: "backend",
    topics: ["databases", "optimization", "indexing"],
    difficulty: 3,
    korean: "데이터베이스 인덱스가 쿼리 성능을 향상시키는 원리와 인덱스 생성 시 고려사항을 설명해주세요.",
    english: "Explain how database indexes improve query performance and what to consider when creating indexes.",
    assessmentFocus: ["database-optimization", "indexing", "query-performance"],
  },
  {
    id: "be-2",
    category: "backend",
    topics: ["microservices", "architecture", "communication"],
    difficulty: 4,
    korean: "마이크로서비스 간 통신에서 동기식과 비동기식 패턴의 장단점을 설명하고, 각각 어떤 상황에 적합한지 설명해주세요.",
    english: "Explain pros/cons of synchronous vs asynchronous patterns in microservice communication and when to use each.",
    assessmentFocus: ["microservices", "communication-patterns", "architecture"],
  },
  {
    id: "be-3",
    category: "backend",
    topics: ["api", "design", "rest"],
    difficulty: 2,
    korean: "RESTful API에서 멱등성(Idempotency)이란 무엇이며, 각 HTTP 메서드의 멱등성을 설명해주세요.",
    english: "What is idempotency in RESTful APIs? Explain the idempotency of each HTTP method.",
    assessmentFocus: ["api-design", "rest-principles", "http"],
  },
  {
    id: "be-4",
    category: "backend",
    topics: ["databases", "transactions", "acid"],
    difficulty: 3,
    korean: "분산 시스템에서 ACID 트랜잭션을 보장하기 어려운 이유와 대안적 접근 방법을 설명해주세요.",
    english: "Explain why ACID transactions are challenging in distributed systems and alternative approaches.",
    assessmentFocus: ["distributed-systems", "transactions", "consistency"],
  },
  {
    id: "be-5",
    category: "backend",
    topics: ["caching", "performance", "redis"],
    difficulty: 3,
    korean: "캐시 무효화 전략 3가지를 설명하고, 각각의 장단점과 적용 시나리오를 제시해주세요.",
    english: "Explain 3 cache invalidation strategies with their pros/cons and application scenarios.",
    assessmentFocus: ["caching", "performance", "cache-strategies"],
  },

  // Algorithm Questions
  {
    id: "algo-1",
    category: "algorithms",
    topics: ["arrays", "hash-tables", "optimization"],
    difficulty: 2,
    korean: "주어진 배열에서 두 수의 합이 target이 되는 모든 쌍을 찾는 함수를 구현하고 시간복잡도를 분석해주세요.",
    english: "Implement a function to find all pairs in an array that sum to a target. Analyze the time complexity.",
    assessmentFocus: ["problem-solving", "complexity-analysis", "optimization"],
  },
  {
    id: "algo-2",
    category: "algorithms",
    topics: ["trees", "traversal", "recursion"],
    difficulty: 3,
    korean: "이진 트리의 최대 깊이를 구하는 알고리즘을 재귀와 반복 두 가지 방법으로 구현해주세요.",
    english: "Implement an algorithm to find the maximum depth of a binary tree using both recursive and iterative approaches.",
    assessmentFocus: ["tree-algorithms", "recursion", "iteration"],
  },
  {
    id: "algo-3",
    category: "algorithms",
    topics: ["strings", "dynamic-programming", "optimization"],
    difficulty: 4,
    korean: "두 문자열의 최장 공통 부분 수열(LCS)을 찾는 알고리즘을 구현하고, 공간 복잡도를 최적화해주세요.",
    english: "Implement an algorithm to find the Longest Common Subsequence of two strings and optimize space complexity.",
    assessmentFocus: ["dynamic-programming", "optimization", "string-algorithms"],
  },
  {
    id: "algo-4",
    category: "algorithms",
    topics: ["graphs", "search", "bfs"],
    difficulty: 3,
    korean: "그래프에서 두 노드 간 최단 경로를 찾는 BFS 알고리즘을 구현하고, 경로도 함께 반환하도록 해주세요.",
    english: "Implement BFS to find the shortest path between two nodes in a graph, returning the actual path.",
    assessmentFocus: ["graph-algorithms", "bfs", "path-finding"],
  },

  // Leadership/Behavioral Questions
  {
    id: "lead-1",
    category: "leadership",
    topics: ["conflict-resolution", "teamwork", "communication"],
    difficulty: 3,
    korean: "팀원 간 기술적 의견 충돌이 있었던 상황과 어떻게 해결했는지 구체적으로 설명해주세요.",
    english: "Describe a specific situation where your team had conflicting technical opinions. How did you resolve it?",
    assessmentFocus: ["conflict-resolution", "leadership", "communication"],
  },
  {
    id: "lead-2",
    category: "leadership",
    topics: ["project-management", "deadline", "prioritization"],
    difficulty: 3,
    korean: "마감 기한이 촉박한 상황에서 품질과 속도 사이의 균형을 어떻게 맞추었는지 사례를 들어 설명해주세요.",
    english: "Give an example of balancing quality vs speed under tight deadlines. How did you manage it?",
    assessmentFocus: ["decision-making", "prioritization", "quality"],
  },
  {
    id: "lead-3",
    category: "leadership",
    topics: ["mentoring", "growth", "team-development"],
    difficulty: 4,
    korean: "주니어 개발자의 성장을 도왔던 경험과 어떤 방법을 사용했는지 구체적으로 설명해주세요.",
    english: "Describe how you helped a junior developer grow. What specific methods did you use?",
    assessmentFocus: ["mentoring", "team-development", "leadership"],
  },
  {
    id: "lead-4",
    category: "leadership",
    topics: ["failure", "learning", "improvement"],
    difficulty: 3,
    korean: "실패한 프로젝트나 실수에서 배운 가장 중요한 교훈은 무엇이며, 이후 어떻게 적용했나요?",
    english: "What's the most important lesson you learned from a failed project or mistake, and how did you apply it?",
    assessmentFocus: ["learning", "self-awareness", "growth-mindset"],
  },

  // Cloud/DevOps Questions
  {
    id: "cloud-1",
    category: "devops",
    topics: ["kubernetes", "debugging", "troubleshooting"],
    difficulty: 3,
    korean: "Kubernetes에서 Pod가 계속 재시작되는 문제를 어떻게 디버깅하고 해결하시겠습니까?",
    english: "How would you debug and resolve a Pod that keeps restarting in Kubernetes?",
    assessmentFocus: ["kubernetes", "troubleshooting", "debugging"],
  },
  {
    id: "cloud-2",
    category: "devops",
    topics: ["ci-cd", "automation", "deployment"],
    difficulty: 3,
    korean: "Blue-Green 배포와 Canary 배포의 차이점을 설명하고, 각각 어떤 상황에 적합한지 설명해주세요.",
    english: "Explain the difference between Blue-Green and Canary deployments and when to use each.",
    assessmentFocus: ["deployment-strategies", "risk-management", "ci-cd"],
  },
  {
    id: "cloud-3",
    category: "devops",
    topics: ["monitoring", "observability", "metrics"],
    difficulty: 4,
    korean: "분산 시스템에서 효과적인 모니터링 전략을 설계해주세요. 어떤 메트릭을 추적하고 어떻게 알림을 설정하시겠습니까?",
    english: "Design an effective monitoring strategy for distributed systems. What metrics would you track and how would you set alerts?",
    assessmentFocus: ["observability", "monitoring", "alerting"],
  },
  {
    id: "cloud-4",
    category: "devops",
    topics: ["infrastructure", "terraform", "iac"],
    difficulty: 3,
    korean: "Infrastructure as Code의 장점을 설명하고, Terraform 상태 관리의 베스트 프랙티스를 제시해주세요.",
    english: "Explain the benefits of Infrastructure as Code and best practices for Terraform state management.",
    assessmentFocus: ["iac", "terraform", "best-practices"],
  },

  // Mobile Development Questions
  {
    id: "mobile-1",
    category: "mobile",
    topics: ["offline", "sync", "data-management"],
    difficulty: 3,
    korean: "모바일 앱에서 오프라인 모드를 구현할 때 데이터 동기화 전략을 어떻게 설계하시겠습니까?",
    english: "How would you design a data synchronization strategy for offline mode in a mobile app?",
    assessmentFocus: ["offline-first", "sync-strategies", "conflict-resolution"],
  },
  {
    id: "mobile-2",
    category: "mobile",
    topics: ["performance", "battery", "optimization"],
    difficulty: 3,
    korean: "모바일 앱의 배터리 소모를 최소화하기 위한 5가지 최적화 전략을 설명해주세요.",
    english: "Explain 5 optimization strategies to minimize battery consumption in mobile apps.",
    assessmentFocus: ["battery-optimization", "performance", "mobile-best-practices"],
  },
  {
    id: "mobile-3",
    category: "mobile",
    topics: ["react-native", "native", "cross-platform"],
    difficulty: 3,
    korean: "React Native와 네이티브 개발의 장단점을 비교하고, 프로젝트 선택 기준을 제시해주세요.",
    english: "Compare pros/cons of React Native vs native development and provide project selection criteria.",
    assessmentFocus: ["cross-platform", "technology-selection", "trade-offs"],
  },

  // Product Engineering Questions
  {
    id: "product-1",
    category: "product",
    topics: ["ab-testing", "metrics", "analytics"],
    difficulty: 3,
    korean: "A/B 테스트를 설계하고 구현한 경험이 있다면, 어떤 메트릭을 추적했고 결과를 어떻게 분석했는지 설명해주세요.",
    english: "If you've designed A/B tests, explain what metrics you tracked and how you analyzed results.",
    assessmentFocus: ["experimentation", "data-analysis", "metrics"],
  },
  {
    id: "product-2",
    category: "product",
    topics: ["user-experience", "metrics", "optimization"],
    difficulty: 3,
    korean: "사용자 리텐션을 개선하기 위해 구현한 기능과 그 효과를 측정한 방법을 설명해주세요.",
    english: "Describe features you implemented to improve user retention and how you measured their effectiveness.",
    assessmentFocus: ["retention", "metrics", "product-thinking"],
  },
  {
    id: "product-3",
    category: "product",
    topics: ["prioritization", "roadmap", "stakeholder"],
    difficulty: 4,
    korean: "기술 부채 해결과 새 기능 개발 사이의 우선순위를 어떻게 결정하시나요? 실제 사례를 들어 설명해주세요.",
    english: "How do you prioritize between technical debt and new features? Provide a real example.",
    assessmentFocus: ["prioritization", "technical-debt", "decision-making"],
  },

  // Junior Level Questions
  {
    id: "junior-1",
    category: "fundamentals",
    topics: ["api", "web", "basics"],
    difficulty: 2,
    korean: "REST API와 GraphQL의 차이점을 설명하고, 각각 어떤 상황에서 사용하는 것이 좋은지 설명해주세요.",
    english: "Explain the differences between REST API and GraphQL, and when to use each.",
    assessmentFocus: ["api-basics", "comparison", "use-cases"],
  },
  {
    id: "junior-2",
    category: "fundamentals",
    topics: ["git", "version-control", "collaboration"],
    difficulty: 1,
    korean: "Git에서 merge와 rebase의 차이점을 설명하고, 각각 언제 사용하는지 설명해주세요.",
    english: "Explain the difference between merge and rebase in Git and when to use each.",
    assessmentFocus: ["git-basics", "version-control", "workflow"],
  },
  {
    id: "junior-3",
    category: "fundamentals",
    topics: ["security", "web", "basics"],
    difficulty: 2,
    korean: "XSS와 CSRF 공격이 무엇인지 설명하고, 각각을 방어하는 방법을 제시해주세요.",
    english: "Explain XSS and CSRF attacks and how to defend against each.",
    assessmentFocus: ["web-security", "vulnerabilities", "prevention"],
  },
  {
    id: "junior-4",
    category: "fundamentals",
    topics: ["database", "sql", "basics"],
    difficulty: 2,
    korean: "SQL에서 JOIN의 종류를 설명하고, 각각의 사용 예시를 들어주세요.",
    english: "Explain types of JOINs in SQL with examples of when to use each.",
    assessmentFocus: ["sql-basics", "database-queries", "joins"],
  },
]

// Function to select appropriate questions based on context
export function selectInitialQuestion(
  topics: string[],
  difficulty: number,
  sessionTitle?: string,
  previousQuestionIds: string[] = []
): InterviewQuestion {
  // Filter questions by difficulty range (±1 level flexibility)
  const difficultyRange = [
    Math.max(1, difficulty - 1),
    Math.min(5, difficulty + 1)
  ]

  let candidateQuestions = INTERVIEW_QUESTIONS.filter(q =>
    q.difficulty >= difficultyRange[0] &&
    q.difficulty <= difficultyRange[1] &&
    !previousQuestionIds.includes(q.id)
  )

  // Score questions based on topic match
  const scoredQuestions = candidateQuestions.map(q => {
    let score = 0

    // Topic matching
    const topicMatches = topics.filter(topic => {
      const lowerTopic = topic.toLowerCase()
      return q.topics.some(qTopic =>
        qTopic.includes(lowerTopic) || lowerTopic.includes(qTopic)
      ) || q.category.includes(lowerTopic)
    }).length

    score += topicMatches * 10

    // Title keyword matching (if provided)
    if (sessionTitle) {
      const titleLower = sessionTitle.toLowerCase()
      const titleKeywords = titleLower.split(/\s+/)

      titleKeywords.forEach(keyword => {
        if (q.korean.toLowerCase().includes(keyword) ||
            q.english.toLowerCase().includes(keyword)) {
          score += 5
        }
        if (q.assessmentFocus.some(focus => focus.includes(keyword))) {
          score += 3
        }
      })
    }

    // Exact difficulty match bonus
    if (q.difficulty === difficulty) {
      score += 5
    }

    // Add randomness to avoid always picking the same question
    score += Math.random() * 5

    return { question: q, score }
  })

  // Sort by score and pick from top candidates
  scoredQuestions.sort((a, b) => b.score - a.score)

  // If we have good matches, pick from top 3
  const topCandidates = scoredQuestions.slice(0, 3)

  if (topCandidates.length > 0) {
    // Weighted random selection from top candidates
    const weights = topCandidates.map((_, i) => Math.pow(2, 2 - i))
    const totalWeight = weights.reduce((a, b) => a + b, 0)
    let random = Math.random() * totalWeight

    for (let i = 0; i < topCandidates.length; i++) {
      random -= weights[i]
      if (random <= 0) {
        return topCandidates[i].question
      }
    }

    return topCandidates[0].question
  }

  // Fallback: pick any question matching difficulty
  const fallbackQuestions = INTERVIEW_QUESTIONS.filter(q =>
    q.difficulty === difficulty && !previousQuestionIds.includes(q.id)
  )

  if (fallbackQuestions.length > 0) {
    return fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)]
  }

  // Last resort: any question not previously asked
  const remainingQuestions = INTERVIEW_QUESTIONS.filter(q =>
    !previousQuestionIds.includes(q.id)
  )

  return remainingQuestions[Math.floor(Math.random() * remainingQuestions.length)]
}

// Function to get follow-up questions based on current topic
export function getFollowUpQuestions(
  currentCategory: string,
  currentTopics: string[],
  difficulty: number,
  excludeIds: string[] = []
): InterviewQuestion[] {
  const candidates = INTERVIEW_QUESTIONS.filter(q =>
    q.category === currentCategory &&
    !excludeIds.includes(q.id) &&
    Math.abs(q.difficulty - difficulty) <= 1 &&
    q.topics.some(topic => currentTopics.includes(topic))
  )

  return candidates.slice(0, 3)
}