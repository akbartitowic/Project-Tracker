import { useAuth } from '../context/AuthContext';

/**
 * Returns the Organization object that matches the current subdomain,
 * or null if not on a tenant subdomain.
 */
export function useCurrentOrg() {
    const { organizations, getCurrentTenantSlug } = useAuth();
    const slug = getCurrentTenantSlug();
    if (!slug) return null;
    return organizations.find((o) => o.slug === slug) ?? null;
}
