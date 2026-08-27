import { useEffect, useState } from 'react';
import { Bell, UserPlus, CalendarClock, AtSign, TrendingUp, ShieldAlert } from 'lucide-react';
import { fetchAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

const NOTIFICATION_TYPES = [
    {
        key: 'task_assigned',
        Icon: UserPlus,
        title: 'Task assigned',
        description: "Email me when I'm assigned to a task.",
    },
    {
        key: 'task_due_reminder',
        Icon: CalendarClock,
        title: 'Task due reminder',
        description: "Daily reminder email while a task I'm assigned to is due and not yet Done/Hold.",
    },
    {
        key: 'task_mention',
        Icon: AtSign,
        title: 'Task mentions',
        description: 'Email me when someone @mentions me in a task note.',
    },
    {
        key: 'mh_topup_threshold',
        Icon: TrendingUp,
        title: 'Manhour top-up threshold',
        description: 'Email me when an Agile project top-up reaches 50/70/90% usage (Project Manager/Director only).',
    },
    {
        key: 'login_alert',
        Icon: ShieldAlert,
        title: 'Login alerts',
        description: 'Email me a security alert (device, location, IP) every time my account logs in.',
    },
];

export default function NotificationCenter() {
    const [preferences, setPreferences] = useState(null);
    const [loading, setLoading] = useState(true);
    const [savingKey, setSavingKey] = useState(null);

    useEffect(() => {
        let cancelled = false;
        fetchAPI('/notification-preferences')
            .then((res) => {
                if (!cancelled) setPreferences(res.preferences);
            })
            .catch((err) => {
                if (!cancelled) alert(err.message || 'Failed to load notification preferences');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, []);

    const handleToggle = async (key, checked) => {
        const previous = preferences;
        const next = { ...preferences, [key]: checked };
        setPreferences(next);
        setSavingKey(key);
        try {
            const res = await fetchAPI('/notification-preferences', {
                method: 'PUT',
                body: JSON.stringify(next),
            });
            setPreferences(res.preferences);
        } catch (err) {
            setPreferences(previous);
            alert(err.message || 'Failed to update notification preference');
        } finally {
            setSavingKey(null);
        }
    };

    return (
        <div className="relative min-h-full overflow-hidden bg-slate-50 transition-colors duration-200 dark:bg-[#000040]">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-50/70 via-white to-slate-50 dark:from-[#000040] dark:via-[#0a0e2e] dark:to-background-dark" />
            <div className="pointer-events-none absolute -top-24 -left-24 size-[28rem] rounded-full bg-accent/10 blur-[120px] dark:bg-accent/15" />
            <div className="pointer-events-none absolute -bottom-32 -right-24 size-[32rem] rounded-full bg-primary/10 blur-[130px] dark:bg-accent/10" />

            <div className="relative z-10 w-full max-w-3xl space-y-8 px-4 py-5 sm:px-6 lg:px-8 pb-16">
                <header>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                        <Bell className="size-8 text-primary" />
                        Notification Center
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">
                        Choose which emails you want to receive. In-app notifications (the bell icon) are always recorded regardless of these settings.
                    </p>
                </header>

                <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-lg">Email Notifications</CardTitle>
                        <CardDescription>Turn each notification type on or off individually.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {loading && (
                            <p className="text-sm text-slate-500 dark:text-slate-400">Loading preferences…</p>
                        )}
                        {!loading && preferences && NOTIFICATION_TYPES.map(({ key, Icon, title, description }) => (
                            <div
                                key={key}
                                className="flex items-start gap-3 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700"
                            >
                                <Icon className="size-5 mt-0.5 shrink-0 text-primary" />
                                <div className="flex-1 space-y-0.5">
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                        {title}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {description}
                                    </p>
                                </div>
                                <Switch
                                    checked={preferences[key] === true}
                                    disabled={savingKey === key}
                                    onCheckedChange={(checked) => handleToggle(key, checked === true)}
                                />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
