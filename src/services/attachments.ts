/**
 * attachments — image/file selection for Denty-AI.
 *
 * Images are analyzed with the model's vision (Gemini); files (PDF, DOCX, txt,
 * csv, json, rtf, html…) are uploaded as base64 to the `denty-agent` Edge
 * Function, which extracts their text reliably on the server.
 */

import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { bytesToBase64 } from '@/src/services/base64';

export type Attachment =
  | { type: 'image'; uri: string; mime: string; base64: string; name: string }
  | { type: 'file'; uri: string; mime: string; base64: string; name: string };

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_FILE_BYTES = 3.5 * 1024 * 1024;

const FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/json',
  'text/plain',
  'text/markdown',
  'text/csv',
  'text/rtf',
  'text/html',
];

export async function pickImageAttachment(): Promise<Attachment | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Se necesita acceso a tus fotos para adjuntar una imagen.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    base64: true,
    quality: 0.7,
  });

  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  if (!asset.base64) return null;

  const approxBytes = Math.round(asset.base64.length * 0.75);
  if (approxBytes > MAX_IMAGE_BYTES) {
    throw new Error('La imagen es muy grande. Usa una de menos de 3 MB.');
  }

  return {
    type: 'image',
    uri: asset.uri,
    mime: asset.mimeType ?? 'image/jpeg',
    base64: asset.base64,
    name: asset.fileName ?? 'imagen.jpg',
  };
}

export async function pickFileAttachment(): Promise<Attachment | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: FILE_TYPES,
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];

  const bytes = await new File(asset.uri).bytes();
  if (bytes.length > MAX_FILE_BYTES) {
    throw new Error('El archivo es demasiado grande. Usa uno de menos de 3.5 MB.');
  }

  return {
    type: 'file',
    uri: asset.uri,
    mime: asset.mimeType ?? 'application/octet-stream',
    base64: bytesToBase64(bytes),
    name: asset.name ?? 'documento',
  };
}
