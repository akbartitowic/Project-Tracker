<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('review_evaluations', function (Blueprint $table) {
            $table->id();
            $table->enum('methodology', ['Agile Scrum', 'Waterfall']);
            $table->string('name', 150);
            $table->string('trigger_label', 200);
            $table->unsignedTinyInteger('trigger_value')->nullable();
            $table->enum('trigger_unit', ['manhours_percent', 'milestone'])->default('manhours_percent');
            $table->text('focus');
            $table->text('purpose');
            $table->unsignedTinyInteger('order')->default(1);
            $table->timestamps();
        });

        Schema::create('review_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evaluation_id')->constrained('review_evaluations')->cascadeOnDelete();
            $table->string('question', 500);
            $table->text('description')->nullable();
            $table->decimal('weight', 5, 2)->default(0);
            $table->unsignedSmallInteger('order')->default(0);
            $table->timestamps();
        });

        // Default seed: 2 methodologies × 2 evaluations × 3 questions each
        $this->seedDefaults();
    }

    private function seedDefaults(): void
    {
        $now = now();

        // ── Agile Scrum evaluations ──
        $agile1 = DB::table('review_evaluations')->insertGetId([
            'methodology'   => 'Agile Scrum',
            'name'          => 'Evaluasi 1 — Di Tengah',
            'trigger_label' => 'Saat 50% Man-Hours Terpakai',
            'trigger_value' => 50,
            'trigger_unit'  => 'manhours_percent',
            'focus'         => 'Kecepatan respons (responsiveness) dan kelancaran komunikasi.',
            'purpose'       => 'Sebagai "alarm" awal. Jika kinerja tim dinilai kurang baik, masih ada sisa 50% waktu kontrak untuk memperbaiki kualitas pelayanan sebelum kontrak habis.',
            'order'         => 1,
            'created_at'    => $now,
            'updated_at'    => $now,
        ]);

        $agile2 = DB::table('review_evaluations')->insertGetId([
            'methodology'   => 'Agile Scrum',
            'name'          => 'Evaluasi 2 — Di Akhir',
            'trigger_label' => 'Saat 80% MH Terpakai / Kontrak Selesai',
            'trigger_value' => 80,
            'trigger_unit'  => 'manhours_percent',
            'focus'         => 'Kepuasan keseluruhan, kualitas solusi teknis, dan profesionalisme.',
            'purpose'       => 'Mengetahui hasil akhir kinerja dan menjadi modal utama untuk negosiasi perpanjangan kontrak (renewal).',
            'order'         => 2,
            'created_at'    => $now,
            'updated_at'    => $now,
        ]);

        // ── Waterfall evaluations ──
        $wf1 = DB::table('review_evaluations')->insertGetId([
            'methodology'   => 'Waterfall',
            'name'          => 'Evaluasi 1 — Di Tengah',
            'trigger_label' => 'Pasca Desain UI/UX Selesai',
            'trigger_value' => null,
            'trigger_unit'  => 'milestone',
            'focus'         => 'Kemampuan memahami kebutuhan bisnis klien, kreativitas, dan ketepatan waktu di fase awal.',
            'purpose'       => 'Memastikan hubungan kerja berjalan sehat dan komunikatif sebelum tim masuk ke fase coding/development yang memakan waktu lama.',
            'order'         => 1,
            'created_at'    => $now,
            'updated_at'    => $now,
        ]);

        $wf2 = DB::table('review_evaluations')->insertGetId([
            'methodology'   => 'Waterfall',
            'name'          => 'Evaluasi 2 — Di Akhir',
            'trigger_label' => 'Pasca UAT / Menjelang Go-Live',
            'trigger_value' => null,
            'trigger_unit'  => 'milestone',
            'focus'         => 'Kualitas teknis hasil akhir, manajemen proyek secara keseluruhan, dan komitmen tim.',
            'purpose'       => 'Menilai performa perusahaan secara total dari hulu ke hilir sekaligus menutup proyek dengan kesan yang baik (closing evaluation).',
            'order'         => 2,
            'created_at'    => $now,
            'updated_at'    => $now,
        ]);

        // ── Default questions ──
        $questions = [
            // Agile – Eval 1
            [$agile1, 'Bagaimana kecepatan tim dalam merespons setiap permintaan dan laporan masalah?', 'Nilai respons terhadap tiket, laporan bug, dan pertanyaan klien.', 33.33, 1],
            [$agile1, 'Bagaimana kelancaran komunikasi dan kejelasan informasi yang disampaikan?', 'Termasuk kejelasan laporan, kemudahan dihubungi, dan proaktivitas tim.', 33.33, 2],
            [$agile1, 'Apakah update dan laporan rutin disampaikan tepat waktu sesuai kesepakatan?', 'Misalnya laporan mingguan, ringkasan sprint, atau notifikasi perubahan.', 33.34, 3],

            // Agile – Eval 2
            [$agile2, 'Bagaimana kualitas teknis solusi yang diberikan selama masa kontrak?', 'Mencakup kestabilan sistem, minimnya bug kritis, dan efektivitas solusi.', 35, 1],
            [$agile2, 'Bagaimana profesionalisme dan sikap tim dalam berinteraksi dengan Anda?', 'Termasuk ketepatan janji, transparansi, dan etika kerja.', 30, 2],
            [$agile2, 'Seberapa puas Anda dengan layanan secara keseluruhan?', 'Penilaian menyeluruh atas pengalaman bekerja sama selama kontrak berlangsung.', 35, 3],

            // Waterfall – Eval 1
            [$wf1, 'Bagaimana kemampuan tim dalam memahami dan menerjemahkan kebutuhan bisnis Anda?', 'Seberapa baik tim menangkap visi, tujuan bisnis, dan kebutuhan pengguna akhir.', 40, 1],
            [$wf1, 'Bagaimana kreativitas dan kualitas desain UI/UX yang dihasilkan pada fase ini?', 'Nilai estetika, usability, dan kesesuaian desain dengan identitas bisnis Anda.', 35, 2],
            [$wf1, 'Apakah fase desain diselesaikan sesuai timeline yang telah disepakati?', 'Ketepatan waktu penyelesaian milestone desain.', 25, 3],

            // Waterfall – Eval 2
            [$wf2, 'Bagaimana kualitas teknis sistem yang dibangun (performa, keamanan, stabilitas)?', 'Mencakup hasil UAT, bug yang ditemukan, dan kesiapan sistem untuk go-live.', 35, 1],
            [$wf2, 'Bagaimana manajemen proyek dan pengelolaan timeline secara keseluruhan?', 'Termasuk ketepatan milestone, penanganan scope change, dan komunikasi progress.', 30, 2],
            [$wf2, 'Bagaimana komitmen dan dedikasi tim dalam menyelesaikan proyek hingga go-live?', 'Nilai kesungguhan, ketanggapan terhadap revisi UAT, dan dukungan saat launching.', 35, 3],
        ];

        foreach ($questions as [$evalId, $question, $description, $weight, $order]) {
            DB::table('review_questions')->insert([
                'evaluation_id' => $evalId,
                'question'      => $question,
                'description'   => $description,
                'weight'        => $weight,
                'order'         => $order,
                'created_at'    => $now,
                'updated_at'    => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('review_questions');
        Schema::dropIfExists('review_evaluations');
    }
};
