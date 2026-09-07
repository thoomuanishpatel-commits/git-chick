package com.resqai.app;

import android.view.KeyEvent;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private int volumeUpClickCount = 0;
    private long lastVolumeUpClickTime = 0;

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_VOLUME_UP) {
            long currentTime = System.currentTimeMillis();
            // Check if click was within 1.5 seconds of the last click
            if (currentTime - lastVolumeUpClickTime < 1500) {
                volumeUpClickCount++;
            } else {
                volumeUpClickCount = 1;
            }
            lastVolumeUpClickTime = currentTime;

            if (volumeUpClickCount >= 3) {
                volumeUpClickCount = 0; // reset counter
                this.runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        if (getBridge() != null && getBridge().getWebView() != null) {
                            getBridge().getWebView().evaluateJavascript(
                                "window.dispatchEvent(new CustomEvent('volumeUpPanicTriggered'));", 
                                null
                            );
                        }
                    }
                });
                return true; // Intercept event to prevent volume bar pop-up
            }
        }
        return super.onKeyDown(keyCode, event);
    }
}
