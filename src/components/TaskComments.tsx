import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import {
    CommentModel,
    getTaskComments,
    addTaskComment,
    deleteTaskComment
} from '../api/commentService';

interface Props {
    taskId: number;
    jobId?: number;
    readOnly?: boolean;
}

export default function TaskComments({ taskId, jobId, readOnly = false }: Props) {
    const [comments, setComments] = useState<CommentModel[]>([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchComments();
    }, [taskId]);

    const fetchComments = async () => {
        try {
            setLoading(true);
            const data = await getTaskComments(taskId);
            // Sort by id ascending (lowest to highest)
            const sorted = data.sort((a, b) => {
                return (a.id || 0) - (b.id || 0);
            });
            setComments(sorted);
        } catch (err: any) {
            console.error('Failed to fetch comments', err);
            if (Platform.OS === 'web') {
                window.alert('Failed to load comments');
            } else {
                Alert.alert('Error', 'Failed to load comments');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) return;

        try {
            setSubmitting(true);
            const commentObj = {
                id: 0,
                comment: newComment.trim(),
                commentType: 'Type',
                contextId: (jobId || taskId).toString(),
                contextTable: 'JobTask',
                dateEntered: new Date().toISOString(),
                order: 0,
                displayMode: 0,
            };
            await addTaskComment(commentObj);
            setNewComment('');
            fetchComments();
        } catch (err: any) {
            console.error('Failed to add comment', err.response?.data || err.message);
            const errorMsg = err.response?.data?.message || err.response?.data?.title || JSON.stringify(err.response?.data) || err.message || 'Unknown error';
            if (Platform.OS === 'web') {
                window.alert(`Error Adding Comment\nStatus: ${err.response?.status}\nDetails: ${errorMsg}`);
            } else {
                Alert.alert('Error Adding Comment', `Details: ${errorMsg}`);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = (commentId: number) => {
        if (Platform.OS === 'web') {
            const confirmed = window.confirm('Are you sure you want to delete this comment?');
            if (confirmed) {
                deleteTaskComment(commentId)
                    .then(() => fetchComments())
                    .catch((err: any) => {
                        console.error('Failed to delete comment', err);
                        window.alert('Failed to delete comment');
                    });
            }
        } else {
            Alert.alert('Delete Comment', 'Are you sure you want to delete this comment?', [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteTaskComment(commentId);
                            fetchComments();
                        } catch (err: any) {
                            console.error('Failed to delete comment', err);
                            Alert.alert('Error', 'Failed to delete comment');
                        }
                    }
                }
            ]);
        }
    };

    const renderComment = ({ item }: { item: CommentModel }) => {
        const dateStr = item.dateEntered
            ? new Date(item.dateEntered).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
            : '';
        const author = item.workerName || 'Unknown User';
        const initials = author.substring(0, 2) || '?';
        const departmentsStr = item.departments && item.departments.length > 0
            ? item.departments.map(d => d.name).join(', ')
            : '';

        return (
            <View style={styles.commentCard}>
                <View style={styles.commentHeader}>
                    <View style={styles.authorContainer}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{initials.toUpperCase()}</Text>
                        </View>
                        <View style={styles.authorInfo}>
                            <Text style={styles.date}>Entered on: {dateStr}</Text>
                            <Text style={styles.author}>
                                Worker: {author}{departmentsStr ? `, Departments: ${departmentsStr}` : ''}
                            </Text>
                        </View>
                    </View>
                    {item.isMyComment && !readOnly && (
                        <TouchableOpacity onPress={() => item.id && handleDelete(item.id)} style={styles.deleteButton}>
                            <Ionicons name="trash-outline" size={20} color={Colors?.error || '#d32f2f'} />
                        </TouchableOpacity>
                    )}
                </View>
                <Text style={styles.commentBody}>{item.comment}</Text>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={100}
        >
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors?.accent || '#00AEEF'} />
                </View>
            ) : (
                <FlatList
                    data={comments}
                    keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                    renderItem={renderComment}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="chatbubbles-outline" size={48} color="#ccc" />
                            <Text style={styles.emptyText}>No comments yet</Text>
                        </View>
                    }
                />
            )}

            {!readOnly && (
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Add a comment..."
                        value={newComment}
                        onChangeText={setNewComment}
                        multiline
                        maxLength={500}
                    />
                    <TouchableOpacity
                        style={[
                            styles.sendButton,
                            (!newComment.trim() || submitting) && styles.sendButtonDisabled
                        ]}
                        onPress={handleAddComment}
                        disabled={!newComment.trim() || submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Ionicons name="send" size={20} color="#fff" />
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7fa',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContainer: {
        padding: 16,
        paddingBottom: 24,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 40,
    },
    emptyText: {
        marginTop: 12,
        color: '#888',
        fontSize: 14,
    },
    commentCard: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    commentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    authorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1, // take up available space
        paddingRight: 8,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#00AEEF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    authorInfo: {
        flex: 1,
    },
    author: {
        fontWeight: '500',
        color: '#555',
        fontSize: 13,
        marginTop: 2,
    },
    date: {
        color: '#333',
        fontWeight: '600',
        fontSize: 13,
    },
    deleteButton: {
        padding: 4,
    },
    commentBody: {
        color: '#444',
        fontSize: 14,
        lineHeight: 20,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    input: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 10,
        maxHeight: 100,
        fontSize: 14,
    },
    sendButton: {
        backgroundColor: '#00AEEF',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
        marginBottom: 2,
    },
    sendButtonDisabled: {
        backgroundColor: '#b0bec5',
    },
});
