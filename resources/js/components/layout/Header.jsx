import { Menu, Search, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Header({ title = "Executive Overview", onMenuClick }) {
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
                <Button variant="outline" size="icon" className="size-10 rounded-lg border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors duration-200">
                    <Bell className="size-5" />
                </Button>
            </div>
        </header>
    );
}
