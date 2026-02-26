import { Search, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Header({ title = "Executive Overview" }) {
    return (
        <header className="sticky top-0 z-10 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-8 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
            <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
            </div>
            <div className="flex items-center gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                    <Input type="text" placeholder="Search projects or logs..."
                        className="pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg text-sm w-64 focus-visible:ring-primary focus-visible:border-primary text-slate-900 dark:text-white transition-colors duration-200" />
                </div>
                <Button variant="outline" size="icon" className="size-10 rounded-lg border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors duration-200">
                    <Bell className="size-5" />
                </Button>
            </div>
        </header>
    );
}
