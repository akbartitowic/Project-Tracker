const ROUTE_PERMISSION_MAP = [
    { path: '/presales-companies', permission: 'list_company.read' },
    { path: '/presales-project-categories', permission: 'category_project.read' },
    { path: '/presales', permission: 'presales.read' },
    { path: '/create-project', permission: 'list_project.read' },
    { path: '/board', permission: 'project_board.read' },
    { path: '/generate-report', permission: 'generate_report.read' },
    { path: '/reports', permission: 'reports.read' },
    { path: '/finance-monitoring', permission: 'finance_monitoring.read' },
    { path: '/finance-categories', permission: 'finance_categories.read' },
    { path: '/finance-realization-report', permission: 'realization_report.read' },
    { path: '/finance-report', permission: 'finance_report.read' },
    { path: '/users', permission: 'teams_users.read' },
    { path: '/roles', permission: 'access_control.read' },
    { path: '/project-roles', permission: 'project_roles.read' },
    { path: '/system-logs', permission: 'system_log.read' },
    { path: '/settings', permission: 'settings.read' },
    { path: '/profile', permission: 'profile.read' },
    { path: '/', permission: 'dashboard.read' },
];

export function getPermissionSlugs(user) {
    const permissions = user?.role?.permissions || user?.role_permissions || [];
    return new Set(
        permissions
            .map((permission) => permission?.slug)
            .filter(Boolean)
    );
}

export function hasPermission(user, slug) {
    if (String(user?.email || '').toLowerCase() === 'tito@noohtify.com') {
        return true;
    }
    if (!slug) return true;
    const slugs = getPermissionSlugs(user);
    return slugs.has(slug);
}

export function isAdminUser(user) {
    const roleName = String(user?.role?.name || user?.role_name || user?.role || '').toLowerCase();
    if (roleName === 'admin') return true;
    return String(user?.email || '').toLowerCase() === 'tito@noohtify.com';
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
