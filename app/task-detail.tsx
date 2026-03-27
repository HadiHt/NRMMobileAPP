import { useLocalSearchParams, useRouter } from 'expo-router';
import { Platform } from 'react-native';
import TaskDetailScreen from '../src/screens/TaskDetailScreen';

export default function TaskDetailPage() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const taskId = parseInt(id || '0', 10);

    const handleBack = () => {
        if (Platform.OS === 'web') {
            router.replace('/(tabs)');
        } else {
            router.back();
        }
    };

    return (
        <TaskDetailScreen
            taskId={taskId}
            onBack={handleBack}
            onFinalizeSuccess={() => {
                router.replace({ pathname: '/(tabs)', params: { view: 'tasks' } });
            }}
            onOpenInWebView={() => router.push({ pathname: '/(tabs)/forms', params: { taskId } })}
        />
    );
}
