package com.electrosoft.work;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;

public class Application extends android.app.Application {

  // Notifications about new work, drawings and material (see PushService).
  static final String CHANNEL_ID = "work";

  @Override
  public void onCreate() {
      super.onCreate();
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          NotificationChannel channel = new NotificationChannel(
                  CHANNEL_ID, "Work updates", NotificationManager.IMPORTANCE_HIGH);
          channel.setDescription("New panels, drawings and material");
          getSystemService(NotificationManager.class).createNotificationChannel(channel);
      }
  }
}
