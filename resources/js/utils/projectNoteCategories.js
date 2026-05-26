export const PROJECT_NOTE_CATEGORIES = {
    weekly: {
        key: 'weekly',
        label: 'Note',
        description: 'Catatan umum project: update progress, meeting notes, atau hal penting lainnya.',
        isLink: false,
    },
    development: {
        key: 'development',
        label: 'Link Development',
        description: 'Repo, staging, API docs, atau environment development.',
        isLink: true,
    },
    document: {
        key: 'document',
        label: 'Link Dokumen',
        description: 'Dokumen requirement, desain, kontrak, atau file penting.',
        isLink: true,
    },
};

export const PROJECT_NOTE_CATEGORY_LIST = Object.values(PROJECT_NOTE_CATEGORIES);

/** UI label (weekly key is legacy; shown as "Note"). */
export function getProjectNoteCategoryLabel(categoryKey) {
    if (categoryKey === 'weekly') return 'Note';
    return PROJECT_NOTE_CATEGORIES[categoryKey]?.label ?? categoryKey;
}
