import { useEffect, useRef, useState } from 'react';
import { getApiUrl } from '../../services/api';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AvatarUpload({ avatarUrl, name, disabled, onUpdated, onError }) {
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState(avatarUrl || null);

    useEffect(() => {
        setPreview(avatarUrl || null);
    }, [avatarUrl]);

    useEffect(() => {
        return () => {
            if (preview && preview.startsWith('blob:')) {
                URL.revokeObjectURL(preview);
            }
        };
    }, [preview]);

    const uploadAvatar = async (file) => {
        const token = localStorage.getItem('auth_token');
        const formData = new FormData();
        formData.append('avatar', file);

        setUploading(true);
        try {
            const response = await fetch(`${getApiUrl()}/profile/avatar`, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: formData,
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.message || 'Gagal mengunggah foto profil');
            }
            if (preview && preview.startsWith('blob:')) {
                URL.revokeObjectURL(preview);
            }
            setPreview(data.user?.avatar_url || null);
            onUpdated?.(data.user);
        } catch (e) {
            setPreview(avatarUrl || null);
            onError?.(e.message);
        } finally {
            setUploading(false);
        }
    };

    const removeAvatar = async () => {
        const token = localStorage.getItem('auth_token');
        setUploading(true);
        try {
            const response = await fetch(`${getApiUrl()}/profile/avatar`, {
                method: 'DELETE',
                headers: {
                    Accept: 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.message || 'Gagal menghapus foto profil');
            }
            if (preview && preview.startsWith('blob:')) {
                URL.revokeObjectURL(preview);
            }
            setPreview(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            onUpdated?.(data.user);
        } catch (e) {
            onError?.(e.message);
        } finally {
            setUploading(false);
        }
    };

    const onFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            onError?.('Pilih file gambar (PNG, JPG, dll.).');
            return;
        }
        if (file.size > 4 * 1024 * 1024) {
            onError?.('Ukuran foto maksimal 4 MB.');
            return;
        }
        if (preview && preview.startsWith('blob:')) {
            URL.revokeObjectURL(preview);
        }
        setPreview(URL.createObjectURL(file));
        uploadAvatar(file);
    };

    return (
        <div className="flex flex-col items-center">
            <button
                type="button"
                onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
                disabled={disabled || uploading}
                title="Ganti foto profil"
                className={cn(
                    'group relative size-24 rounded-full mx-auto mb-4 shadow-xl overflow-hidden',
                    'flex items-center justify-center',
                    preview
                        ? 'border-2 border-primary/30'
                        : 'bg-primary/20 border-2 border-primary/30',
                    !disabled && 'cursor-pointer',
                )}
            >
                {preview ? (
                    <img src={preview} alt={name || 'Foto profil'} className="size-full object-cover" />
                ) : (
                    <span className="text-4xl font-black text-primary uppercase">{name?.charAt(0)}</span>
                )}

                {!disabled && (
                    <div className={cn(
                        'absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity',
                        uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                    )}>
                        {uploading ? (
                            <Loader2 className="size-6 text-white animate-spin" />
                        ) : (
                            <Camera className="size-6 text-white" />
                        )}
                    </div>
                )}
            </button>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={disabled || uploading}
                onChange={onFileChange}
            />

            {!disabled && preview && (
                <button
                    type="button"
                    onClick={removeAvatar}
                    disabled={uploading}
                    className="flex items-center gap-1 text-[11px] text-rose-500 hover:text-rose-600 font-medium -mt-1 mb-2"
                >
                    <Trash2 className="size-3" /> Hapus foto
                </button>
            )}
        </div>
    );
}
