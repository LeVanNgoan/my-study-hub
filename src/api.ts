import { invoke } from '@tauri-apps/api/core';
import { localCommand } from './localStore';

export const isNative = () => '__TAURI_INTERNALS__' in window;

export async function call<T>(command: string, args: Record<string, any> = {}): Promise<T> {
  if (isNative()) return invoke<T>(command, args);
  return localCommand<T>(command, args);
}

export function parseStudyNoteFilename(filename: string) {
  const match = filename.match(/^(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.(txt|md)$/i);
  if (!match) return null;
  const [, ww, ss, dd, mm, yy] = match;
  const year = 2000 + Number(yy);
  const month = Number(mm);
  const day = Number(dd);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return {
    week: Number(ww),
    slot: Number(ss),
    study_date: `${year}-${mm}-${dd}`,
  };
}

export async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function downloadText(filename: string, content: string, type = 'application/json') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
