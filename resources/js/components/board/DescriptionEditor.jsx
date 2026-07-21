import { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageExtension from '@tiptap/extension-image';
import PlaceholderExtension from '@tiptap/extension-placeholder';
import { Loader2 } from 'lucide-react';
import { getApiUrl } from '../../services/api';
import { cn } from '@/lib/utils';

async function uploadDescriptionImage(file, projectId) {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('project_id', projectId);

    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${getApiUrl()}/tasks/description-images`, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
            // Browser sets correct boundary for FormData, do NOT set Content-Type
        },
        body: formData,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || data.error || 'Gagal mengunggah gambar.');
    }
    return data.url;
}

function insertImagesFromFiles(view, files, projectId, setUploading) {
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) return false;

    setUploading(true);
    (async () => {
        for (const file of imageFiles) {
            try {
                const url = await uploadDescriptionImage(file, projectId);
                if (!url) continue;
                const { state } = view;
                const node = state.schema.nodes.image.create({ src: url });
                view.dispatch(state.tr.replaceSelectionWith(node).scrollIntoView());
            } catch (err) {
                console.error('Upload gambar deskripsi gagal', err);
                alert(err.message || 'Gagal mengunggah gambar.');
            }
        }
        setUploading(false);
    })();

    return true;
}

export default function DescriptionEditor({
    value,
    onChange,
    projectId,
    placeholder = 'Enter detailed description...',
    className,
    disabled = false,
}) {
    const [uploading, setUploading] = useState(false);

    const editor = useEditor({
        extensions: [
            StarterKit,
            ImageExtension.configure({ HTMLAttributes: { class: 'rounded-md max-w-full my-1' } }),
            PlaceholderExtension.configure({ placeholder }),
        ],
        content: value || '',
        editable: !disabled,
        onUpdate: ({ editor: e }) => {
            const html = e.getHTML();
            onChange(html === '<p></p>' ? '' : html);
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[72px] px-3 py-2 text-sm text-slate-700 dark:text-slate-200',
            },
            handlePaste(view, event) {
                const files = Array.from(event.clipboardData?.files || []);
                if (files.length === 0) return false;
                const handled = insertImagesFromFiles(view, files, projectId, setUploading);
                if (handled) event.preventDefault();
                return handled;
            },
            handleDrop(view, event) {
                const files = Array.from(event.dataTransfer?.files || []);
                if (files.length === 0) return false;
                const handled = insertImagesFromFiles(view, files, projectId, setUploading);
                if (handled) event.preventDefault();
                return handled;
            },
        },
    }, [projectId]);

    useEffect(() => {
        if (!editor) return;
        const current = editor.getHTML();
        if (value !== undefined && value !== current) {
            editor.commands.setContent(value || '', false);
        }
    }, [value, editor]);

    useEffect(() => {
        editor?.setEditable(!disabled);
    }, [disabled, editor]);

    if (!editor) return null;

    return (
        <div
            className={cn(
                'relative rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50 transition-all',
                className,
            )}
        >
            <EditorContent editor={editor} />
            {uploading && (
                <div className="absolute right-2 top-2 flex items-center gap-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px] text-slate-500 shadow dark:bg-slate-800/90 dark:text-slate-300">
                    <Loader2 className="size-3 animate-spin" /> Mengunggah gambar...
                </div>
            )}
        </div>
    );
}
