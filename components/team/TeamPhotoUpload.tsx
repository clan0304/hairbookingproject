// components/team/TeamPhotoUpload.tsx
// ============================================
'use client';

import { useState, useRef } from 'react';
import { X, User } from 'lucide-react';
import Image from 'next/image';

interface TeamPhotoUploadProps {
  onImageSelect: (file: File | null) => void;
  currentImage?: string | null | undefined;
}

export function TeamPhotoUpload({
  onImageSelect,
  currentImage,
}: TeamPhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      onImageSelect(file);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onImageSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center space-x-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {preview ? (
        <div className="relative">
          <Image
            src={preview}
            alt="Team member"
            className="h-24 w-24 rounded-full object-cover border-2 border-gray-200"
            height={24}
            width={24}
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="h-24 w-24 rounded-full border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors flex flex-col items-center justify-center text-gray-400 hover:text-gray-500"
        >
          <User size={24} className="mb-1" />
          <span className="text-xs">Upload</span>
        </button>
      )}

      <div className="text-sm text-gray-600">
        <p>Upload a profile photo</p>
        <p className="text-xs text-gray-400">PNG, JPG up to 5MB</p>
      </div>
    </div>
  );
}
