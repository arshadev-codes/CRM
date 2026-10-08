/*
 * Copyright 2020 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package com.electrosoft.work;

import android.Manifest;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;

import com.google.firebase.messaging.FirebaseMessaging;

/**
 * Opens the site full screen. First it asks for notification permission (Android 13+) and gets
 * this phone's Firebase token, which it hands to the site as "#app_token=...".
 */
public class LauncherActivity
        extends com.google.androidbrowserhelper.trusted.LauncherActivity {

    private static final int ASK_NOTIFICATIONS = 7;
    // Open the site anyway if Firebase is slow (no Google Play services, no internet).
    private static final long TOKEN_WAIT_MS = 4000;

    private boolean launched;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Setting an orientation crashes the app due to the transparent background on Android 8.0
        // Oreo and below. We only set the orientation on Oreo and above. This only affects the
        // splash screen and Chrome will still respect the orientation.
        // See https://github.com/GoogleChromeLabs/bubblewrap/issues/496 for details.
        if (Build.VERSION.SDK_INT > Build.VERSION_CODES.O) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_USER_PORTRAIT);
        } else {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        }
        if (isFinishing()) return;

        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[] {Manifest.permission.POST_NOTIFICATIONS}, ASK_NOTIFICATIONS);
        } else {
            fetchTokenThenLaunch();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode == ASK_NOTIFICATIONS) fetchTokenThenLaunch();
    }

    @Override
    protected boolean shouldLaunchImmediately() {
        return false;
    }

    private void fetchTokenThenLaunch() {
        new Handler(Looper.getMainLooper()).postDelayed(this::launchOnce, TOKEN_WAIT_MS);
        try {
            FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
                if (task.isSuccessful() && task.getResult() != null) {
                    PushService.saveToken(this, task.getResult());
                }
                launchOnce();
            });
        } catch (RuntimeException e) {
            launchOnce();
        }
    }

    private void launchOnce() {
        if (launched || isFinishing()) return;
        launched = true;
        launchTwa();
    }

    @Override
    protected Uri getLaunchingUrl() {
        Uri uri = super.getLaunchingUrl();

        // Tapped a notification: open the page it is about.
        String link = getIntent().getStringExtra("link");
        if (link != null && link.startsWith("/")) {
            uri = Uri.parse(uri.getScheme() + "://" + uri.getAuthority() + link);
        }

        String token = PushService.savedToken(this);
        if (token != null) {
            uri = uri.buildUpon().fragment("app_token=" + token).build();
        }
        return uri;
    }
}
