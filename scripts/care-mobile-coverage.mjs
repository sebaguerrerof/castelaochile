// Representative routes from each existing fixture suite; no new accounts or grants.
export const mobileCoverage = {
  'reports-staff': ['configuration', 'reports'],
  'reports-patient': ['list', 'editor'],
  'metrics-direction': ['collective', 'individual', 'sources', 'evolution'],
  'dashboard-direction': ['dashboard', 'alerts'],
  'recovery-family-staff': null,
  'recovery-family-patient': null,
  'planning-staff': ['planning', 'new-event', 'event'],
  'planning-patient': ['today', 'week', 'commitments'],
  technical: ['capabilities'],
  'records-psychology': ['editor'],
  'records-recovery': ['editor'],
  'records-psychiatry': ['editor'],
  'records-direction': ['requests'],
  'records-patient': ['summaries'],
  'decisions-direction': ['new', 'decision', 'supervision'],
  'decisions-staff': ['work', 'task'],
  'informs-direction': ['index', 'reviewed'],
  'informs-professional': ['own-report'],
  'jobs-configured': ['configured'],
  'jobs-failed': ['failed'],
  'jobs-team': ['failed-team'],
  'jobs-comparison': ['comparison'],
  'recovery-commitments': ['commitments'],
  'recovery-weekly': ['weekly'],
  'recovery-governance': ['governance'],
  'recovery-group':['group-event','group-individual'],
  'recovery-monthly':['monthly'],
  'recovery-communication':['communication'],
  'recovery-rules':['rule','reiteration'],
  'recovery-supervision': ['supervision','matrix'],
};

export const coreMobileGroups = Object.keys(mobileCoverage).slice(0, 6);
export const extendedMobileGroups = Object.keys(mobileCoverage).slice(6).filter(group => !group.startsWith('recovery-') || group.startsWith('recovery-family'));
export const recoveryMobileGroups = ['recovery-commitments','recovery-weekly','recovery-governance','recovery-supervision','recovery-monthly','recovery-communication','recovery-rules','recovery-group'];
export const coreMobileSuites = ['qa-care-recovery-family-e2e.mjs', 'qa-care-reports-e2e.mjs', 'qa-care-dashboard-e2e.mjs'];
export const extendedMobileSuites = ['qa-care-e2e.mjs', 'qa-care-records-e2e.mjs', 'qa-care-decisions-e2e.mjs', 'qa-care-informs-e2e.mjs', 'qa-care-jobs-e2e.mjs'];
