import apiClient from './apiClient';

export interface CommentModel {
    id?: number;
    workerId?: number;
    workerName?: string;
    dateEntered?: string;
    dateEdited?: string;
    comment?: string;
    commentType?: string;
    contextId?: string;
    contextTable?: string;
    order?: number;
    displayMode?: number;
    departments?: { id: number; name: string; bpmId: string | null }[];
    isMyComment?: boolean;
    [key: string]: any;
}

/**
 * Get comments for a specific task
 * GET /api/comment/task/{taskId}
 */
export async function getTaskComments(taskId: number): Promise<CommentModel[]> {
    const response = await apiClient.get<CommentModel[]>(`/api/comment/task/${taskId}`);
    return response.data || [];
}

/**
 * Add a comment to a task
 * POST /api/comment/task/add
 */
export async function addTaskComment(commentModel: Partial<CommentModel>): Promise<CommentModel> {
    try {
        console.log('=== ADD COMMENT PAYLOAD ===', JSON.stringify(commentModel, null, 2));
        const response = await apiClient.post<CommentModel>('/api/comment/task/add', commentModel);
        return response.data;
    } catch (err: any) {
        console.log('=== ADD COMMENT ERROR ===', err.response?.status, JSON.stringify(err.response?.data, null, 2) || err.message);
        throw err;
    }
}

/**
 * Update an existing task comment
 * POST /api/comment/task/update
 */
export async function updateTaskComment(commentModel: Partial<CommentModel>): Promise<CommentModel> {
    const response = await apiClient.post<CommentModel>('/api/comment/task/update', commentModel);
    return response.data;
}

/**
 * Delete a task comment
 * DELETE /api/comment/task/delete?commentId={commentId}
 */
export async function deleteTaskComment(commentId: number): Promise<void> {
    await apiClient.delete(`/api/comment/task/delete`, { params: { commentId } });
}
