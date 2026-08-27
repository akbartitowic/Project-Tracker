const ROUTE_PERMISSION_MAP = [
    { path: '/presales-companies', permission: 'list_company.read' },
    { path: '/presales-project-categories', permission: 'category_project.read' },
    { path: '/sales-category-projects', permission: 'sales_category_project.read' },
    { path: '/presales', permission: 'presales.read' },
    { path: '/create-project', permission: 'list_project.read' },
    { path: '/board', permission: 'project_board.read' },
    { path: '/team-load', permission: 'load.read' },
    { path: '/generate-report', permission: 'generate_report.read' },
    { path: '/reports', permission: 'reports.read' },
    { path: '/finance-monitoring', permission: 'finance_monitoring.read' },
    { path: '/finance-categories', permission: 'finance_categories.read' },
    { path: '/finance-realization-report', permission: 'realization_report.read' },
    { path: '/finance-report', permission: 'finance_report.read' },
    { path: '/users', permission: 'teams_users.read' },
    { path: '/roles', permission: 'access_control.read' },
    { path: '/modules', permission: 'modules_management.read' },
    { path: '/project-roles', permission: 'project_roles.read' },
    { path: '/system-logs', permission: 'system_log.read' },
    { path: '/integrasi/projects', permission: 'integrasi.read' },
    { path: '/settings', permission: 'settings.read' },
    { path: '/announcements', permission: 'announcements.read' },
    { path: '/profile', permission: 'profile.read' },
    { path: '/notification-center', permission: 'notification_center.read' },
    { path: '/', permission: 'dashboard.read' },
];

export function getPermissionSlugs(user) {
    const permissions = user?.role?.permissions || user?.role_permissions || [];
    return new Set(
        permissions
            // Permissions whose module has been deactivated (Modules screen)
            // are treated as not granted, even if still assigned to the role.
            .filter((permission) => permission?.module_is_active !== false)
            .map((permission) => permission?.slug)
            .filter(Boolean)
    );
}

/**
 * Sort weight for a sidebar item gated by `slug`, driven by its module's
 * `sort_order` (edited from the Modules admin screen) rather than a fixed
 * position in the JSX. Items with no matching permission (e.g. a superuser
 * account, which has no role_permissions entries) sort last.
 */
export function getModuleSortOrder(user, slug) {
    const permissions = user?.role?.permissions || user?.role_permissions || [];
    const moduleSlug = String(slug || '').split('.')[0];
    const match = permissions.find(
        (permission) => String(permission?.slug || '').split('.')[0] === moduleSlug
    );
    return match?.module_sort_order ?? Number.MAX_SAFE_INTEGER;
}

export function hasPermission(user, slug) {
    if (user?.is_superuser) {
        return true;
    }
    if (!slug) return true;
    const slugs = getPermissionSlugs(user);
    return slugs.has(slug);
}

export function isFreelanceUser(user) {
    return String(user?.role?.name || user?.role || '').trim().toLowerCase() === 'freelance';
}

export function isAdminUser(user) {
    const roleName = String(user?.role?.name || user?.role_name || user?.role || '').toLowerCase();
    if (roleName === 'admin') return true;
    return Boolean(user?.is_superuser);
}

export function getDefaultLandingPath(user) {
    if (isAdminUser(user) || hasPermission(user, 'dashboard.read')) {
        return '/';
    }
    if (hasPermission(user, 'list_project.read')) {
        return '/create-project';
    }
    if (hasPermission(user, 'project_board.read')) {
        return '/board';
    }
    return '/';
}

export function getRequiredPermissionForPath(pathname) {
    if (pathname === '/sales/pitch/new' || pathname.startsWith('/sales/pitch/new/')) {
        return 'sales.create';
    }
    if (pathname.startsWith('/sales/pitch/')) {
        return 'sales.read';
    }
    if (pathname === '/sales') {
        return 'sales.read';
    }
    const match = ROUTE_PERMISSION_MAP.find((item) =>
        pathname === item.path || pathname.startsWith(`${item.path}/`)
    );
    return match?.permission || null;
}
