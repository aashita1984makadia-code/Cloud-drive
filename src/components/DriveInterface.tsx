'use client';

import React, { useState } from 'react';
import { Folder, FileText, Upload, Trash2, HardDrive, CheckCircle2 } from 'lucide-react';

export default function DriveInterface() {
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const [folders, setFolders] = useState([
    { id: '1', name: 'Work Documents', itemsCount: 12 },
    { id: '2', name: 'Design Assets', itemsCount: 8 },
    { id: '3', name: 'Projects & Source', itemsCount: 24 },
  ]);

  const [files, setFiles] = useState([
    { id: '101', name: 'Quarterly_Report_2026.pdf', size: '2.4 MB', type: 'application/pdf', date: '2026-09-28' },
    { id: '102', name: 'Architecture_Diagram.png', size: '1.1 MB', type: 'image/png', date: '2026-09-29' },
    { id: '103', name: 'Database_Backup.sql', size: '14.8 MB', type: 'text/plain', date: '2026-09-30' },
  ]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    setIsUploading(true);
    setUploadStatus('Uploading file via Presigned S3 URL...');

    setTimeout(() => {
      const file = uploadedFiles[0];
      const newFile = {
        id: Date.now().toString(),
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        type: file.type || 'file',
        date: new Date().toISOString().split('T')[0],
      };

      setFiles([newFile, ...files]);
      setIsUploading(false);
      setUploadStatus('Upload completed successfully!');
      setTimeout(() => setUploadStatus(null), 3000);
    }, 1200);
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800">
      <aside className="w-64 border-r border-slate-200 bg-white p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-sky-600 text-white p-2 rounded-xl shadow-md">
              <HardDrive className="w-6 h-6" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">CloudDrive</span>
          </div>

          <nav className="space-y-1">
            <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg bg-sky-50 text-sky-700 font-medium">
              <HardDrive className="w-5 h-5" /> My Drive
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100 transition">
              <Trash2 className="w-5 h-5" /> Trash
            </button>
          </nav>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex justify-between items-center text-xs text-slate-500 mb-2">
            <span>Storage Used</span>
            <span className="font-semibold text-slate-700">18.3 MB / 500 MB</span>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div className="bg-sky-600 h-full w-[4%]" />
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-slate-200 bg-white px-8 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
            <span className="hover:text-slate-800 cursor-pointer" onClick={() => setCurrentFolder(null)}>My Drive</span>
            {currentFolder && (
              <>
                <span>/</span>
                <span className="text-slate-900 font-semibold">{currentFolder}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm cursor-pointer transition">
              <Upload className="w-4 h-4" />
              Upload File
              <input type="file" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {uploadStatus && (
            <div className="mb-6 flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>{uploadStatus}</span>
            </div>
          )}

          <section className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Folders</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  onClick={() => setCurrentFolder(folder.name)}
                  className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:shadow-md transition cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <Folder className="w-6 h-6 text-sky-500 fill-sky-100 group-hover:scale-105 transition" />
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{folder.name}</p>
                      <p className="text-xs text-slate-400">{folder.itemsCount} items</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Files</h2>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 text-xs font-semibold">
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Date Added</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {files.map((file) => (
                    <tr key={file.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 flex items-center gap-3">
                        <FileText className="w-5 h-5 text-slate-400" />
                        <span className="font-medium text-slate-800">{file.name}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">{file.date}</td>
                      <td className="py-3.5 px-4 text-slate-500">{file.size}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button className="text-slate-400 hover:text-red-600 transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
