import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_access_token';

interface Props {
    formioConfig: string | object;
    formData?: any;
}

export default function FormioInlineWebView({ formioConfig, formData }: Props) {
    const webViewRef = useRef<WebView>(null);
    const [html, setHtml] = useState('');

    useEffect(() => {
        const loadHtml = async () => {
            const configJson = typeof formioConfig === 'string' ? formioConfig : JSON.stringify(formioConfig);
            const token = await SecureStore.getItemAsync(TOKEN_KEY) || '';

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
                            
                            Formio.createForm(document.getElementById('formio'), config).then(function(form) {
                                if (initialData) {
                                    form.submission = {
                                        data: initialData
                                    };
                                }
                                form.on('submit', function(submission) {
                                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'submit', data: submission }));
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

    if (!html) return <ActivityIndicator />;

    return (
        <View style={styles.container}>
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
