import { useAppBranding } from '../context/AppBrandingContext';
import { cn } from '@/lib/utils';

export default function AppLogo({ className, alt = 'Application logo' }) {
    const { logo_url: logoUrl } = useAppBranding();

    return (
        <img
            src={logoUrl}
            alt={alt}
            className={cn('object-contain', className)}
        />
    );
}
