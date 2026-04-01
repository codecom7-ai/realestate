import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import Link from 'next/link';

const DOWNLOAD_DIR = '/home/z/my-project/download';
const PUBLIC_DIR = '/home/z/my-project/apps/web/public/downloads';

export default async function DownloadsPage() {
  let files: Array<{
    name: string;
    size: number;
    modified: Date;
  }> = [];
  
  try {
    const fileNames = await readdir(DOWNLOAD_DIR);
    files = await Promise.all(
      fileNames.map(async (name) => {
        const filePath = join(DOWNLOAD_DIR, name);
        const stats = await stat(filePath);
        return {
          name,
          size: stats.size,
          modified: stats.mtime,
        };
      })
    );
  } catch {
    // Directory doesn't exist or can't be read
  }
  
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };
  
  return (
    <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">📥 ملفات للتحميل</h1>
        
        {files.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">لا توجد ملفات متاحة للتحميل</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-600">اسم الملف</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-600">الحجم</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-600">تاريخ التعديل</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-600">تحميل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {files.map((file) => (
                  <tr key={file.name} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{file.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatSize(file.size)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {file.modified.toLocaleDateString('ar-EG')}
                    </td>
                    <td className="px-6 py-4">
                      <a
                        href={`/downloads/${file.name}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        تحميل
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        <div className="mt-8">
          <Link href="/ar/dashboard" className="text-blue-600 hover:underline">
            ← العودة للوحة التحكم
          </Link>
        </div>
      </div>
    </div>
  );
}
