import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    Alert,
    Platform,
    TouchableOpacity,
    Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import {
    DocumentModelOld,
    getDocumentsByJob,
    deleteDocument,
    getDownloadUrl
} from '../../api/documentService';
import DocumentUploadModal from './DocumentUploadModal';

interface Props {
    taskId?: number;
    jobId: number;
    taskTypeId?: string;
    readOnly?: boolean;
}

export default function DocumentList({ taskId, jobId, taskTypeId, readOnly = false }: Props) {
    const [documents, setDocuments] = useState<DocumentModelOld[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploadModalVisible, setUploadModalVisible] = useState(false);

    useEffect(() => {
        fetchDocuments();
    }, [jobId, taskId]);

    const fetchDocuments = async () => {
        try {
            setLoading(true);
            const data = await getDocumentsByJob(jobId, taskId);
            setDocuments(data);
        } catch (err) {
            console.error('Failed to fetch documents', err);
            Alert.alert('Error', 'Failed to load documents');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (doc: DocumentModelOld) => {
        if (Platform.OS === 'web') {
            const confirmed = window.confirm('Are you sure you want to delete this document?');
            if (confirmed) {
                deleteDocument(doc)
                    .then(() => fetchDocuments())
                    .catch(() => window.alert('Failed to delete document'));
            }
        } else {
            Alert.alert('Delete Document', 'Are you sure you want to delete this document?', [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteDocument(doc);
                            fetchDocuments();
                        } catch (err) {
                            Alert.alert('Error', 'Failed to delete document');
                        }
                    }
                }
            ]);
        }
    };

    const handleDownload = (doc: DocumentModelOld) => {
        const url = getDownloadUrl(doc.id);
        // Assuming we combine it with an API_BASE_URL if it's relative
        // For simplicity, we can let Linking.openURL attempt to open it, 
        // though in React Native it needs an absolute URL.
        import('../../api/apiClient').then(({ API_BASE_URL }) => {
            const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
            Linking.openURL(fullUrl).catch(() => {
                Alert.alert('Error', 'Unable to open document');
            });
        });
    };

    const renderDocument = ({ item }: { item: DocumentModelOld }) => {
        const dateStr = item.createdOn
            ? new Date(item.createdOn).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
            : '';

        const sizeInKB = item.documentSize ? (item.documentSize / 1024).toFixed(1) + ' KB' : '';

        return (
            <View style={styles.documentCard}>
                <View style={styles.iconContainer}>
                    <Ionicons name="document-text-outline" size={32} color={Colors?.accent || '#00AEEF'} />
                </View>
                
                <View style={styles.docInfo}>
                    <Text style={styles.docName} numberOfLines={1}>{item.originalFileName || 'Unnamed File'}</Text>
                    <Text style={styles.docMeta}>
                        {item.documentTypeCode || 'Unknown Type'} • {sizeInKB}
                    </Text>
                    {item.description ? (
                        <Text style={styles.docDesc} numberOfLines={2}>{item.description}</Text>
                    ) : null}
                    <Text style={styles.docDate}>Added {dateStr} by {item.createdBy}</Text>
                </View>

                <View style={styles.actions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleDownload(item)}>
                        <Ionicons name="download-outline" size={22} color={Colors?.accent || '#00AEEF'} />
                    </TouchableOpacity>
                    {!readOnly && (
                        <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
                            <Ionicons name="trash-outline" size={22} color={Colors?.error || '#d32f2f'} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors?.accent || '#00AEEF'} />
                </View>
            ) : (
                <FlatList
                    data={documents}
                    keyExtractor={(item) => item.id}
                    renderItem={renderDocument}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="folder-open-outline" size={48} color="#ccc" />
                            <Text style={styles.emptyText}>No documents found</Text>
                        </View>
                    }
                />
            )}

            {!readOnly && (
                <View style={styles.footer}>
                    <TouchableOpacity 
                        style={styles.uploadBtn}
                        onPress={() => setUploadModalVisible(true)}
                    >
                        <Ionicons name="add-circle-outline" size={20} color="#fff" />
                        <Text style={styles.uploadBtnText}>Upload Document</Text>
                    </TouchableOpacity>
                </View>
            )}

            <DocumentUploadModal 
                visible={uploadModalVisible}
                onClose={() => setUploadModalVisible(false)}
                onUploadSuccess={() => {
                    setUploadModalVisible(false);
                    fetchDocuments();
                }}
                jobId={jobId}
                taskId={taskId}
                taskTypeId={taskTypeId}
            />
        </View>
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
    documentCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        alignItems: 'center'
    },
    iconContainer: {
        marginRight: 12,
    },
    docInfo: {
        flex: 1,
        marginRight: 8,
    },
    docName: {
        fontWeight: 'bold',
        fontSize: 15,
        color: '#333',
        marginBottom: 2
    },
    docMeta: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
        marginBottom: 4
    },
    docDesc: {
        fontSize: 13,
        color: '#555',
        marginBottom: 4
    },
    docDate: {
        fontSize: 11,
        color: '#888'
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    actionBtn: {
        padding: 8,
        marginLeft: 4
    },
    footer: {
        padding: 16,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    uploadBtn: {
        backgroundColor: '#00AEEF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
    },
    uploadBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 8,
    }
});
