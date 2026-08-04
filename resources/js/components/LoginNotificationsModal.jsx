import { Bell, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "../context/AuthContext";
import { fetchAPI } from "../services/api";
import { describeNotification, formatNotificationTime } from "../utils/notificationDisplay";

// Shown once right after a successful login when the user has unread notifications waiting.
// Closing it does NOT mark anything as read — the bell badge stays exactly as it was.
export default function LoginNotificationsModal() {
    const { loginNotifications, dismissLoginNotifications } = useAuth();
    const navigate = useNavigate();

    const open = !!loginNotifications;
    const items = loginNotifications?.items ?? [];
    const total = loginNotifications?.total ?? items.length;
    const extraCount = total - items.length;

    const handleOpen = async (notification) => {
        try {
            await fetchAPI(`/notifications/${notification.id}/read`, { method: "POST" });
        } catch {
            // Silent — navigation still proceeds, bell count self-corrects on next poll.
        }
        dismissLoginNotifications();
        const { project_id, task_id } = notification.data || {};
        if (project_id && task_id) {
            navigate(`/board/${project_id}/task/${task_id}`);
        } else if (project_id) {
            navigate(`/board/${project_id}/dashboard`);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(next) => !next && dismissLoginNotifications()}>
            <DialogContent className="dark:border-white/10 dark:bg-[#151b28] sm:max-w-md">
                <DialogHeader>
                    <div className="mx-auto mb-1 flex size-11 items-center justify-center rounded-full bg-accent/10 text-accent">
                        <Bell className="size-5" />
                    </div>
                    <DialogTitle className="text-center">
                        Kamu punya {total} notifikasi belum dibaca
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        Berikut aktivitas terbaru yang belum kamu lihat.
                    </DialogDescription>
                </DialogHeader>

                <ul className="max-h-80 space-y-1.5 overflow-y-auto">
                    {items.map((n) => {
                        const data = n.data || {};
                        const { Icon, iconClass, title, subtitle } = describeNotification(data);
                        return (
                            <li key={n.id}>
                                <button
                                    type="button"
                                    onClick={() => handleOpen(n)}
                                    className="flex w-full items-start gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
                                >
                                    <div className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${iconClass}`}>
                                        <Icon className="size-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs text-slate-700 dark:text-slate-300">{title}</p>
                                        {subtitle && (
                                            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
                                        )}
                                        <span className="mt-1 block text-[10px] text-slate-400">{formatNotificationTime(n.created_at)}</span>
                                    </div>
                                    <ChevronRight className="mt-1 size-4 shrink-0 text-slate-400" />
                                </button>
                            </li>
                        );
                    })}
                </ul>

                {extraCount > 0 && (
                    <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                        +{extraCount} notifikasi lainnya — buka lonceng notifikasi untuk lihat semua.
                    </p>
                )}

                <DialogFooter className="sm:justify-center">
                    <Button type="button" variant="outline" onClick={dismissLoginNotifications} className="w-full sm:w-auto">
                        Tutup
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
