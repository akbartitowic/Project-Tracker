<?php

namespace App\Http\Controllers;

use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CompanyController extends Controller
{
    public function index()
    {
        return response()->json([
            'data' => Company::orderBy('name')->get()->map(fn (Company $c) => $this->serializeCompany($c)),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:companies,name',
            'logo' => 'nullable|image|max:2048',
        ]);

        $company = Company::create([
            'name' => $validated['name'],
            'logo_path' => $this->storeLogo($request),
        ]);

        return response()->json(['id' => $company->id, 'data' => $this->serializeCompany($company->fresh())]);
    }

    public function update(Request $request, Company $company)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:companies,name,' . $company->id,
            'logo' => 'nullable|image|max:2048',
            'remove_logo' => 'nullable|boolean',
        ]);

        $logoPath = $company->logo_path;

        if ($request->boolean('remove_logo')) {
            $this->deleteLogoFile($logoPath);
            $logoPath = null;
        } elseif ($request->hasFile('logo')) {
            $logoPath = $this->storeLogo($request, $company);
        }

        $company->update([
            'name' => $validated['name'],
            'logo_path' => $logoPath,
        ]);

        return response()->json([
            'changes' => 1,
            'data' => $this->serializeCompany($company->fresh()),
        ]);
    }

    public function destroy(Company $company)
    {
        $this->deleteLogoFile($company->logo_path);
        $deleted = $company->delete();

        return response()->json(['deleted' => $deleted ? 1 : 0]);
    }

    private function serializeCompany(Company $company): array
    {
        return [
            'id' => $company->id,
            'name' => $company->name,
            'logo_path' => $company->logo_path,
            'logo_url' => $company->logo_url,
            'created_at' => $company->created_at,
            'updated_at' => $company->updated_at,
        ];
    }

    private function storeLogo(Request $request, ?Company $existing = null): ?string
    {
        if (!$request->hasFile('logo')) {
            return $existing?->logo_path;
        }

        $this->deleteLogoFile($existing?->logo_path);

        return $request->file('logo')->store('company-logos', 'public');
    }

    private function deleteLogoFile(?string $path): void
    {
        if ($path && Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
    }
}
