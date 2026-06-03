import os
import re
import io
import tempfile
from flask import Flask, request, jsonify, render_template, send_file
from converter_engine import MarkdownEngine

# Inisialisasi Flask
app = Flask(__name__, template_folder='templates', static_folder='static')

# Inisialisasi MarkdownEngine v2
engine = MarkdownEngine()

# Cek ketersediaan pyperclip
try:
    import pyperclip
except ImportError:
    pyperclip = None


@app.route('/')
def index():
    """Menyajikan halaman utama UI."""
    return render_template('index.html')


@app.route('/learn')
def learn():
    """Menyajikan halaman penjelasan visual CO-TO."""
    return render_template('learn.html')


@app.route('/api/convert', methods=['POST'])
def convert_file():
    """
    Endpoint API: menerima SATU atau LEBIH file sekaligus.
    Mengembalikan satu JSON dengan data gabungan jika multi-file,
    atau data tunggal jika hanya satu file.
    """
    files = request.files.getlist('file')

    if not files or all(f.filename == '' for f in files):
        return jsonify({
            "success": False,
            "error": "Tidak ada file yang diunggah.",
            "data": None
        }), 400

    # Filter file kosong
    files = [f for f in files if f.filename != '']

    # Ambil opsi Ultra-Pure Text Mode (strip_symbols) dari form data (untuk inisiasi clipboard server)
    strip_symbols = request.form.get('strip_symbols') == 'true'

    results = []
    temp_paths = []

    try:
        for uploaded_file in files:
            original_filename = uploaded_file.filename
            _, ext = os.path.splitext(original_filename)

            # Simpan file sementara
            temp_dir = tempfile.gettempdir()
            temp_path = os.path.join(temp_dir, f"coto_{os.urandom(8).hex()}{ext}")
            uploaded_file.save(temp_path)
            temp_paths.append(temp_path)

            # Proses dengan engine (mengembalikan versi standar dan ultra-pure sekaligus)
            hasil = engine.process(temp_path, original_filename=original_filename)
            results.append(hasil)

        # Gabungkan hasil semua file
        if len(results) == 1:
            # Single file — output langsung
            single = results[0]
            file_item = {
                "success": single.get("success"),
                "error": single.get("error"),
                "data": single.get("data"),
                "data_pure": single.get("data_pure"),
                "meta": single.get("meta", {})
            }
            final = {
                "success": single.get("success"),
                "error": single.get("error"),
                "data": single.get("data"),
                "data_pure": single.get("data_pure"),
                "meta": single.get("meta", {}),
                "files": [file_item]
            }
        else:
            # Multi-file — gabungkan dengan pembatas antar file
            combined_parts = []
            combined_parts_pure = []
            total_tokens = 0
            total_tokens_pure = 0
            all_success = True
            errors = []

            for r in results:
                if r["success"]:
                    fname = r["meta"]["filename"]
                    divider = (
                        f"\n\n{'='*60}\n"
                        f"## 📄 File: `{fname}`\n"
                        f"{'='*60}\n\n"
                    )
                    divider_pure = (
                        f"\n\n{'='*60}\n"
                        f" File: {fname}\n"
                        f"{'='*60}\n\n"
                    )
                    combined_parts.append(divider + r["data"])
                    combined_parts_pure.append(divider_pure + r["data_pure"])
                    total_tokens += r["meta"]["estimated_tokens"]
                    total_tokens_pure += r["meta"]["estimated_tokens_pure"]
                else:
                    all_success = False
                    errors.append(f"{r.get('meta', {}).get('filename', '?')}: {r['error']}")

            combined_data = "\n\n".join(combined_parts)
            combined_data_pure = "\n\n".join(combined_parts_pure)
            final = {
                "success": all_success or len(combined_parts) > 0,
                "error": "; ".join(errors) if errors else None,
                "data": combined_data,
                "data_pure": combined_data_pure,
                "files": results, # Kembalikan array seluruh hasil file individu
                "meta": {
                    "filename": f"{len(results)} files",
                    "estimated_tokens": total_tokens,
                    "estimated_tokens_pure": total_tokens_pure,
                    "file_count": len(results),
                    "success_count": len(combined_parts),
                }
            }

        # Salin ke clipboard via pyperclip (pilih versi yang sesuai dengan state tombol saat drop)
        copy_target = final.get("data_pure") if strip_symbols else final.get("data")
        if final.get("success") and copy_target and pyperclip:
            try:
                pyperclip.copy(copy_target)
                final.setdefault("meta", {})["copied_by_backend"] = True
            except Exception as clipboard_err:
                print(f"[Warning] pyperclip gagal: {clipboard_err}")
                final.setdefault("meta", {})["copied_by_backend"] = False
        else:
            final.setdefault("meta", {})["copied_by_backend"] = False

        return jsonify(final)

    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Kesalahan server: {str(e)}",
            "data": None
        }), 500

    finally:
        # Bersihkan semua file sementara
        for path in temp_paths:
            if os.path.exists(path):
                try:
                    os.remove(path)
                except Exception as clean_err:
                    print(f"[Warning] Gagal hapus temp: {clean_err}")


@app.route('/api/download', methods=['POST'])
def download_file():
    """
    Endpoint untuk mengunduh konten Markdown sebagai file .md.
    Menerima JSON body: { "content": "...", "original_filename": "namafile.pdf" }
    Nama file output: <namafile_asli>_CVTBYCOTO.md
    """
    body = request.get_json()
    if not body or 'content' not in body:
        return jsonify({"error": "Konten tidak ditemukan."}), 400

    content = body.get('content', '')
    original_filename = body.get('original_filename', 'output')

    # Buat nama file output: namaasli_BYCOTO.md
    base_name = os.path.splitext(original_filename)[0]
    # Sanitasi nama file (buang karakter berbahaya)
    safe_base = re.sub(r'[\\/:*?"<>|]', '_', base_name)
    output_filename = f"{safe_base}_BYCOTO.md"

    # Buat file di memori (tidak perlu nulis ke disk)
    file_buffer = io.BytesIO(content.encode('utf-8'))
    file_buffer.seek(0)

    return send_file(
        file_buffer,
        as_attachment=True,
        download_name=output_filename,
        mimetype='text/markdown'
    )


if __name__ == '__main__':
    print("=" * 50)
    print("  CO-TO (eco-Token) v2 — Server Aktif!")
    print("  Buka browser: http://127.0.0.1:5000")
    print("=" * 50)
    app.run(host='127.0.0.1', port=5000, debug=True)
