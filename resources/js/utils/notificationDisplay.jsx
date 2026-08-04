import { UserPlus, CalendarClock, AtSign, TrendingUp } from "lucide-react";

export function formatNotificationTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function describeNotification(data) {
    if (data.type === "task_assigned") {
        return {
            Icon: UserPlus,
            iconClass: "bg-primary/10 text-primary",
            title: (
                <>
                    Kamu di-assign ke task{" "}
                    <span className="font-semibold">{data.task_title}</span>
                </>
            ),
            subtitle: data.project_name || null,
        };
    }
    if (data.type === "task_due_reminder") {
        return {
            Icon: CalendarClock,
            iconClass: "bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
            title: (
                <>
                    Task <span className="font-semibold">{data.task_title}</span> sudah jatuh tempo
                </>
            ),
            subtitle: data.due_date ? `Due date: ${data.due_date}` : null,
        };
    }
    if (data.type === "mh_topup_threshold") {
        return {
            Icon: TrendingUp,
            iconClass: "bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
            title: (
                <>
                    MH top up role <span className="font-semibold">{data.role_name}</span> sudah mencapai{" "}
                    <span className="font-semibold">{data.threshold}%</span>
                </>
            ),
            subtitle: data.project_name || null,
        };
    }
    // task_mention (default)
    return {
        Icon: AtSign,
        iconClass: "bg-primary/10 text-primary",
        title: (
            <>
                <span className="font-semibold text-slate-900 dark:text-white">
                    {data.mentioned_by_name || "Seseorang"}
                </span>{" "}
                mention kamu di task <span className="font-semibold">{data.task_title}</span>
            </>
        ),
        subtitle: data.note_excerpt || null,
    };
}
