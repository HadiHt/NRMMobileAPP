import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configure notification handler
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

/**
 * Register for push notifications and get the Expo push token
 */
export async function registerForPushNotifications(): Promise<string | null> {
    try {
        // Check for permission
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.warn('Push notification permission not granted');
            return null;
        }

        // Get the push token
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId,
        });

        // Android channel configuration
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'Default',
                importance: Notifications.AndroidImportance.HIGH,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#00B4D8',
            });

            await Notifications.setNotificationChannelAsync('tasks', {
                name: 'Task Updates',
                importance: Notifications.AndroidImportance.HIGH,
                description: 'Notifications for new and updated tasks',
            });
        }

        return tokenData.data;
    } catch (error) {
        console.error('Failed to register for push notifications:', error);
        return null;
    }
}

/**
 * Listener type for navigation on notification tap
 */
export type NotificationNavigationHandler = (
    taskId?: number,
    jobId?: number,
    screen?: string
) => void;

let navigationHandler: NotificationNavigationHandler | null = null;

export function setNotificationNavigationHandler(handler: NotificationNavigationHandler) {
    navigationHandler = handler;
}

/**
 * Set up notification response listener (when user taps a notification)
 */
export function setupNotificationResponseListener(): Notifications.EventSubscription {
    return Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        if (navigationHandler) {
            navigationHandler(data?.taskId as number, data?.jobId as number, data?.screen as string);
        }
    });
}

/**
 * Set up notification received listener (foreground)
 */
export function setupNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
): Notifications.EventSubscription {
    return Notifications.addNotificationReceivedListener(callback);
}
