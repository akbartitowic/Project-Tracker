export const PROJECT_NOTE_CATEGORIES = {
    weekly: {
        key: 'weekly',
        label: 'Note',
        description: 'General project notes: progress updates, meeting notes, or other important info.',
        isLink: false,
    },
    development: {
        key: 'development',
        label: 'Development Link',
        description: 'Repo, staging, API docs, or dev environment.',
        isLink: true,
    },
    document: {
        key: 'document',
        label: 'Document Link',
        description: 'Requirement docs, designs, contracts, or important files.',
        isLink: true,
    },
};

export const PROJECT_NOTE_CATEGORY_LIST = Object.values(PROJECT_NOTE_CATEGORIES);

/** UI label (weekly key is legacy; shown as "Note"). */
export function getProjectNoteCategoryLabel(categoryKey) {
    if (categoryKey === 'weekly') return 'Note';
    return PROJECT_NOTE_CATEGORIES[categoryKey]?.label ?? categoryKey;
}
