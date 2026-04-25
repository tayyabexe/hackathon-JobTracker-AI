'use client';

import { useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { storage, db } from "@/lib/firebase";

export default function CVUploader({ user }: { user: any }) {
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Generate SHA-256 Fingerprint
  const generateFingerprint = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleUpload = async () => {
    if (!file || !label || !user) return;
    setIsUploading(true);

    try {
      // 1. Generate the SHA-256 Hash
      const fingerprint = await generateFingerprint(file);
      
      // 2. Upload the actual PDF to Firebase Storage
      const storageRef = ref(storage, `cvs/${user.uid}/${fingerprint}.pdf`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);

      // 3. Save the Metadata to Firestore
      await addDoc(collection(db, "cv_versions"), {
        userId: user.uid,
        label: label,
        fingerprint: fingerprint,
        fileUrl: downloadUrl,
        uploadedAt: serverTimestamp(),
        // Note: We leave matchScore and coachNotes empty for Agent 04 to fill later
        matchScore: null,
        coachNotes: null 
      });

      alert("CV Vaulted Successfully. Fingerprint Generated.");
      setFile(null);
      setLabel("");
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to vault CV.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="card p-6 max-w-md">
      <h3 className="text-xs uppercase tracking-widest font-mono text-[var(--text-secondary)] mb-4">CV INTELLIGENCE UPLOAD</h3>
      
      <input 
        type="text"
        placeholder="e.g. Senior Backend Focus v2"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-lg p-3 text-white font-mono text-sm focus:border-[var(--accent-primary)] outline-none mb-4"
      />
      
      <input 
        type="file"
        accept="application/pdf"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="w-full text-sm text-[var(--text-muted)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-[var(--accent-primary)] file:text-[#101623] hover:file:bg-[#6bc2eb] mb-4 cursor-pointer"
      />
      
      <button 
        onClick={handleUpload}
        disabled={!file || !label || isUploading}
        className="w-full btn btn-primary py-3 uppercase tracking-wider"
      >
        {isUploading ? "GENERATING HASH..." : "UPLOAD & FINGERPRINT"}
      </button>
    </div>
  );
}
