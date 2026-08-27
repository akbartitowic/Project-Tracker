<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Support\PublicStorageUrl;
use App\Traits\LogActivity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class AnnouncementController extends Controller
{
    use LogActivity;

    private const TYPES = ['info', 'success', 'warning', 'danger'];
    private const ATTACHMENT_MIMES = 'pdf,doc,docx,xls,xlsx,ppt,pptx,png,jpg,jpeg,zip';
    private const ATTACHMENT_MAX_KB = 10240; // 10 MB

    private function serialize(Announcement $a): array
    {
        return [
            ...$a->toArray(),
            'attachment_url' => PublicStorageUrl::for($a->attachment_path),
        ];
    }

    public function index(Request $request)
    {
        $announcements = Announcement::query()
            ->orderBy('sort_order')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Announcement $a) => $this->serialize($a));

        return response()->json([
            'status' => 'success',
            'data' => $announcements,
        ]);
    }

    /** Public, unauthenticated — read by the login page. */
    public function active()
    {
        $announcements = Announcement::query()
            ->active()
            ->orderBy('sort_order')
            ->orderByDesc('created_at')
            ->get(['id', 'title', 'message', 'type', 'attachment_path', 'attachment_name'])
            ->map(fn (Announcement $a) => [
                'id' => $a->id,
                'title' => $a->title,
                'message' => $a->message,
                'type' => $a->type,
                'attachment_url' => PublicStorageUrl::for($a->attachment_path),
                'attachment_name' => $a->attachment_name,
            ]);

        return response()->json([
            'status' => 'success',
            'data' => $announcements,
        ]);
    }

    private function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'message' => 'required|string|max:2000',
            'type' => ['required', Rule::in(self::TYPES)],
            'is_active' => 'required|boolean',
            'expires_at' => 'nullable|date',
            'sort_order' => 'nullable|integer|min:0',
        ];
    }

    public function store(Request $request)
    {
        $validated = $request->validate($this->rules());
        $validated['sort_order'] = $validated['sort_order'] ?? 0;
        $validated['created_by'] = $request->user()->id;

        $announcement = Announcement::create($validated);
        $this->log('System', 'Created Announcement', "Title: {$announcement->title}");

        return response()->json([
            'status' => 'success',
            'message' => 'Announcement created successfully',
            'data' => $this->serialize($announcement),
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $announcement = Announcement::findOrFail($id);
        $validated = $request->validate($this->rules());
        $validated['sort_order'] = $validated['sort_order'] ?? 0;

        $announcement->update($validated);
        $this->log('System', 'Updated Announcement', "Title: {$announcement->title}");

        return response()->json([
            'status' => 'success',
            'message' => 'Announcement updated successfully',
            'data' => $this->serialize($announcement),
        ]);
    }

    public function destroy($id)
    {
        $announcement = Announcement::findOrFail($id);
        $title = $announcement->title;
        $this->deleteAttachmentFile($announcement->attachment_path);
        $announcement->delete();
        $this->log('System', 'Deleted Announcement', "Title: {$title}");

        return response()->json([
            'status' => 'success',
            'message' => 'Announcement deleted successfully',
        ]);
    }

    public function uploadAttachment(Request $request, $id)
    {
        $announcement = Announcement::findOrFail($id);

        $request->validate([
            'attachment' => 'required|file|max:' . self::ATTACHMENT_MAX_KB . '|mimes:' . self::ATTACHMENT_MIMES,
        ]);

        $this->deleteAttachmentFile($announcement->attachment_path);

        $file = $request->file('attachment');
        $announcement->attachment_path = $file->store('announcement-attachments', 'public');
        $announcement->attachment_name = $file->getClientOriginalName();
        $announcement->save();

        $this->log('System', 'Uploaded Announcement Attachment', "Title: {$announcement->title}, File: {$announcement->attachment_name}");

        return response()->json([
            'status' => 'success',
            'message' => 'Attachment uploaded successfully',
            'data' => $this->serialize($announcement),
        ]);
    }

    public function removeAttachment($id)
    {
        $announcement = Announcement::findOrFail($id);

        $this->deleteAttachmentFile($announcement->attachment_path);
        $announcement->attachment_path = null;
        $announcement->attachment_name = null;
        $announcement->save();

        $this->log('System', 'Removed Announcement Attachment', "Title: {$announcement->title}");

        return response()->json([
            'status' => 'success',
            'message' => 'Attachment removed',
            'data' => $this->serialize($announcement),
        ]);
    }

    private function deleteAttachmentFile(?string $path): void
    {
        if ($path && Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
    }
}
