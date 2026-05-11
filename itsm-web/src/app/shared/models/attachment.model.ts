export interface Attachment {
  id: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  description: string | null;
  uploadedById: string;
  uploadedBy: string;
  createdAt: string;
  isImage: boolean;
}