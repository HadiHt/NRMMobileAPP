import * as signalR from '@microsoft/signalr';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = 'https://wfm-w4-test.azurewebsites.net';
const TOKEN_KEY = 'auth_access_token';

type EventCallback = (...args: any[]) => void;

class SignalRService {
    private taskHubConnection: signalR.HubConnection | null = null;
    private taskListHubConnection: signalR.HubConnection | null = null;
    private listeners: Map<string, EventCallback[]> = new Map();

    /**
     * Build a SignalR hub connection with auth token
     */
    private async buildConnection(hubPath: string): Promise<signalR.HubConnection> {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);

        return new signalR.HubConnectionBuilder()
            .withUrl(`${BASE_URL}${hubPath}`, {
                accessTokenFactory: () => token ?? '',
                transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
            })
            .withAutomaticReconnect({
                nextRetryDelayInMilliseconds: (retryContext) => {
                    // Exponential backoff: 0s, 2s, 4s, 8s, 16s, then cap at 30s
                    const delay = Math.min(Math.pow(2, retryContext.previousRetryCount) * 1000, 30000);
                    return delay;
                },
            })
            .configureLogging(signalR.LogLevel.Warning)
            .build();
    }

    /**
     * Connect to the TaskHub for real-time task updates
     */
    async connectTaskHub(): Promise<void> {
        try {
            this.taskHubConnection = await this.buildConnection('/hubs/task');

            this.taskHubConnection.on('TaskUpdated', (data: any) => {
                this.emit('TaskUpdated', data);
            });

            this.taskHubConnection.on('TaskCreated', (data: any) => {
                this.emit('TaskCreated', data);
            });

            this.taskHubConnection.on('TaskDeleted', (data: any) => {
                this.emit('TaskDeleted', data);
            });

            this.taskHubConnection.onreconnecting(() => {
                console.log('[SignalR] TaskHub reconnecting...');
            });

            this.taskHubConnection.onreconnected(() => {
                console.log('[SignalR] TaskHub reconnected');
            });

            this.taskHubConnection.onclose(() => {
                console.log('[SignalR] TaskHub closed');
            });

            await this.taskHubConnection.start();
            console.log('[SignalR] TaskHub connected');
        } catch (err) {
            console.error('[SignalR] TaskHub connection failed:', err);
        }
    }

    /**
     * Connect to the TaskListHub for task list updates
     */
    async connectTaskListHub(): Promise<void> {
        try {
            this.taskListHubConnection = await this.buildConnection('/hubs/tasklist');

            this.taskListHubConnection.on('RefreshTaskList', (data: any) => {
                this.emit('RefreshTaskList', data);
            });

            this.taskListHubConnection.on('TaskListUpdated', (data: any) => {
                this.emit('TaskListUpdated', data);
            });

            await this.taskListHubConnection.start();
            console.log('[SignalR] TaskListHub connected');
        } catch (err) {
            console.error('[SignalR] TaskListHub connection failed:', err);
        }
    }

    /**
     * Connect to all hubs
     */
    async connectAll(): Promise<void> {
        await Promise.allSettled([
            this.connectTaskHub(),
            this.connectTaskListHub(),
        ]);
    }

    /**
     * Disconnect all hubs
     */
    async disconnectAll(): Promise<void> {
        await Promise.allSettled([
            this.taskHubConnection?.stop(),
            this.taskListHubConnection?.stop(),
        ]);
        this.taskHubConnection = null;
        this.taskListHubConnection = null;
    }

    /**
     * Subscribe to an event
     */
    on(event: string, callback: EventCallback): () => void {
        const existing = this.listeners.get(event) ?? [];
        existing.push(callback);
        this.listeners.set(event, existing);

        // Return unsubscribe function
        return () => {
            const cbs = this.listeners.get(event) ?? [];
            this.listeners.set(event, cbs.filter((cb) => cb !== callback));
        };
    }

    private emit(event: string, ...args: any[]): void {
        const cbs = this.listeners.get(event) ?? [];
        cbs.forEach((cb) => cb(...args));
    }
}

// Singleton instance
export const signalRService = new SignalRService();
