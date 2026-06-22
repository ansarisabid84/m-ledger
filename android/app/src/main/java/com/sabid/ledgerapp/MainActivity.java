package com.sabid.ledgerapp;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Opt into edge-to-edge so the WebView fills the full screen including
        // status bar and navigation bar areas. Safe-area insets are handled in CSS
        // via env(safe-area-inset-*). Required for SDK 35 (Android 15).
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    }
}
