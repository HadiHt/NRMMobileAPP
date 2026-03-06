import apiClient from './apiClient';

export interface CalendarEntry {
    Date: string;
    StartTime: string;
    EndTime: string;
    TaskId: number;
    TaskDescription: string;
    Status: string;
    Type: string; // 'task' | 'availability' | 'absence'
    [key: string]: any;
}

export interface OccupiedSlot {
    StartDate: string;
    EndDate: string;
    TaskId: number;
    [key: string]: any;
}

/**
 * Get current user calendar data
 */
export async function getCurrentUserCalendar(params: {
    startDate: string;
    endDate: string;
}): Promise<CalendarEntry[]> {
    const response = await apiClient.get('/api/mobile-calendar', { params });
    return response.data;
}

/**
 * Get worker occupied time slots
 */
export async function getWorkerOccupiedSlots(workerId: number): Promise<OccupiedSlot[]> {
    const response = await apiClient.get(`/api/mobile-calendar/worker/${workerId}/occupied-slots`);
    return response.data;
}
