import { useState, useEffect } from 'react';
import { fetchAPI } from '../services/api';
import { ClipboardList, Clock, User, Info, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SystemLogs() {
    const [logs, setLogs] = useState([]);
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0
    });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const loadLogs = async (page = 1) => {
        setLoading(true);
        try {
            const response = await fetchAPI(`/activity-logs?page=${page}`);
            // Laravel pagination returns the object directly, where 'data' contains the items array
            setLogs(response.data || []);
            setPagination({
                current_page: response.current_page || 1,
                last_page: response.last_page || 1,
                total: response.total || 0
            });
        } catch (err) {
            console.error("Failed to load logs", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLogs();
    }, []);

    const handleCleanup = async () => {
        if (!confirm("Are you sure you want to manually trigger log cleanup? This will remove logs older than 3 days.")) return;
        
        try {
            await fetchAPI('/activity-logs/cleanup', { method: 'POST' });
            loadLogs(1);
        } catch (err) {
            console.error("Cleanup failed", err);
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'Presales': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
            case 'Project': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
            case 'User': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
            case 'Auth': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
            default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
        }
    };

    const filteredLogs = logs.filter(log => 
        log.activity.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.description && log.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.user?.name && log.user.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="p-8 space-y-8 animate-fade">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <ClipboardList className="text-primary size-7" /> System Activity Log
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Tracking all platform actions. Logs are cleared every 3 days.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <Input 
                            placeholder="Search activities..." 
                            className="pl-9 w-64 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" className="gap-2 border-rose-200 text-rose-600 hover:bg-rose-50" onClick={handleCleanup}>
                        <Trash2 className="size-4" /> Cleanup Now
                    </Button>
                </div>
            </div>

            <Card className="border-none shadow-sm overflow-hidden bg-white dark:bg-slate-950">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                                    <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-wider">Time</th>
                                    <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-wider">User</th>
                                    <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-wider">Type</th>
                                    <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-wider">Activity</th>
                                    <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-wider">Description</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="size-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                                <span className="text-sm text-slate-400 animate-pulse">Fetching logs...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-20 text-center text-slate-400 italic">No activity logs found.</td>
                                    </tr>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">
                                                        {new Date(log.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                        <User className="size-4 text-slate-500" />
                                                    </div>
                                                    <span className="text-sm font-medium text-slate-900 dark:text-white">{log.user?.name || 'System'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Badge variant="secondary" className={getTypeColor(log.type)}>
                                                    {log.type}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{log.activity}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1 italic group-hover:line-clamp-none transition-all">
                                                    {log.description || '-'}
                                                </p>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-between items-center">
                <p className="text-sm text-slate-500 font-medium italic">
                    Showing <span className="text-slate-900 dark:text-white not-italic font-bold">{filteredLogs.length}</span> results 
                    <span className="mx-2 text-slate-300">|</span> 
                    Total <span className="text-slate-900 dark:text-white not-italic font-bold">{pagination.total}</span> logs
                </p>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => loadLogs(pagination.current_page - 1)}
                        disabled={pagination.current_page === 1}
                        className="h-8 w-8 p-0"
                    >
                        <ChevronLeft className="size-4" />
                    </Button>
                    <span className="text-xs font-bold px-3">
                        Page {pagination.current_page} of {pagination.last_page}
                    </span>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => loadLogs(pagination.current_page + 1)}
                        disabled={pagination.current_page === pagination.last_page}
                        className="h-8 w-8 p-0"
                    >
                        <ChevronRight className="size-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
