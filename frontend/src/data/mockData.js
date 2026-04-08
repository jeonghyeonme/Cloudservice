// src/data/mockData.js

export const MOCK_ROOMS = [
  {
    id: '1',
    name: 'AWS SAA STUDY',
    description: 'Prepping for the Solutions Architect exam. Focused on practice tests and key services.',
    status: 'ACTIVE',
    currentMembers: 8,
    maxMembers: null,
    isPrivate: false,
    emoji: '⌨️',
    channels: [
      { 
        id: 'aws-general', 
        label: 'general-chat', 
        topic: 'Main hub for collective cognition',
        messages: [
          { id: 1, author: 'Aiden', avatar: 'A', text: "Has anyone finished the summary for Chapter 8? I'm struggling with the conceptual links between neural networks and biological synapses for the midterm.", type: 'text' },
          { id: 2, author: 'Sarah M.', avatar: 'S', text: "I've just finished the study guide PDF. Here it is!", type: 'file', fileName: 'Bio_Neural_Networks_Ch8.pdf', fileMeta: '1.2 MB · PDF DOCUMENT' },
          { id: 3, author: 'SAGE AI', avatar: 'AI', type: 'ai-summary', title: 'File Summary', points: ['Neural Network basics: Foundational architecture', 'Synaptic density: Correlation with learning rate', 'Hebbian theory: Breakdown of connection patterns'] },
          { id: 4, author: 'StudyMaster_24', avatar: 'SM', text: 'Thanks for the summary, SAGE! This really helps with the exam prep.', type: 'text' }
        ]
      },
      { 
        id: 'aws-resources', 
        label: 'shared-resources', 
        topic: 'Share files, links, and resources',
        messages: [
          { id: 1, author: 'AlexChen', avatar: 'AC', type: 'file', fileName: 'Algorithms_Cheat_Sheet_v2.pdf', fileMeta: '1.4 MB · PDF DOCUMENT' },
          { id: 2, author: 'SAGE AI', avatar: 'AI', type: 'ai-summary', title: 'File Summary', points: ['Time Complexity: Big O for sorting algorithms', 'Graph Theory: BFS vs DFS patterns'] },
          { id: 3, author: 'Sarah_Labs', avatar: 'SL', type: 'link', linkName: 'MIT 6.006 Lecture Notes - Fall 2023', linkUrl: 'ocw.mit.edu/courses/electrical-engineering...' },
          { id: 4, author: 'SAGE AI', avatar: 'AI', type: 'ai-summary', title: 'Link Summary', points: ['External notes covering dynamic programming', 'Recommended for week 8 exam prep'] }
        ]
      },
    ]
  },
  {
    id: '2',
    name: 'ALGORITHM PRACTICE',
    description: 'LeetCode medium/hard grinds. No voice, just music and focus...',
    status: 'ACTIVE',
    currentMembers: 4,
    maxMembers: 10,
    isPrivate: false,
    emoji: '🔷',
    channels: [
      { 
        id: 'daily-problem', 
        label: 'daily-problem', 
        topic: "Today's LeetCode challenge",
        messages: [
          { id: 1, author: 'AlexChen', avatar: 'AC', text: 'Today\'s problem is "Trapping Rain Water". It\'s a tough one!', type: 'text' },
          { id: 2, author: 'SAGE AI', avatar: 'AI', type: 'ai-summary', title: 'Hint', points: ['Try using Two Pointers', 'Think about the height of bars on both sides'] },
          { id: 3, author: 'Aiden', avatar: 'A', text: 'I managed to solve it with O(n) space, but O(1) space is tricky.', type: 'text' }
        ]
      },
      { 
        id: 'solution-share', 
        label: 'solution-sharing', 
        topic: 'Post your code snippets and explanations',
        messages: [
          { id: 1, author: 'AlexChen', avatar: 'AC', type: 'link', linkName: 'Clean Java Solution - Two Pointers', linkUrl: 'leetcode.com/discuss/...' },
          { id: 2, author: 'SAGE AI', avatar: 'AI', type: 'ai-summary', title: 'Link Summary', points: ['Optimal solution explanation', 'Comparison of space/time trade-offs'] },
          { id: 3, author: 'StudyMaster_24', avatar: 'SM', type: 'file', fileName: 'Dynamic_Programming_Cheatsheet.pdf', fileMeta: '800 KB · PDF' },
          { id: 4, author: 'SAGE AI', avatar: 'AI', type: 'ai-summary', title: 'File Summary', points: ['Tabulation vs Memoization patterns', 'Common DP problems: Knapsack, LCS, LIS'] }
        ]
      },
    ]
  },
  {
    id: '3',
    name: 'UI UX CRITIQUE',
    description: 'Design system workshop and portfolio review. Sharing Figma files and feedback.',
    status: 'ACTIVE',
    currentMembers: 12,
    maxMembers: 12, // 꽉 찬 상태로 설정
    isPrivate: true,
    emoji: '🖥️',
    channels: [
      { 
        id: 'critique-feed', 
        label: 'critique-feed', 
        topic: 'Submit your designs for community feedback',
        messages: [
          { id: 1, author: 'Sarah M.', avatar: 'S', text: 'Working on a dark mode dashboard. Any thoughts on the contrast?', type: 'text' },
          { id: 2, author: 'DesignGuru', avatar: 'DG', text: 'Looks clean! Maybe increase the font weight for headings.', type: 'text' }
        ]
      },
      { 
        id: 'design-resources', 
        label: 'design-resources', 
        topic: 'Figma plugins, UI kits, and inspiration',
        messages: [
          { id: 1, author: 'Sarah M.', avatar: 'S', type: 'link', linkName: 'Apple VisionOS Design Kit', linkUrl: 'figma.com/community/...' },
          { id: 2, author: 'SAGE AI', avatar: 'AI', type: 'ai-summary', title: 'Link Overview', points: ['Official spatial UI components', 'Window management guidelines'] },
          { id: 3, author: 'DesignGuru', avatar: 'DG', type: 'file', fileName: 'Typography_Scale_Guide.fig', fileMeta: '4.5 MB · FIGMA FILE' },
          { id: 4, author: 'SAGE AI', avatar: 'AI', type: 'ai-summary', title: 'File Summary', points: ['Standard font scale for multi-device support', 'Baseline grid alignment tips'] }
        ]
      },
    ]
  },
  {
    id: '4',
    name: 'QUANTUM MECHANICS',
    description: "Finals prep for Physics 301. Solving Schrödinger's equation and quantum states.",
    status: 'ACTIVE',
    currentMembers: 5,
    maxMembers: 8,
    isPrivate: false,
    emoji: '📐',
    channels: [
      { id: 'lectures', label: 'lecture-notes', topic: 'Summaries and key concepts', messages: [] },
      { id: 'homework', label: 'homework-help', topic: 'Working through problem sets', messages: [] },
    ]
  },
  {
    id: '5',
    name: 'REACT & NEXT.JS',
    description: 'Building production-grade apps. Troubleshooting server components and deployment.',
    status: 'ACTIVE',
    currentMembers: 18,
    maxMembers: 25,
    isPrivate: false,
    emoji: '💻',
    channels: [
      { 
        id: 'nextjs-14', 
        label: 'nextjs-14-chat', 
        topic: 'App router and Server Components',
        messages: [
          { id: 1, author: 'DevUser', avatar: 'D', text: 'Server components are amazing but confusing at first.', type: 'text' },
          { id: 2, author: 'NextExpert', avatar: 'NE', type: 'link', linkName: 'Next.js 14 Official Docs', linkUrl: 'nextjs.org/docs' },
          { id: 3, author: 'SAGE AI', avatar: 'AI', type: 'ai-summary', title: 'Link Overview', points: ['Difference between Client/Server components', 'Caching and Data Fetching patterns'] }
        ]
      }
    ]
  }
];
