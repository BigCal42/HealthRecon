export const UICopy = {
  appName: "HealthRecon",

  nav: {
    heroDemo: "Hero Demo",
    focus: "Today's Focus",
    worklist: "Worklist",
    globalInsights: "Global Insights",
  },

  systemSections: {
    overview: "Account Overview",
    signals: "Signals & Changes",
    documents: "Documents & Sources",
    timeline: "Account Story Timeline",
    deals: "Deal Board",
    insights: "Account Insights",
  },

  demoSections: {
    headerTitle: "HealthRecon Hero Demo",
    pipelineTitle: "1. Refresh the Intelligence",
    pipelineDescription:
      "This runs the ingestion and analysis pipeline for this account.",
    briefingTitle: "2. Latest Sales Briefing",
    focusTitle: "3. Today's Focus for This Account",
    timelineTitle: "4. Recent Account Story",
    chatTitle: "5. Ask a Question About This Account",
  },

  focus: {
    pageTitle: "Today's Focus",
    emptyState:
      "No prioritized items for today. Review your systems and opportunities.",
  },

  worklist: {
    pageTitle: "Worklist",
    emptyState: "No open work items.",
  },

  deals: {
    pageTitlePrefix: "Deal Board – ",
  },

  insights: {
    systemTitlePrefix: "Account Insights – ",
    globalTitle: "Global Insights",
  },
} as const;

export const ITEM_TYPE_LABELS: Record<string, string> = {
  signal: "Signal",
  interaction: "Interaction",
  work_item: "Work Item",
  opportunity: "Opportunity",
  signal_action: "Signal Action",
};

