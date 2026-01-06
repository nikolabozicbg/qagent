/**
 * Native Desktop Notification Service
 * Handles sending OS-level notifications through Electron
 */

type NotificationOptions = {
  title: string;
  body: string;
  silent?: boolean;
  urgency?: 'normal' | 'critical' | 'low';
};

class NotificationService {
  private isSupported: boolean;

  constructor() {
    this.isSupported = 'Notification' in window && window.electronAPI !== undefined;
  }

  /**
   * Request notification permission from the user
   */
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('Notifications are not supported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }

  /**
   * Check if notifications are enabled
   */
  isEnabled(): boolean {
    if (!this.isSupported) return false;
    return Notification.permission === 'granted';
  }

  /**
   * Send a desktop notification
   */
  async send(options: NotificationOptions): Promise<void> {
    if (!this.isSupported) {
      console.warn('Notifications are not supported');
      return;
    }

    // Auto-request permission if not already granted
    if (Notification.permission === 'default') {
      const granted = await this.requestPermission();
      if (!granted) {
        console.warn('Notification permission denied');
        return;
      }
    }

    if (Notification.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: '/icon.png', // You can add your app icon here
        silent: options.silent ?? false,
        tag: 'qagent-notification',
      });

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      return new Promise<void>((resolve) => {
        notification.onclick = () => {
          // Focus the window when notification is clicked
          if (window.electronAPI) {
            window.focus();
          }
          notification.close();
          resolve();
        };

        notification.onclose = () => {
          resolve();
        };

        notification.onerror = (error) => {
          console.error('Notification error:', error);
          resolve();
        };
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  /**
   * Convenience methods for common notification types
   */
  async success(title: string, body: string): Promise<void> {
    return this.send({ title: `✓ ${title}`, body });
  }

  async error(title: string, body: string): Promise<void> {
    return this.send({ 
      title: `✗ ${title}`, 
      body,
      urgency: 'critical' 
    });
  }

  async warning(title: string, body: string): Promise<void> {
    return this.send({ 
      title: `⚠ ${title}`, 
      body 
    });
  }

  async info(title: string, body: string): Promise<void> {
    return this.send({ 
      title: `ℹ ${title}`, 
      body,
      silent: true 
    });
  }

  /**
   * Test notification progress (for test runs)
   */
  async testProgress(passed: number, failed: number, total: number): Promise<void> {
    const status = failed > 0 ? '⚠' : '✓';
    return this.send({
      title: `${status} Test Progress`,
      body: `${passed} passed, ${failed} failed (${total} total)`,
    });
  }

  /**
   * Test run complete notification
   */
  async testComplete(passed: number, failed: number, duration: number): Promise<void> {
    const status = failed > 0 ? 'Tests Failed' : 'All Tests Passed';
    const icon = failed > 0 ? '✗' : '✓';
    return this.send({
      title: `${icon} ${status}`,
      body: `${passed} passed, ${failed} failed in ${duration}s`,
      urgency: failed > 0 ? 'critical' : 'normal',
    });
  }

  /**
   * Test generation complete notification
   */
  async testGenerated(fileName: string): Promise<void> {
    return this.send({
      title: '✓ Test Generated',
      body: `Successfully generated ${fileName}`,
    });
  }
}

export const notificationService = new NotificationService();
