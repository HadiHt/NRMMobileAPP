import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Platform,
    FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import * as DocumentPicker from 'expo-document-picker';
import {
    DocumentTypeModel,
    getDocumentTypesForTaskType,
    uploadDocument,
    canUserUploadFile
} from '../../api/documentService';

interface Props {
    visible: boolean;
    onClose: () => void;
    onUploadSuccess: () => void;
    jobId: number;
    taskId?: number;
    taskTypeId?: string;
}

export default function DocumentUploadModal({ visible, onClose, onUploadSuccess, jobId, taskId, taskTypeId }: Props) {
    const [documentTypes, setDocumentTypes] = useState<DocumentTypeModel[]>([]);
    const [selectedType, setSelectedType] = useState<string>('');
    const [description, setDescription] = useState('');
    const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
    const [uploading, setUploading] = useState(false);
    const [loadingTypes, setLoadingTypes] = useState(false);

    useEffect(() => {
        if (visible) {
            resetState();
            if (taskTypeId) {
                fetchTypes(taskTypeId);
            }
        }
    }, [visible, taskTypeId]);

    const resetState = () => {
        setSelectedType('');
        setDescription('');
        setSelectedFile(null);
        setUploading(false);
    };

    const fetchTypes = async (typeId: string) => {
        try {
            setLoadingTypes(true);
            const types = await getDocumentTypesForTaskType(typeId);
            setDocumentTypes(types);
            if (types.length > 0) {
                setSelectedType(types[0].id);
            }
        } catch (err) {
            console.error('Failed to load document types', err);
        } finally {
            setLoadingTypes(false);
        }
    };

    const handlePickFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                copyToCacheDirectory: true,
                multiple: false
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
                setSelectedFile(result.assets[0]);
            }
        } catch (err) {
            console.error('Error picking document', err);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            Alert.alert('Validation Error', 'Please select a file to upload.');
            return;
        }

        try {
            setUploading(true);
            
            // Check limits first
            const limitCheck = await canUserUploadFile(jobId);
            if (limitCheck && limitCheck !== 'true' && limitCheck !== '') {
                // Assuming empty or 'true' means ok, strings could be error messages like "Max count reached"
                if (limitCheck.toLowerCase().includes('max')) {
                    Alert.alert('Upload Limit', limitCheck);
                    setUploading(false);
                    return;
                }
            }

            // Perform Upload
            const typesArray = selectedType ? [selectedType] : [];
            await uploadDocument(
                jobId,
                taskId,
                [selectedFile.name],
                [description],
                typesArray,
                [selectedFile]
            );

            onUploadSuccess();
        } catch (err: any) {
            console.error('Upload failed', err);
            const msg = err.response?.data?.message || err.message || 'Failed to upload document';
            Alert.alert('Upload Error', msg);
        } finally {
            setUploading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Upload Document</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.body}>
                        <Text style={styles.label}>Select File *</Text>
                        <TouchableOpacity style={styles.filePickerBtn} onPress={handlePickFile}>
                            <Ionicons name="document-attach-outline" size={20} color={Colors?.accent || '#00AEEF'} style={styles.fileIcon} />
                            <Text style={styles.filePickerText} numberOfLines={1}>
                                {selectedFile ? selectedFile.name : 'Tap to select document'}
                            </Text>
                        </TouchableOpacity>

                        {taskTypeId && (
                            <>
                                <Text style={styles.label}>Document Type</Text>
                                {loadingTypes ? (
                                    <ActivityIndicator size="small" color="#00AEEF" style={{ alignSelf: 'flex-start', marginVertical: 8 }} />
                                ) : (
                                    <View style={styles.pickerContainer}>
                                        {/* A basic horizontal scroll list as a simple picker replacement to avoid extra deps */}
                                        <FlatList
                                            horizontal
                                            showsHorizontalScrollIndicator={false}
                                            data={documentTypes}
                                            keyExtractor={(item) => item.id}
                                            renderItem={({ item }: { item: DocumentTypeModel }) => (
                                                <TouchableOpacity
                                                    style={[
                                                        styles.typeChip,
                                                        selectedType === item.id && styles.typeChipSelected
                                                    ]}
                                                    onPress={() => setSelectedType(item.id)}
                                                >
                                                    <Text style={[
                                                        styles.typeChipText,
                                                        selectedType === item.id && styles.typeChipTextSelected
                                                    ]}>
                                                        {item.name}
                                                    </Text>
                                                </TouchableOpacity>
                                            )}
                                        />
                                    </View>
                                )}
                            </>
                        )}

                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Optional description"
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={3}
                        />
                    </View>

                    <View style={styles.footer}>
                        <TouchableOpacity 
                            style={[styles.btn, styles.cancelBtn]} 
                            onPress={onClose}
                            disabled={uploading}
                        >
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[
                                styles.btn, 
                                styles.uploadBtn,
                                (!selectedFile || uploading) && styles.uploadBtnDisabled
                            ]} 
                            onPress={handleUpload}
                            disabled={!selectedFile || uploading}
                        >
                            {uploading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.uploadBtnText}>Upload</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalContent: {
        width: '100%',
        maxWidth: 500,
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee'
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333'
    },
    body: {
        padding: 16
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#555',
        marginBottom: 8,
        marginTop: 12
    },
    filePickerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f7fa',
        borderWidth: 1,
        borderColor: '#dde',
        borderStyle: 'dashed',
        borderRadius: 8,
        padding: 16,
        marginTop: 4
    },
    fileIcon: {
        marginRight: 10
    },
    filePickerText: {
        flex: 1,
        color: '#333',
        fontSize: 15
    },
    pickerContainer: {
        marginTop: 4,
        marginBottom: 8
    },
    typeChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#eee',
        marginRight: 8
    },
    typeChipSelected: {
        backgroundColor: '#00AEEF'
    },
    typeChipText: {
        color: '#555',
        fontWeight: '500'
    },
    typeChipTextSelected: {
        color: '#fff'
    },
    input: {
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 15,
        textAlignVertical: 'top',
        minHeight: 80
    },
    footer: {
        flexDirection: 'row',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        justifyContent: 'flex-end',
        gap: 12
    },
    btn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 90
    },
    cancelBtn: {
        backgroundColor: '#f5f5f5',
    },
    cancelBtnText: {
        color: '#666',
        fontWeight: '600',
        fontSize: 15
    },
    uploadBtn: {
        backgroundColor: '#00AEEF',
    },
    uploadBtnDisabled: {
        backgroundColor: '#90cae2',
    },
    uploadBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 15
    }
});
