import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

/**
 * Password field with show/hide toggle (eye icon).
 * Forward-compatible with Input props; outer wrapper is `relative w-full`.
 */
function PasswordInput({ className, toggleButtonClassName, ...props }) {
    const [visible, setVisible] = React.useState(false);

    return (
        <div className="relative w-full">
            <Input
                type={visible ? "text" : "password"}
                className={cn("pr-10", className)}
                {...props}
            />
            <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                className={cn(
                    "absolute right-1 top-1/2 z-10 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background dark:hover:bg-white/10",
                    toggleButtonClassName
                )}
                aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
                aria-pressed={visible}
                tabIndex={-1}
            >
                {visible ? (
                    <EyeOff className="size-4 shrink-0" aria-hidden />
                ) : (
                    <Eye className="size-4 shrink-0" aria-hidden />
                )}
            </button>
        </div>
    );
}

export { PasswordInput };
