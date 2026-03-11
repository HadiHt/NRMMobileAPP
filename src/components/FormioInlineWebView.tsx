import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { TokenStorage } from '../auth/TokenStorage';

const TOKEN_KEY = 'auth_access_token';

interface Props {
    formioConfig: string | object;
    formData?: any;
    readOnly?: boolean;
}

export default function FormioInlineWebView({ formioConfig, formData, readOnly = false }: Props) {
    const webViewRef = useRef<WebView>(null);
    const [html, setHtml] = useState('');

    useEffect(() => {
        const loadHtml = async () => {
            const configJson = typeof formioConfig === 'string' ? formioConfig : JSON.stringify(formioConfig);
            const token = await TokenStorage.getItemAsync(TOKEN_KEY) || '';

            const formioHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0">
                    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css">
                    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css">
                    <link rel="stylesheet" href="https://cdn.form.io/formiojs/formio.full.min.css">
                    <script src="https://cdn.form.io/formiojs/formio.full.min.js"></script>
                    <style>
                        body { padding: 15px; margin: 0; background-color: #fff; }
                    </style>
                </head>
                <body>
                    <div id="formio"></div>
                    <script>
                        try {
                            // Inject auth token
                            var token = '${token}';
                            if (token) {
                                localStorage.setItem('formioToken', token);
                                localStorage.setItem('access_token', token);
                                localStorage.setItem('token', token);
                                document.cookie = 'Authorization=Bearer ' + token + '; path=/; secure; SameSite=None';
                            }

                            var config = ${configJson};
                            var initialData = ${formData ? JSON.stringify(formData) : 'null'};
                            
                            Formio.createForm(document.getElementById('formio'), config, { readOnly: ${readOnly} }).then(function(form) {
                                if (initialData) {
                                    form.submission = {
                                        data: initialData
                                    };
                                }
                                form.on('submit', function(submission) {
                                    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                                        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'submit', data: submission }));
                                    } else {
                                        // For standard web iframe communication
                                        window.parent.postMessage(JSON.stringify({ type: 'submit', data: submission }), '*');
                                    }
                                });
                            });
                        } catch(e) {
                            document.body.innerHTML = "Error loading form: " + e.message;
                        }
                    </script>
                </body>
                </html>
            `;
            setHtml(formioHtml);
        };

        loadHtml();
    }, [formioConfig, formData]);

    useEffect(() => {
        if (Platform.OS === 'web') {
            const handleMessage = (event: MessageEvent) => {
                try {
                    // Check if it's the expected JSON structure
                    const data = JSON.parse(event.data);
                    if (data && data.type === 'submit') {
                        console.log('Formio Inline Msg (Web):', event.data);
                    }
                } catch (e) {
                    // Ignore parsing errors for other unrelated postMessages
                }
            };
            window.addEventListener('message', handleMessage);
            return () => window.removeEventListener('message', handleMessage);
        }
    }, []);

    if (!html) return <ActivityIndicator />;

    return (
        <View style={styles.container}>
            {Platform.OS === 'web' ? (
                <View style={{ flex: 1 }}>
                    <iframe
                        srcDoc={html}
                        style={{ width: '100%', height: '100%', border: 'none' }}
                    />
                </View>
            ) : (
                <WebView
                    ref={webViewRef}
                    source={{ html, baseUrl: 'https://app.form.io/' }}
                    style={styles.webview}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    originWhitelist={['*']}
                    scalesPageToFit={false}
                    scrollEnabled={true}
                    onMessage={(event) => {
                        console.log('Formio Inline Msg:', event.nativeEvent.data);
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        marginTop: 16,
    },
    webview: {
        flex: 1,
        backgroundColor: 'transparent',
    }
});
