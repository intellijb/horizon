import { getDatabase } from "@modules/platform/database"
import { categories, topics, interviewers } from "../schema/interview.schema"

export async function seedInterviewData() {
  // Create database connection
  const db = getDatabase()

  console.log("🌱 Starting interview data seed...")

  // 1. Seed Categories
  console.log("📁 Creating categories...")
  const categoryData = [
    {
      id: "cat-tech-1",
      type: "tech" as const,
      name: "System Design",
      description: "Large-scale distributed systems, architecture patterns, and scalability",
    },
    {
      id: "cat-tech-2",
      type: "tech" as const,
      name: "Frontend Development",
      description: "Client-side technologies, frameworks, and user interface development",
    },
    {
      id: "cat-tech-3",
      type: "tech" as const,
      name: "Backend Development",
      description: "Server-side development, APIs, databases, and microservices",
    },
    {
      id: "cat-tech-4",
      type: "tech" as const,
      name: "Algorithms & Data Structures",
      description: "Problem solving, computational complexity, and optimization",
    },
    {
      id: "cat-tech-5",
      type: "tech" as const,
      name: "Cloud & DevOps",
      description: "Cloud platforms, CI/CD, containerization, and infrastructure",
    },
    {
      id: "cat-tech-6",
      type: "tech" as const,
      name: "Mobile Development",
      description: "iOS, Android, and cross-platform mobile application development",
    },
    {
      id: "cat-leadership-1",
      type: "leadership" as const,
      name: "Team Management",
      description: "Leading teams, delegation, and organizational skills",
    },
    {
      id: "cat-leadership-2",
      type: "leadership" as const,
      name: "Technical Leadership",
      description: "Technical decision making, architecture ownership, and mentoring",
    },
    {
      id: "cat-leadership-3",
      type: "leadership" as const,
      name: "Product Strategy",
      description: "Product vision, roadmap planning, and stakeholder management",
    },
    {
      id: "cat-behavioral-1",
      type: "behavioral" as const,
      name: "Communication",
      description: "Interpersonal skills, presentation, and written communication",
    },
    {
      id: "cat-behavioral-2",
      type: "behavioral" as const,
      name: "Problem Solving",
      description: "Analytical thinking, creativity, and decision making",
    },
    {
      id: "cat-behavioral-3",
      type: "behavioral" as const,
      name: "Collaboration",
      description: "Teamwork, conflict resolution, and cross-functional partnership",
    },
  ]

  for (const category of categoryData) {
    await db
      .insert(categories)
      .values(category)
      .onConflictDoNothing()
  }

  // 2. Seed Topics
  console.log("📚 Creating topics...")
  const topicData = [
    // System Design Topics
    {
      id: "topic-sd-1",
      categoryId: "cat-tech-1",
      name: "Design a URL Shortener",
      description: "Design a scalable URL shortening service like bit.ly",
      difficulty: 3,
      tags: ["scalability", "database", "caching", "distributed-systems"],
    },
    {
      id: "topic-sd-2",
      categoryId: "cat-tech-1",
      name: "Design a Chat Application",
      description: "Design a real-time messaging system like WhatsApp or Slack",
      difficulty: 4,
      tags: ["real-time", "websockets", "messaging", "scalability"],
    },
    {
      id: "topic-sd-3",
      categoryId: "cat-tech-1",
      name: "Design a Video Streaming Platform",
      description: "Design a video streaming service like YouTube or Netflix",
      difficulty: 5,
      tags: ["cdn", "video-processing", "scalability", "storage"],
    },
    {
      id: "topic-sd-4",
      categoryId: "cat-tech-1",
      name: "Design a Payment System",
      description: "Design a secure payment processing system",
      difficulty: 4,
      tags: ["security", "transactions", "compliance", "reliability"],
    },
    {
      id: "topic-sd-5",
      categoryId: "cat-tech-1",
      name: "Design a Social Media Feed",
      description: "Design a social media timeline/feed system",
      difficulty: 4,
      tags: ["ranking", "personalization", "caching", "scalability"],
    },

    // Frontend Topics
    {
      id: "topic-fe-1",
      categoryId: "cat-tech-2",
      name: "React Performance Optimization",
      description: "Techniques for optimizing React application performance",
      difficulty: 3,
      tags: ["react", "performance", "optimization", "memoization"],
    },
    {
      id: "topic-fe-2",
      categoryId: "cat-tech-2",
      name: "State Management Patterns",
      description: "Redux, Context API, and modern state management",
      difficulty: 3,
      tags: ["state-management", "redux", "context", "architecture"],
    },
    {
      id: "topic-fe-3",
      categoryId: "cat-tech-2",
      name: "CSS Architecture",
      description: "CSS-in-JS, CSS Modules, and styling strategies",
      difficulty: 2,
      tags: ["css", "styling", "architecture", "responsive"],
    },
    {
      id: "topic-fe-4",
      categoryId: "cat-tech-2",
      name: "Web Accessibility",
      description: "Building accessible web applications",
      difficulty: 3,
      tags: ["accessibility", "a11y", "wcag", "usability"],
    },
    {
      id: "topic-fe-5",
      categoryId: "cat-tech-2",
      name: "JavaScript Event Loop",
      description: "Understanding async JavaScript and the event loop",
      difficulty: 3,
      tags: ["javascript", "async", "event-loop", "promises"],
    },

    // Backend Topics
    {
      id: "topic-be-1",
      categoryId: "cat-tech-3",
      name: "RESTful API Design",
      description: "Best practices for designing REST APIs",
      difficulty: 2,
      tags: ["api", "rest", "http", "design"],
    },
    {
      id: "topic-be-2",
      categoryId: "cat-tech-3",
      name: "Database Optimization",
      description: "Query optimization and database performance tuning",
      difficulty: 4,
      tags: ["database", "sql", "optimization", "indexing"],
    },
    {
      id: "topic-be-3",
      categoryId: "cat-tech-3",
      name: "Microservices Architecture",
      description: "Designing and implementing microservices",
      difficulty: 4,
      tags: ["microservices", "architecture", "distributed", "apis"],
    },
    {
      id: "topic-be-4",
      categoryId: "cat-tech-3",
      name: "Authentication & Authorization",
      description: "Implementing secure auth systems",
      difficulty: 3,
      tags: ["security", "auth", "jwt", "oauth"],
    },
    {
      id: "topic-be-5",
      categoryId: "cat-tech-3",
      name: "Message Queues",
      description: "Implementing async processing with message queues",
      difficulty: 3,
      tags: ["messaging", "async", "rabbitmq", "kafka"],
    },

    // Algorithm Topics
    {
      id: "topic-algo-1",
      categoryId: "cat-tech-4",
      name: "Array Manipulation",
      description: "Common array problems and techniques",
      difficulty: 2,
      tags: ["arrays", "algorithms", "data-structures"],
    },
    {
      id: "topic-algo-2",
      categoryId: "cat-tech-4",
      name: "Binary Trees",
      description: "Tree traversal and manipulation algorithms",
      difficulty: 3,
      tags: ["trees", "binary-trees", "recursion", "traversal"],
    },
    {
      id: "topic-algo-3",
      categoryId: "cat-tech-4",
      name: "Dynamic Programming",
      description: "Solving optimization problems with DP",
      difficulty: 4,
      tags: ["dynamic-programming", "optimization", "memoization"],
    },
    {
      id: "topic-algo-4",
      categoryId: "cat-tech-4",
      name: "Graph Algorithms",
      description: "BFS, DFS, and shortest path algorithms",
      difficulty: 4,
      tags: ["graphs", "bfs", "dfs", "dijkstra"],
    },
    {
      id: "topic-algo-5",
      categoryId: "cat-tech-4",
      name: "Sorting & Searching",
      description: "Efficient sorting and searching techniques",
      difficulty: 2,
      tags: ["sorting", "searching", "binary-search", "complexity"],
    },

    // Cloud & DevOps Topics
    {
      id: "topic-cloud-1",
      categoryId: "cat-tech-5",
      name: "Kubernetes Architecture",
      description: "Container orchestration with Kubernetes",
      difficulty: 4,
      tags: ["kubernetes", "containers", "orchestration", "k8s"],
    },
    {
      id: "topic-cloud-2",
      categoryId: "cat-tech-5",
      name: "CI/CD Pipelines",
      description: "Building automated deployment pipelines",
      difficulty: 3,
      tags: ["cicd", "automation", "deployment", "jenkins"],
    },
    {
      id: "topic-cloud-3",
      categoryId: "cat-tech-5",
      name: "AWS Services",
      description: "Core AWS services and architecture patterns",
      difficulty: 3,
      tags: ["aws", "cloud", "ec2", "s3", "lambda"],
    },
    {
      id: "topic-cloud-4",
      categoryId: "cat-tech-5",
      name: "Infrastructure as Code",
      description: "Managing infrastructure with Terraform",
      difficulty: 3,
      tags: ["terraform", "iac", "automation", "infrastructure"],
    },
    {
      id: "topic-cloud-5",
      categoryId: "cat-tech-5",
      name: "Monitoring & Observability",
      description: "Application monitoring and logging strategies",
      difficulty: 3,
      tags: ["monitoring", "logging", "metrics", "observability"],
    },

    // Leadership Topics
    {
      id: "topic-lead-1",
      categoryId: "cat-leadership-1",
      name: "Team Building",
      description: "Building and scaling engineering teams",
      difficulty: 3,
      tags: ["team-building", "hiring", "culture"],
    },
    {
      id: "topic-lead-2",
      categoryId: "cat-leadership-1",
      name: "Performance Management",
      description: "Conducting reviews and managing performance",
      difficulty: 3,
      tags: ["performance", "feedback", "reviews", "coaching"],
    },
    {
      id: "topic-lead-3",
      categoryId: "cat-leadership-2",
      name: "Technical Decision Making",
      description: "Making and communicating technical decisions",
      difficulty: 4,
      tags: ["decision-making", "architecture", "strategy"],
    },
    {
      id: "topic-lead-4",
      categoryId: "cat-leadership-2",
      name: "Mentoring Engineers",
      description: "Growing and developing team members",
      difficulty: 3,
      tags: ["mentoring", "coaching", "growth", "development"],
    },
    {
      id: "topic-lead-5",
      categoryId: "cat-leadership-3",
      name: "Stakeholder Management",
      description: "Working with product and business stakeholders",
      difficulty: 3,
      tags: ["stakeholders", "communication", "alignment"],
    },

    // Behavioral Topics
    {
      id: "topic-beh-1",
      categoryId: "cat-behavioral-1",
      name: "Difficult Conversations",
      description: "Handling challenging interpersonal situations",
      difficulty: 3,
      tags: ["communication", "conflict", "feedback"],
    },
    {
      id: "topic-beh-2",
      categoryId: "cat-behavioral-2",
      name: "Problem Solving Approach",
      description: "Systematic approach to solving problems",
      difficulty: 2,
      tags: ["problem-solving", "analytical", "methodology"],
    },
    {
      id: "topic-beh-3",
      categoryId: "cat-behavioral-3",
      name: "Cross-functional Collaboration",
      description: "Working effectively across teams",
      difficulty: 2,
      tags: ["collaboration", "teamwork", "communication"],
    },
    {
      id: "topic-beh-4",
      categoryId: "cat-behavioral-1",
      name: "Presenting Technical Concepts",
      description: "Explaining technical ideas to non-technical audiences",
      difficulty: 3,
      tags: ["presentation", "communication", "teaching"],
    },
    {
      id: "topic-beh-5",
      categoryId: "cat-behavioral-2",
      name: "Learning from Failure",
      description: "Handling and learning from mistakes",
      difficulty: 2,
      tags: ["growth", "resilience", "learning", "failure"],
    },
  ]

  for (const topic of topicData) {
    await db
      .insert(topics)
      .values(topic)
      .onConflictDoNothing()
  }

  // 3. Seed Interviewers
  console.log("👤 Creating interviewers...")
  const interviewerData = [
    {
      id: "int-1",
      displayName: "Alex Chen - System Design Expert",
      company: "Meta",
      role: "Principal Engineer",
      seniority: "principal" as const,
      typeCoverage: ["tech"] as ("tech")[],
      topicIds: ["topic-sd-1", "topic-sd-2", "topic-sd-3", "topic-sd-4", "topic-sd-5"],
      style: "structured" as const,
      difficulty: 4,
      promptTemplateId: "1",
      language: "en" as const,
      timezone: "America/Los_Angeles",
      version: "1.0.0",
    },
    {
      id: "int-2",
      displayName: "Sarah Kim - Frontend Lead",
      company: "Google",
      role: "Staff Engineer",
      seniority: "staff" as const,
      typeCoverage: ["tech"] as ("tech")[],
      topicIds: ["topic-fe-1", "topic-fe-2", "topic-fe-3", "topic-fe-4", "topic-fe-5"],
      style: "conversational" as const,
      difficulty: 3,
      promptTemplateId: "3",
      language: "en" as const,
      timezone: "America/New_York",
      version: "1.0.0",
    },
    {
      id: "int-3",
      displayName: "David Park - Backend Architect",
      company: "Amazon",
      role: "Senior SDE",
      seniority: "senior" as const,
      typeCoverage: ["tech"] as ("tech")[],
      topicIds: ["topic-be-1", "topic-be-2", "topic-be-3", "topic-be-4", "topic-be-5"],
      style: "structured" as const,
      difficulty: 4,
      promptTemplateId: "4",
      language: "en" as const,
      timezone: "America/Seattle",
      version: "1.0.0",
    },
    {
      id: "int-4",
      displayName: "Emily Johnson - Algorithm Specialist",
      company: "Microsoft",
      role: "SWE",
      seniority: "senior" as const,
      typeCoverage: ["tech"] as ("tech")[],
      topicIds: ["topic-algo-1", "topic-algo-2", "topic-algo-3", "topic-algo-4", "topic-algo-5"],
      style: "structured" as const,
      difficulty: 3,
      promptTemplateId: "5",
      language: "en" as const,
      timezone: "America/Seattle",
      version: "1.0.0",
    },
    {
      id: "int-5",
      displayName: "Michael Brown - Cloud Solutions Architect",
      company: "AWS",
      role: "Solutions Architect",
      seniority: "senior" as const,
      typeCoverage: ["tech"] as ("tech")[],
      topicIds: ["topic-cloud-1", "topic-cloud-2", "topic-cloud-3", "topic-cloud-4", "topic-cloud-5"],
      style: "structured" as const,
      difficulty: 4,
      promptTemplateId: "8",
      language: "en" as const,
      timezone: "America/Los_Angeles",
      version: "1.0.0",
    },
    {
      id: "int-6",
      displayName: "Jennifer Lee - Engineering Manager",
      company: "Netflix",
      role: "EM",
      seniority: "senior" as const,
      typeCoverage: ["leadership", "behavioral"] as ("leadership" | "behavioral")[],
      topicIds: ["topic-lead-1", "topic-lead-2", "topic-lead-3", "topic-lead-4", "topic-lead-5"],
      style: "conversational" as const,
      difficulty: 3,
      promptTemplateId: "2",
      language: "en" as const,
      timezone: "America/Los_Angeles",
      version: "1.0.0",
    },
    {
      id: "int-7",
      displayName: "Robert Wilson - Behavioral Interviewer",
      company: "Apple",
      role: "HR",
      seniority: "mid" as const,
      typeCoverage: ["behavioral"] as ("behavioral")[],
      topicIds: ["topic-beh-1", "topic-beh-2", "topic-beh-3", "topic-beh-4", "topic-beh-5"],
      style: "friendly" as const,
      difficulty: 2,
      promptTemplateId: "10",
      language: "en" as const,
      timezone: "America/Cupertino",
      version: "1.0.0",
    },
    {
      id: "int-8",
      displayName: "김준호 - 시니어 개발자",
      company: "Naver",
      role: "SWE",
      seniority: "senior" as const,
      typeCoverage: ["tech"] as ("tech")[],
      topicIds: ["topic-sd-1", "topic-be-1", "topic-be-2", "topic-fe-1"],
      style: "structured" as const,
      difficulty: 3,
      promptTemplateId: "1",
      language: "ko" as const,
      timezone: "Asia/Seoul",
      version: "1.0.0",
    },
    {
      id: "int-9",
      displayName: "박지은 - 프론트엔드 리드",
      company: "Kakao",
      role: "TL",
      seniority: "senior" as const,
      typeCoverage: ["tech"] as ("tech")[],
      topicIds: ["topic-fe-1", "topic-fe-2", "topic-fe-3", "topic-fe-4", "topic-fe-5"],
      style: "conversational" as const,
      difficulty: 3,
      promptTemplateId: "3",
      language: "ko" as const,
      timezone: "Asia/Seoul",
      version: "1.0.0",
    },
    {
      id: "int-10",
      displayName: "이승환 - 테크 리드",
      company: "Coupang",
      role: "TL",
      seniority: "staff" as const,
      typeCoverage: ["tech", "leadership"] as ("tech" | "leadership")[],
      topicIds: ["topic-sd-1", "topic-sd-2", "topic-lead-3", "topic-lead-4"],
      style: "bar-raiser" as const,
      difficulty: 4,
      promptTemplateId: "1",
      language: "ko" as const,
      timezone: "Asia/Seoul",
      version: "1.0.0",
    },
    {
      id: "int-11",
      displayName: "Lisa Thompson - Junior Developer Mentor",
      company: "Startup",
      role: "SWE",
      seniority: "mid" as const,
      typeCoverage: ["tech"] as ("tech")[],
      topicIds: ["topic-algo-1", "topic-fe-3", "topic-be-1", "topic-algo-5"],
      style: "friendly" as const,
      difficulty: 2,
      promptTemplateId: "6",
      language: "en" as const,
      timezone: "America/New_York",
      version: "1.0.0",
    },
    {
      id: "int-12",
      displayName: "James Martinez - Product-Minded Engineer",
      company: "Airbnb",
      role: "Staff Engineer",
      seniority: "staff" as const,
      typeCoverage: ["tech", "behavioral"] as ("tech" | "behavioral")[],
      topicIds: ["topic-sd-5", "topic-lead-5", "topic-beh-3"],
      style: "conversational" as const,
      difficulty: 3,
      promptTemplateId: "7",
      language: "en" as const,
      timezone: "America/San_Francisco",
      version: "1.0.0",
    },
  ]

  for (const interviewer of interviewerData) {
    await db
      .insert(interviewers)
      .values(interviewer)
      .onConflictDoNothing()
  }

  console.log("✅ Interview data seed completed!")
  console.log(`  - ${categoryData.length} categories created`)
  console.log(`  - ${topicData.length} topics created`)
  console.log(`  - ${interviewerData.length} interviewers created`)

  return {
    categories: categoryData.length,
    topics: topicData.length,
    interviewers: interviewerData.length,
  }
}

// Run the seed if this file is executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`
if (isMainModule) {
  seedInterviewData()
    .then(() => {
      console.log("✨ Seed completed successfully")
      process.exit(0)
    })
    .catch((error) => {
      console.error("❌ Seed failed:", error)
      process.exit(1)
    })
}