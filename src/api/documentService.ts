import apiClient from './apiClient';

export interface DocumentTypeModel {
    id: string;
    code: string;
    name: string;
    allowedExtensions: string;
}

export interface DocumentModelOld {
    id: string;
    jobId: number;
    taskId: number;
    originalFileName: string;
    description: string;
    documentTypeId?: string | null;
    documentTypeCode: string;
    createdOn: string;
    createdBy: string;
    documentSize: number;
    mimeType: string;
    [key: string]: any;
}

function appendUploadFile(formData: FormData, file: any, index: number) {
    const inferredName = file?.name || `upload-${index + 1}`;
    const inferredType = file?.mimeType || file?.type || 'application/octet-stream';

    const maybeWebFile = file?.file ?? file;
    const hasFileCtor = typeof File !== 'undefined';
    const hasBlobCtor = typeof Blob !== 'undefined';
    const isWebFile =
        !!maybeWebFile &&
        ((hasFileCtor && maybeWebFile instanceof File) || (hasBlobCtor && maybeWebFile instanceof Blob));

    if (isWebFile) {
        formData.append('files', maybeWebFile as Blob, inferredName);
        return;
    }

    if (file?.uri) {
        formData.append('files', {
            uri: file.uri,
            type: inferredType,
            name: inferredName,
        } as any);
    }
}

/**
 * Gets the allowed document types for a specific task type.
 * GET /api/documentType/task-type-document-types/{taskTypeId}
 */
export async function getDocumentTypesForTaskType(taskTypeId: string): Promise<DocumentTypeModel[]> {
    const response = await apiClient.get<DocumentTypeModel[]>(`/api/documentType/task-type-document-types/${taskTypeId}`);
    return response.data || [];
}

/**
 * Gets all documents for a job, optionally filtered by task.
 * POST /api/document/by-job/{id}?taskId={taskId}
 */
export async function getDocumentsByJob(jobId: number, taskId?: number): Promise<DocumentModelOld[]> {
    const url = taskId ? `/api/document/by-job/${jobId}?taskId=${taskId}` : `/api/document/by-job/${jobId}`;
    const response = await apiClient.post<DocumentModelOld[]>(url);
    return response.data || [];
}

/**
 * Checks if the user has reached the upload limit for this job.
 * GET /api/document/file-count/{jobId}
 */
export async function canUserUploadFile(jobId: number): Promise<string> {
    const response = await apiClient.get<string>(`/api/document/file-count/${jobId}`);
    return response.data;
}

/**
 * Uploads a document (or multiple).
 * POST /api/document
 */
export async function uploadDocument(
    jobId: number,
    taskId: number | undefined,
    documentNames: string[],
    documentDescriptions: string[],
    documentTypes: string[],
    files: any[]
): Promise<DocumentModelOld> {
    const formData = new FormData();
    formData.append('woid', jobId.toString());
    
    if (taskId !== undefined) {
        formData.append('taskId', taskId.toString());
    }
    
    documentNames.forEach((name, index) => {
        formData.append(`documentNames[${index}]`, name);
    });
    documentDescriptions.forEach((desc, index) => {
        formData.append(`documentDescriptions[${index}]`, desc || '');
    });
    documentTypes.forEach((type, index) => {
        formData.append(`documentTypes[${index}]`, type);
    });
    
    files.forEach((file, index) => {
        appendUploadFile(formData, file, index);
    });

    // Let axios/runtime set multipart boundaries automatically.
    const response = await apiClient.post<DocumentModelOld>(`/api/document`, formData);
    
    return response.data;
}

/**
 * Updates a document's metadata (description/type).
 * PUT /api/document
 */
export async function updateDocument(model: Partial<DocumentModelOld>): Promise<void> {
    await apiClient.put(`/api/document`, model);
}

/**
 * Deletes a document.
 * DELETE /api/document
 */
export async function deleteDocument(model: Partial<DocumentModelOld>): Promise<void> {
    await apiClient.delete(`/api/document`, { data: model });
}

/**
 * Returns the download URL for a document.
 */
export function getDownloadUrl(id: string): string {
    // Ensure API_BASE_URL is added if required, or handled dynamically via apiClient interceptors/baseURL
    // But since it's just a string path:
    return `/api/document/download/${id}`;
}
