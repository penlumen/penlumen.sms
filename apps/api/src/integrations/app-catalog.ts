/**
 * The separate Penlumen apps a school can connect. Each is its own project
 * and repository; this system is the hub they sign in through and read
 * school data from (see docs/integrations.md).
 */
export const APP_CATALOG = [
  {
    key: 'ams',
    name: 'Assessment',
    full_name: 'Assessment Management System',
    description:
      'Assessment and examination management, marked and fed into report cards.',
    icon: 'clipboard-check',
  },
  {
    key: 'lms',
    name: 'Learning',
    full_name: 'Learning Management System',
    description: 'Lessons, assignments and course materials for each class.',
    icon: 'book-open',
  },
  {
    key: 'vls',
    name: 'Lab',
    full_name: 'Virtual Lab System',
    description: 'Hands-on science and computing experiments in the browser.',
    icon: 'flask-conical',
  },
] as const;

export type AppKey = (typeof APP_CATALOG)[number]['key'];
