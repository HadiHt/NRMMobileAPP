import { useLocalSearchParams, useRouter } from 'expo-router';
import TaskDetailScreen from '../src/screens/TaskDetailScreen';

export default function TaskDetailPage() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const taskId = parseInt(id || '0', 10);

    return (
        <TaskDetailScreen
            taskId={taskId}
            onBack={() => router.back()}
            onOpenInWebView={() => router.push({ pathname: '/(tabs)/forms', params: { taskId } })}
        />
    );
}
