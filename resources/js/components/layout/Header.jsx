import { Menu, Search, Bell, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../hooks/useNotifications";

function formatNotificationTime(iso) {
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

export default function Header({ title = "Executive Overview", onMenuClick }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { notifications, unreadCount, loading, loadNotifications, markAsRead, markAllAsRead } =
        useNotifications(!!user);

    const handleNotificationClick = (notification) => {
        if (!notification.read_at) {
            markAsRead(notification.id);
        }
        const { project_id, task_id } = notification.data || {};
        if (project_id && task_id) {
            navigate(`/board/${project_id}/task/${task_id}`);
        }
    };

    return (
        <header className="sticky top-0 z-30 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-4 py-3 sm:px-6 lg:px-8 sm:py-4 flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 lg:hidden -ml-1"
                    onClick={onMenuClick}
                    aria-label="Open navigation menu"
                >
                    <Menu className="size-5" />
                </Button>
                <h2 className="truncate text-lg font-bold text-slate-900 dark:text-white sm:text-xl">{title}</h2>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-4">
                <div className="relative hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                    <Input type="text" placeholder="Search projects or logs..."
                        className="w-48 lg:w-64 pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg text-sm focus-visible:ring-primary focus-visible:border-primary text-slate-900 dark:text-white transition-colors duration-200" />
                </div>

                <DropdownMenu onOpenChange={(open) => open && loadNotifications()}>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon"
                            className="relative size-10 rounded-lg border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors duration-200"
                            aria-label="Notifikasi"
                        >
                            <Bell className="size-5" />
                            {unreadCount > 0 && (
                                <Badge
                                    variant="destructive"
                                    className="absolute -top-1 -right-1 size-4 min-w-4 px-1 py-0 justify-center text-[9px] leading-none rounded-full"
                                >
                                    {unreadCount > 9 ? "9+" : unreadCount}
                                </Badge>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[360px] p-0">
                        <div className="flex items-center justify-between px-3 py-2">
                            <DropdownMenuLabel className="p-0 text-sm">Notifikasi</DropdownMenuLabel>
                            {unreadCount > 0 && (
                                <button
                                    type="button"
                                    className="text-xs text-primary hover:underline"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        markAllAsRead();
                                    }}
                                >
                                    Tandai semua dibaca
                                </button>
                            )}
                        </div>
                        <DropdownMenuSeparator className="m-0" />
                        <div className="max-h-96 overflow-y-auto">
                            {loading ? (
                                <div className="flex items-center justify-center py-8 text-slate-500">
                                    <Loader2 className="size-5 animate-spin mr-2" />
                                    Memuat…
                                </div>
                            ) : notifications.length === 0 ? (
                                <p className="text-xs text-slate-500 italic px-3 py-6 text-center">
                                    Tidak ada notifikasi.
                                </p>
                            ) : (
                                <ul className="divide-y divide-slate-200/80 dark:divide-slate-700/80">
                                    {notifications.map((n) => {
                                        const data = n.data || {};
                                        const isUnread = !n.read_at;
                                        return (
                                            <li key={n.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleNotificationClick(n)}
                                                    className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                                                        isUnread ? "bg-primary/5" : ""
                                                    }`}
                                                >
                                                    <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                                        {(data.mentioned_by_name || "U").charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs text-slate-700 dark:text-slate-300">
                                                            <span className="font-semibold text-slate-900 dark:text-white">
                                                                {data.mentioned_by_name || "Seseorang"}
                                                            </span>{" "}
                                                            mention kamu di task{" "}
                                                            <span className="font-semibold">{data.task_title}</span>
                                                        </p>
                                                        {data.note_excerpt && (
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                                                {data.note_excerpt}
                                                            </p>
                                                        )}
                                                        <span className="text-[10px] text-slate-400">
                                                            {formatNotificationTime(n.created_at)}
                                                        </span>
                                                    </div>
                                                    {isUnread && (
                                                        <span className="size-2 rounded-full bg-primary shrink-0 mt-1.5" />
                                                    )}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
